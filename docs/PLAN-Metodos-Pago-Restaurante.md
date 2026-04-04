# Plan de Implementación — Métodos de Pago por Restaurante

## Resumen

Cada restaurante debe poder configurar qué métodos de pago acepta (**efectivo** y/o **link de cobro de Mercado Pago**).  
El campo es **obligatorio** y por defecto siempre se acepta efectivo.  
Cuando el cliente elige pagar por Mercado Pago, el pedido se crea con un estado especial de espera de confirmación de pago y se le indica explícitamente el identificador del pedido que debe incluir en el comprobante.

---

## 1. Cambios en Base de Datos

### 1.1 Tabla `businesses`

Agregar dos columnas:

```sql
ALTER TABLE businesses
  ADD COLUMN accepted_payment_methods text[]
    NOT NULL DEFAULT ARRAY['cash'],
  ADD COLUMN mercado_pago_link text;

-- Restricción: al menos un método debe estar presente
ALTER TABLE businesses
  ADD CONSTRAINT businesses_payment_methods_not_empty
    CHECK (cardinality(accepted_payment_methods) > 0);

-- Restricción: solo valores válidos
ALTER TABLE businesses
  ADD CONSTRAINT businesses_payment_methods_valid
    CHECK (accepted_payment_methods <@ ARRAY['cash', 'mercado_pago']);
```

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `accepted_payment_methods` | `text[]` | NO | `{cash}` | Métodos que acepta el restaurante |
| `mercado_pago_link` | `text` | SÍ | NULL | URL del link de cobro de MP |

**Regla de negocio:** Si `'mercado_pago'` está en el array, `mercado_pago_link` debe ser no nulo.  
Esta validación se hace en la capa de aplicación (frontend) dado que PostgreSQL no puede hacer CHECK entre columnas de forma sencilla con arrays.

---

### 1.2 Tabla `orders` — Nuevo estado

La columna `status` ya existe. Se necesita agregar el valor `'awaiting_payment'`:

```
pending → awaiting_payment → confirmed → preparing → ready → completed
                                                             ↘
                ↓ (si el restaurante rechaza el comprobante)
             cancelled
```

| Valor | Descripción |
|-------|-------------|
| `pending` | Pedido recibido, pago en efectivo — flujo normal |
| `awaiting_payment` | Pedido recibido, esperando confirmación de pago por Mercado Pago |
| `confirmed` | Restaurante confirmó el pedido (y el pago si aplica) |
| `preparing` | En cocina |
| `ready` | Listo para recoger/entregar |
| `completed` | Entregado |
| `cancelled` | Cancelado |

La columna `payment_method` en `orders` ya existe. Los valores a usar:

| Valor | Significado |
|-------|-------------|
| `'cash'` | Efectivo (comportamiento actual) |
| `'mercado_pago'` | Link de cobro de Mercado Pago |

---

## 2. Vista de Configuración del Restaurante

**Archivo:** `src/presentation/pages/settings/BusinessInfo.tsx`

### 2.1 Leer los datos actuales al montar

```typescript
// Agregar al fetch actual del businessInfo:
const { accepted_payment_methods, mercado_pago_link } = businessData;
```

### 2.2 Estado local del formulario

```typescript
const [paymentMethods, setPaymentMethods] = useState<string[]>(
  businessInfo?.accepted_payment_methods ?? ['cash']
);
const [mercadoPagoLink, setMercadoPagoLink] = useState(
  businessInfo?.mercado_pago_link ?? ''
);
```

### 2.3 Validación antes de guardar

```typescript
// Reglas:
// 1. Al menos un método seleccionado
if (paymentMethods.length === 0) {
  setError('Debes aceptar al menos un método de pago.');
  return;
}
// 2. Si mercado_pago está activo, el link es obligatorio
if (paymentMethods.includes('mercado_pago') && !mercadoPagoLink.trim()) {
  setError('Debes ingresar el link de cobro de Mercado Pago.');
  return;
}
// 3. Limpiar el link si se desmarca mercado pago
const linkToSave = paymentMethods.includes('mercado_pago')
  ? mercadoPagoLink.trim()
  : null;
```

### 2.4 UI propuesta

```
─────────────────────────────────────────────
Métodos de pago aceptados  *
─────────────────────────────────────────────
[✓] Efectivo
[✓] Transferencia / Link de Mercado Pago

  ┌─────────────────────────────────────────┐
  │ https://mpago.la/...                    │
  └─────────────────────────────────────────┘
  Pega aquí el link de cobro que te provee
  Mercado Pago en tu cuenta.
─────────────────────────────────────────────
```

- Los checkboxes son independientes; ninguno puede ser el único desmarcado (efectivo siempre viene activo por defecto pero puede desmarcarse si hay otro activo).
- El input del link **solo es visible** cuando el checkbox de Mercado Pago está activo.
- El input acepta solo URLs que comiencen con `https://mpago.la/` o `https://link.mercadopago.com.mx/` (validación con regex en el cliente).

### 2.5 Guardado — función `updatePaymentSettings` en `businessService.ts`

```typescript
export async function updatePaymentSettings(
  businessId: string,
  acceptedMethods: string[],
  mercadoPagoLink: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('businesses')
    .update({
      accepted_payment_methods: acceptedMethods,
      mercado_pago_link: mercadoPagoLink,
      updated_at: new Date().toISOString(),
    })
    .eq('id', businessId);

  if (error) throw error;
}
```

---

## 3. Flujo del Cliente (Cart / Checkout)

**Archivos:** `src/presentation/pages/Cart.tsx` y `src/presentation/logic/CartLogic.ts`

### 3.1 Traer los métodos de pago del restaurante

Al cargar el carrito se tienen los `business_id` de los artículos. Hacer un fetch de los métodos aceptados por cada restaurante:

```typescript
// En CartLogic o Cart.tsx al inicializar:
const { data } = await supabase
  .from('businesses')
  .select('id, accepted_payment_methods, mercado_pago_link')
  .in('id', uniqueBusinessIds);

// Almacenar en estado indexado por business_id:
// Map<string, { methods: string[], mpLink: string | null }>
```

Si el carrito tiene productos de múltiples restaurantes, cada grupo de restaurante puede tener métodos distintos — mostrar el selector por restaurante.

### 3.2 Selector de método de pago en la UI

Para cada restaurante en el resumen del carrito:

```
─────────────────────────────────────
Restaurante "El Buen Sabor"
─────────────────────────────────────
Método de pago:
  (●) Efectivo
  ( ) Pagar por Mercado Pago
─────────────────────────────────────
```

Si el restaurante solo acepta uno de los dos métodos, no se muestra el selector (o aparece deshabilitado el que no aplica).

### 3.3 Comportamiento al elegir Mercado Pago

Cuando el cliente selecciona Mercado Pago para un restaurante:

1. Se muestra un aviso informativo **antes** de confirmar el pedido:

```
┌─────────────────────────────────────────────────────┐
│  💳 Pago por Mercado Pago                           │
│                                                     │
│  Al confirmar, tu pedido quedará en espera de       │
│  confirmación de pago. A continuación:              │
│                                                     │
│  1. Abre el link de pago del restaurante.           │
│  2. Realiza la transferencia por el monto exacto.   │
│  3. En el campo "Asunto" / "Referencia" escribe     │
│     el ID de tu pedido (te lo mostraremos al        │
│     confirmar).                                     │
│                                                     │
│  El restaurante verificará tu pago y confirmará     │
│  la orden.                                          │
└─────────────────────────────────────────────────────┘
```

2. Al pulsar "Confirmar pedido":
   - Se llama `create_order_with_items` con:
     - `p_payment_method: 'mercado_pago'`
     - `p_status: 'awaiting_payment'`  ← estado especial (ver sección 1.2)
   - Actualmente `CartLogic.ts:154` tiene `paymentMethod: 'cash'` hardcodeado → **cambiar a la selección del usuario**.

### 3.4 Pantalla de confirmación post-pedido (Mercado Pago)

Tras crear el pedido, navegar a una pantalla/modal de éxito que muestre:

```
┌─────────────────────────────────────────────────────┐
│  ✅ ¡Pedido recibido!                               │
│                                                     │
│  Tu pedido está esperando confirmación de pago.     │
│                                                     │
│  ID de tu pedido:                                   │
│  ┌───────────────────────────────────────────────┐  │
│  │  ORD-a1b2c3d4  [📋 Copiar]                   │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Incluye este ID en el asunto de tu pago para que   │
│  el restaurante pueda identificarlo.                │
│                                                     │
│  [  Ir a pagar en Mercado Pago  →  ]                │
│                                                     │
│  [  Ver mis pedidos  ]                              │
└─────────────────────────────────────────────────────┘
```

- El botón "Ir a pagar" abre el `mercado_pago_link` del restaurante en una nueva pestaña.
- El ID mostrado al cliente es un **ID corto legible** (p.ej. los primeros 8 caracteres del UUID en mayúsculas: `A1B2C3D4`). Este mismo ID corto debe almacenarse o derivarse de forma consistente — se puede guardar en una columna `short_id` generada en la BD o simplemente usar `UPPER(SUBSTRING(id::text, 1, 8))` siempre que se muestre.

### 3.5 Pantalla de Actividad del cliente

En `Activity.tsx`, los pedidos con `status = 'awaiting_payment'` deben mostrar una etiqueta y un mensaje especial:

```
┌─────────────────────────────────────────────────────┐
│  Restaurante "El Buen Sabor"          ⏳            │
│  hace 5 minutos                                     │
│  Tacos de bistec, Agua de Jamaica                   │
│  ─────────────────────────────────────────────────  │
│  Pendiente de confirmación de pago     $185.00      │
│                                                     │
│  ¿Ya pagaste? Recuerda incluir el ID               │
│  A1B2C3D4 en el asunto del pago.                    │
│  [ Ir a pagar →  ]                                  │
└─────────────────────────────────────────────────────┘
```

- Añadir `'awaiting_payment'` a `getStatusConfig()` en `Activity.tsx`:
  ```typescript
  case 'awaiting_payment':
    return { color: 'text-blue-500', Icon: Clock, label: 'Pendiente de confirmación de pago' };
  ```
- También agregar al filtro de estado del selector desplegable.

---

## 4. Vista de Pedidos del Restaurante

**Archivo:** `src/presentation/pages/restaurantUI/Orders.tsx`

### 4.1 Nuevo estado visible en la lista

Los pedidos con `status = 'awaiting_payment'` deben aparecer en una sección diferenciada o con badge de alerta:

```
┌─────────────────────────────────────────────────────┐
│  ⚠️  Esperando confirmación de pago                 │
│                                                     │
│  Mesa / Pedido: A1B2C3D4                            │
│  Cliente: Juan Pérez                                │
│  Método de pago: Mercado Pago                       │
│  Monto esperado: $185.00                            │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  📋 Cómo verificar el pago:                        │
│  1. Abre tu cuenta de Mercado Pago.                 │
│  2. Busca un pago reciente de $185.00.              │
│  3. Verifica que el asunto sea "A1B2C3D4".         │
│                                                     │
│  [ ✅ Confirmar pago recibido ]  [ ❌ Rechazar ]   │
└─────────────────────────────────────────────────────┘
```

### 4.2 Acciones disponibles para el restaurante

| Acción | Transición de estado | Descripción |
|--------|---------------------|-------------|
| "Confirmar pago recibido" | `awaiting_payment → confirmed` | El restaurante verificó el pago en MP |
| "Rechazar / no recibí pago" | `awaiting_payment → cancelled` | No se recibió el pago o el asunto no coincide |

Estas acciones usan la función existente `updateOrderStatus()` de `orderService.ts`.

### 4.3 Mostrar ID corto de forma prominente

En la vista de detalles del pedido (modal/sheet actual), el ID del pedido debe aparecer de forma destacada cuando `payment_method = 'mercado_pago'`:

```typescript
// Derivar ID corto del UUID:
const shortId = order.id.replace(/-/g, '').substring(0, 8).toUpperCase();
```

Este `shortId` es el mismo que se mostró al cliente para que lo ponga en el asunto.

### 4.4 Filtro de estado en Orders.tsx

Agregar `'awaiting_payment'` a los filtros de estado existentes en la pantalla de pedidos del restaurante.

---

## 5. Cambios en CartLogic / CheckoutService

**Archivo:** `src/presentation/logic/CartLogic.ts`

### 5.1 Interfaz de checkout

```typescript
// Agregar a CheckoutData o a CartOrder:
interface RestaurantPaymentSelection {
  businessId: string;
  paymentMethod: 'cash' | 'mercado_pago';
}
```

### 5.2 Parámetro de estado inicial del pedido

En `createRestaurantOrder()` de `checkoutService.ts`, el estado inicial varía según el método:

```typescript
const initialStatus = checkoutData.paymentMethod === 'mercado_pago'
  ? 'awaiting_payment'
  : 'pending';
```

Pasar `p_status` al RPC `create_order_with_items` si el procedimiento lo acepta, o actualizar el procedimiento para recibirlo. Alternativamente, hacer un `UPDATE` inmediato después de crear el pedido si el RPC no acepta estado inicial.

---

## 6. Resumen de Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/` | Agregar columnas `accepted_payment_methods`, `mercado_pago_link` a `businesses` |
| `src/core/supabase/types.ts` | Regenerar o actualizar tipos para las nuevas columnas |
| `src/core/services/businessService.ts` | Agregar `updatePaymentSettings()` y `getBusinessPaymentInfo()` |
| `src/core/services/orderService.ts` | Agregar `'awaiting_payment'` al tipo `OrderStatus` |
| `src/presentation/pages/settings/BusinessInfo.tsx` | UI de selección de métodos de pago + input de link MP |
| `src/presentation/logic/CartLogic.ts` | Leer métodos por restaurante, pasar `paymentMethod` seleccionado |
| `src/presentation/pages/Cart.tsx` | Selector de método de pago por restaurante, pantalla post-pedido con ID y link |
| `src/presentation/pages/Activity.tsx` | Badge y mensaje especial para `awaiting_payment`, link a MP |
| `src/presentation/pages/restaurantUI/Orders.tsx` | Sección destacada para `awaiting_payment`, instrucciones de verificación, acciones confirmar/rechazar |
| `src/presentation/components/common/ProductModal/ProductModal.tsx` | Sin cambios requeridos |

---

## 7. Consideraciones de Seguridad y UX

- **El link de Mercado Pago es público** (el cliente lo recibe para pagar). No contiene claves secretas, solo es la URL de cobro.
- **No se valida el pago automáticamente** — es un flujo manual de confianza. El restaurante es responsable de verificar en su cuenta de MP antes de confirmar.
- **Tiempo de espera:** Si el restaurante no confirma en X minutos, el cliente puede ver el pedido en estado `awaiting_payment` indefinidamente. Se puede agregar una nota de "el restaurante confirmará en los próximos minutos" pero no hay timeout automático en esta fase.
- **Evitar doble pago:** Una vez que el restaurante confirma (`awaiting_payment → confirmed`), el pedido entra al flujo normal. No hay reembolso automático si el cliente pagó y el restaurante cancela — eso queda fuera del scope de esta implementación.
