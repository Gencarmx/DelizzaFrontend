# DIAGNÓSTICO — Bug: Notificaciones al Restaurante No Llegan al Crear una Orden

> **Fecha de análisis:** 2026-04-10  
> **Reportado en:** Producción  
> **Analizado por:** Antigravity AI  
> **Estado:** Pendiente de corrección  

---

## 1. Descripción del Bug

Cuando un cliente realiza una orden, el restaurante **no recibe ninguna notificación**, ni en la aplicación ni como push notification al dispositivo del dueño. Sin embargo, cuando el restaurante **modifica el estado de la orden**, la notificación al cliente llega correctamente.

Este comportamiento asimétrico (cliente → restaurante falla, restaurante → cliente funciona) indica que el problema no es sistémico sino específico del flujo de notificación en dirección cliente → restaurante.

---

## 2. Arquitectura del Sistema de Notificaciones

El sistema implementa **dos mecanismos en paralelo** para notificar al restaurante:

```
CLIENTE HACE ORDEN
      │
      ├─── [1] BROADCAST (Supabase Realtime)
      │         checkoutService.ts → notifyRestaurant()
      │         Canal: restaurant_orders_{businessId}
      │         Receptor: useRealtimeNotifications (restaurante con app abierta)
      │
      └─── [2] WEB PUSH NOTIFICATION (Edge Function)
                checkoutService.ts → supabase.functions.invoke('send-push-notification')
                Target: ownerUserId → push_subscriptions → FCM/APNS
                Funciona aunque la app esté cerrada
```

```
RESTAURANTE MODIFICA ORDEN
      │
      ├─── [1] BROADCAST (Supabase Realtime)
      │         orderService.ts → updateOrderStatus()
      │         Canal: customer_orders_{customerId}
      │         Receptor: useClientNotifications (cliente con app abierta)
      │
      └─── [2] WEB PUSH NOTIFICATION (Edge Function)
                orderService.ts → supabase.functions.invoke('send-push-notification')
                Target: customer profile.user_id → push_subscriptions → FCM/APNS
```

El path restaurante → cliente **funciona correctamente**, lo que valida que la infraestructura base (Edge Function, Service Worker, `push_subscriptions`) está operativa.

---

## 3. Archivos Involucrados

| Archivo | Rol |
|---------|-----|
| `src/core/services/checkoutService.ts` | Crea la orden y dispara las notificaciones al restaurante |
| `src/core/services/orderService.ts` | Actualiza estado y dispara notificaciones al cliente |
| `src/core/services/pushNotificationService.ts` | Gestión de suscripciones Web Push |
| `src/presentation/logic/useRealtimeNotifications.ts` | Hook del restaurante para escuchar Broadcast |
| `src/core/context/RestaurantNotificationsContext.tsx` | Contexto global de notificaciones del restaurante (owner) |
| `src/sw.ts` | Service Worker: recibe y muestra push notifications |

---

## 4. Problemas Identificados

### ❌ Problema 1 — Race Condition en Broadcast: Canal Efímero Destruido Antes de Entregar el Mensaje

**Probabilidad: MUY ALTA**  
**Afecta: Solo notificación en-app (app abierta)**

#### Descripción técnica

En `checkoutService.ts` → `notifyRestaurant()` (líneas 301–343), el cliente crea un canal **temporal** para emitir el broadcast, lo usa exactamente una vez y luego lo destruye:

```typescript
// checkoutService.ts — notifyRestaurant()
const channel = supabase.channel(`restaurant_orders_${orderData.business_id}`, {
  config: { broadcast: { ack: true } },
});

channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    clearTimeout(safetyTimer);
    const resp = await channel.send({ type: 'broadcast', event: 'new_order', payload: {...} });
    // ← Canal destruido inmediatamente después de enviar
    await supabase.removeChannel(channel);
  }
});
```

El receptor en el restaurante escucha en el canal persistente `restaurant_orders_${businessId}`:

```typescript
// useRealtimeNotifications.ts — línea 138
const subscription = supabase
  .channel(`restaurant_orders_${businessId}`, {
    config: { broadcast: { self: true } },
  })
  .on('broadcast', { event: 'new_order' }, ({ payload }) => {
    handleNewOrder(payload as OrderNotification);
  })
  .subscribe(...);
```

#### Por qué falla

**Supabase Broadcast no tiene persistencia de mensajes.** Si el receptor no está activamente suscrito en el servidor de Supabase en el exacto momento en que el mensaje es emitido, el mensaje **se descarta permanentemente**. El canal del restaurante puede estar:

- En proceso de reconexión (el servidor Supabase reinició el WebSocket)
- Aún no inicializado (el restaurante acaba de abrir la app)
- Temporalmente desconectado por un corte de red de milisegundos

El canal del cliente es efímero y de corta vida; el servidor retransmite el broadcast a todos los suscriptores activos en ese canal en ese momento. Si ninguno está activo, el mensaje desaparece.

#### Comparación con el path inverso (funciona)

En `orderService.ts`, el restaurante también crea un canal temporal para notificar al cliente. Funciona porque el cliente típicamente **sí** tiene la app abierta y su WebSocket está estable (está esperando el estado de su orden). El restaurante tiene menos incentivo a mantener la app abierta, y su WebSocket puede tener más interrupciones.

---

### ❌ Problema 2 — Configuración Incompatible entre Emisor y Receptor del Broadcast

**Probabilidad: ALTA**  
**Afecta: Solo notificación en-app (app abierta)**

#### Descripción técnica

| Lado | `config.broadcast` en uso |
|------|--------------------------|
| **Emisor** (cliente en `checkoutService.ts`) | `{ ack: true }` |
| **Receptor** (restaurante en `useRealtimeNotifications.ts`) | `{ self: true }` |

`ack: true` en el emisor activa la confirmación de entrega del lado del servidor. `self: true` en el receptor hace que un canal retransmita sus propios mensajes a sí mismo (útil para debug en un mismo cliente). Estos no son flags complementarios.

El receptor **no necesita `self: true`** para recibir mensajes de otro cliente. Y la presencia de `self: true` puede interferir con el matching del canal en Supabase si el servidor trata al canal con configuraciones distintas como instancias diferentes.

Para el path inverso que funciona (`orderService.ts`):
```typescript
// emisor del restaurante — orderService.ts línea 232
config: { broadcast: { ack: true } }
```

El receptor del cliente (en su hook de notificaciones) usa la configuración que sea que tenga. La asimetría de config no existe ahí de la misma forma.

---

### ❌ Problema 3 — Join `profiles!inner` Puede Retornar `null` Silenciosamente

**Probabilidad: ALTA**  
**Afecta: Web Push al restaurante (app cerrada)**

#### Descripción técnica

```typescript
// checkoutService.ts — líneas 220-228
const { data: business } = await supabase
  .from('businesses')
  .select('profiles!inner(user_id)')   // ← join FK implícita
  .eq('id', order.restaurant.id)
  .maybeSingle();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ownerUserId = (business as any)?.profiles?.user_id as string | undefined;

if (ownerUserId) {    // ← Si es undefined, la push NUNCA se envía
  await supabase.functions.invoke('send-push-notification', {...});
}
```

El join `profiles!inner(user_id)` asume que Supabase puede resolver la relación `businesses → profiles` automáticamente por FK. Supabase resuelve relaciones por FK **solo si están declaradas explícitamente** en el esquema de la base de datos como Foreign Key Constraint.

Si la FK es `businesses.owner_id → profiles.id`, Supabase debería alias la relación como `profiles`. Sin embargo, si:

1. La FK no está declarada en PostgreSQL (solo existe lógicamente en el código)
2. El nombre de la relación no coincide con lo que Supabase infiere
3. El `owner_id` del negocio es `null` (negocio sin dueño asignado)

...entonces `business?.profiles` será `null` o `undefined`, `ownerUserId` quedará como `undefined`, y el `if (ownerUserId)` **no entra nunca**.

#### El peor atenuante: el `catch {}` completamente vacío

```typescript
} catch {
  // No interrumpir el flujo del pedido si falla la push
}
```

No hay absolutamente ningún log. Si el join falla con un error de Supabase, si la Edge Function retorna un error HTTP, o si `ownerUserId` es `undefined`, **nada queda registrado**. Imposible diagnosticar desde los logs del cliente.

#### Comparación con el path inverso (funciona)

```typescript
// orderService.ts — líneas 272-276
const { data: profile } = await supabase
  .from('profiles')
  .select('user_id')
  .eq('id', updatedOrder.customer_id)  // ← query directa, sin join implícito
  .maybeSingle();
```

El path restaurante → cliente hace una **consulta directa** sin joins implícitos, usando el `customer_id` que ya está en el objeto `updatedOrder`. **Esta diferencia es clave** y explica por qué uno funciona y el otro no.

---

### ⚠️ Problema 4 — `businessId` Puede No Estar Resuelto Cuando Llega el Broadcast

**Probabilidad: MEDIA**  
**Afecta: Notificación en-app (app abierta), escenario de carga inicial**

#### Descripción técnica

En `RestaurantNotificationsContext.tsx`, el `businessId` se resuelve de forma asíncrona consultando `getBusinessByOwner(profileId)`:

```typescript
// RestaurantNotificationsContext.tsx — líneas 67-76
getBusinessByOwner(profileId)
  .then(business => {
    setBusinessIdState(business?.id ?? null);
  })
  ...
  .finally(() => {
    setBusinessIdLoading(false);
  });
```

Mientras `businessId` es `null`, el hook `useRealtimeNotifications` tiene un guard que impide crear el canal:

```typescript
// useRealtimeNotifications.ts — línea 113
if (!isAuthReady || !businessId) return;  // ← no hay canal todavía
```

**Ventana de vulnerabilidad:** Si el cliente hace la orden en los primeros segundos después de que el restaurante abre la app (mientras `businessId` aún es `null`), el canal del restaurante no existe en ese momento y el broadcast se pierde.

Esta es también la razón por la que el bug puede ser **intermitente**: depende del timing entre cuando el restaurante abrió la app y cuando llegó la orden.

---

### ⚠️ Problema 5 — Suscripción Push del Dueño Inexistente o Expirada

**Probabilidad: MEDIA**  
**Afecta: Web Push (app cerrada)**

#### Descripción técnica

La función `enablePushNotifications()` en `pushNotificationService.ts` registra la suscripción push en la tabla `push_subscriptions`. Esta función **solo se llama cuando el usuario acepta el banner de permisos** en la UI.

La suscripción puede no existir si:

1. **El dueño nunca aceptó las notificaciones push** en su dispositivo
2. **Limpió el caché del browser** (invalida la suscripción del Service Worker local)
3. **Cambió de dispositivo o browser** (cada dispositivo/browser tiene su propia suscripción)
4. **La suscripción FCM/APNS expiró** (Google y Apple rotan las suscripciones periódicamente; el servidor debe manejar el `410 Gone` y eliminar la suscripción obsoleta)
5. **El Service Worker fue actualizado** y la suscripción anterior quedó huérfana

Si `push_subscriptions` no tiene un registro para el `user_id` del dueño, la Edge Function `send-push-notification` no tiene endpoint al cual enviar y simplemente no envía nada.

---

### ⚠️ Problema 6 — Safety Timeout de 8 Segundos Puede Abortar el Canal del Emisor

**Probabilidad: BAJA**  
**Afecta: Notificación en-app (app abierta), solo en redes lentas**

#### Descripción técnica

```typescript
// checkoutService.ts — línea 309-312
const safetyTimer = setTimeout(async () => {
  console.warn('[notifyRestaurant] Timeout esperando SUBSCRIBED — limpiando canal');
  try { await supabase.removeChannel(channel); } catch { /* ignorar */ }
}, CHANNEL_TIMEOUT_MS); // 8000ms
```

Si la red del cliente al momento de crear la orden tiene alta latencia (>8s para hacer el handshake WebSocket con Supabase), el `safetyTimer` destruye el canal antes de que alcance el estado `SUBSCRIBED`. El broadcast nunca se envía.

Este escenario es poco común pero posible en conexiones móviles degradadas.

---

## 5. Tabla de Prioridad

| # | Problema | Probabilidad | Mecanismo afectado | Impacto |
|---|----------|:---:|---|:---:|
| 1 | Race condition: canal efímero, mensaje sin receptor activo | 🔴 Muy alta | Broadcast (in-app) | Total |
| 2 | Config incompatible: `ack: true` vs `self: true` | 🔴 Alta | Broadcast (in-app) | Intermitente |
| 3 | Join `profiles!inner` retorna null + `catch {}` vacío | 🔴 Alta | **Web Push (app cerrada)** | Total |
| 4 | `businessId` no resuelto durante carga inicial | 🟡 Media | Broadcast (in-app) | Intermitente |
| 5 | Suscripción push inexistente o expirada | 🟡 Media | **Web Push (app cerrada)** | Total |
| 6 | Timeout 8s insuficiente en redes lentas | 🟢 Baja | Broadcast (in-app) | Esporádico |

---

## 6. Cómo Diagnosticar Rápidamente

### Paso 1 — Verificar si la Edge Function es invocada

Ir a **Supabase Dashboard → Edge Functions → `send-push-notification` → Logs**.

Hacer una orden de prueba y observar:

- **Si NO aparece ninguna invocación:** El problema está antes de la Edge Function. El join `profiles!inner` está retornando `null` y `ownerUserId` es `undefined`. El `if (ownerUserId)` nunca entra. → **Problema #3**
- **Si aparece la invocación pero con error:** El problema está en la Edge Function o en la suscripción push. → **Problema #5**
- **Si aparece sin error:** La push fue procesada. El problema es solo del Broadcast (app abierta). → **Problemas #1 o #2**

### Paso 2 — Verificar la tabla `push_subscriptions`

```sql
SELECT * FROM push_subscriptions WHERE user_id = '[owner_user_id]';
```

Si está vacía para el dueño del restaurante → **Problema #5** confirmado.

### Paso 3 — Verificar el join de businesses con profiles

```sql
SELECT b.id, b.owner_id, p.user_id
FROM businesses b
LEFT JOIN profiles p ON p.id = b.owner_id
WHERE b.id = '[business_id]';
```

Si `p.user_id` retorna `null` → La FK no está bien configurada o `owner_id` está en null. → **Problema #3** confirmado.

### Paso 4 — Agregar logs temporales en producción

En `checkoutService.ts`, reemplazar el `catch` vacío con:

```typescript
} catch (e) {
  console.warn('[checkout] Push al restaurante falló:', e);
}
```

Y agregar log antes del `if`:

```typescript
console.log('[checkout] ownerUserId resuelto:', ownerUserId, '| business data:', business);
if (ownerUserId) { ... }
```

---

## 7. Soluciones Propuestas

### Solución A — Reemplazar el join implícito por consulta directa (Problema #3)

**Impacto: Fix completo de la Web Push al restaurante**

```typescript
// ANTES (checkoutService.ts)
const { data: business } = await supabase
  .from('businesses')
  .select('profiles!inner(user_id)')
  .eq('id', order.restaurant.id)
  .maybeSingle();
const ownerUserId = (business as any)?.profiles?.user_id;

// DESPUÉS — consulta directa sin join implícito
const { data: business } = await supabase
  .from('businesses')
  .select('owner_id')
  .eq('id', order.restaurant.id)
  .maybeSingle();

let ownerUserId: string | undefined;
if (business?.owner_id) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('id', business.owner_id)
    .maybeSingle();
  ownerUserId = profile?.user_id ?? undefined;
}
```

### Solución B — Agregar `postgres_changes` como fallback en el hook del restaurante (Problema #1)

En lugar de depender únicamente del Broadcast (que no tiene persistencia), agregar un listener de `postgres_changes` que escuche INSERTs en la tabla `orders`:

```typescript
// useRealtimeNotifications.ts — dentro de setupSubscription
const subscription = supabase
  .channel(`restaurant_orders_${businessId}`)
  .on('broadcast', { event: 'new_order' }, ({ payload }) => {
    handleNewOrder(payload as OrderNotification);
  })
  // ← NUEVO: fallback persistente
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'orders',
      filter: `business_id=eq.${businessId}`,
    },
    (payload) => {
      handleNewOrder(payload.new as OrderNotification);
    }
  )
  .subscribe(...);
```

> **Nota:** `postgres_changes` requiere que la tabla tenga RLS configurado de forma que el restaurante pueda leer sus propias órdenes, o usar la clave de servicio en la Edge Function.

### Solución C — Unificar configuración de canales (Problema #2)

Usar configuración consistente en todos los canales:

```typescript
// Emisor (checkoutService.ts)
config: { broadcast: { ack: true } }

// Receptor (useRealtimeNotifications.ts)
config: { broadcast: { ack: false } }  // ← quitar self: true, no es necesario
```

### Solución D — Logs en todos los catches del sistema de notificaciones

Reemplazar todos los `catch { /* silencio */ }` relacionados con notificaciones:

```typescript
// checkoutService.ts — push al restaurante
} catch (e) {
  console.warn('[checkout:push-restaurante] Falló:', JSON.stringify(e));
}

// checkoutService.ts — broadcast al restaurante
} catch (err) {
  console.warn('[checkout:broadcast-restaurante] Falló:', err);
}
```

### Solución E — Aumentar timeout del canal emisor (Problema #6)

```typescript
const CHANNEL_TIMEOUT_MS = 15000; // antes 8000ms
```

---

## 8. Diferencia Clave con el Path que SÍ Funciona

| Aspecto | Restaurante → Cliente ✅ | Cliente → Restaurante ❌ |
|---------|------------------------|-------------------------|
| Obtención del `targetUserId` | Query directa: `profiles.select('user_id').eq('id', customer_id)` | Join implícito: `businesses.select('profiles!inner(user_id)')` |
| Logs en catch | Ninguno (igual de silencioso) | Ninguno |
| Estado del receptor | Cliente con app abierta esperando su orden | Restaurante puede tener app cerrada |
| Estabilidad de la suscripción WS del receptor | Alta (cliente espera activamente) | Variable (restaurante no siempre tiene la app abierta) |

---

## 9. Conclusión

El bug tiene **dos causas independientes** que se suman:

1. **La Web Push no llega** (app cerrada) porque el join `profiles!inner` en `checkoutService.ts` probablemente retorna `null`, haciendo que `ownerUserId` sea `undefined` y la Edge Function nunca sea invocada. Todo falla silenciosamente por el `catch {}` vacío.

2. **El Broadcast no llega** (app abierta) porque el canal del emisor es efímero y el mensaje se descarta si el receptor no está activamente suscrito en el servidor Supabase en ese preciso instante.

La **Solución A** (reemplazar el join implícito por consulta directa) debería resolver el problema de la push notification. La **Solución B** (agregar `postgres_changes`) hace el sistema más robusto para notificaciones in-app. Ambas pueden implementarse de forma independiente.

---

*Documento generado como parte del proceso de análisis de bugs de producción — Delizza Frontend*
