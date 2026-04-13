# Migración de Push Notifications a OneSignal

> **Fecha:** Abril 2026
> **Motivo:** El sistema actual basado en Web Push API + VAPID + Supabase Edge Functions presenta fallos
> recurrentes en producción documentados en `DIAGNOSTICO-Bug-Notificaciones-Restaurante.md`.
> **Objetivo:** Reemplazar la infraestructura de notificaciones propia por OneSignal, un servicio
> gestionado que abstrae la complejidad de APNS / FCM / Web Push y garantiza la entrega.

---

## ¿Por qué OneSignal?

### Problemas del sistema actual

| Problema | Causa raíz | Impacto |
|---|---|---|
| Notificaciones al restaurante no llegan | Join `profiles!inner` retorna `null` + `catch {}` vacío | 🔴 Total |
| Race condition en Broadcast | Canal efímero destruido antes de que el receptor esté activo | 🔴 Muy alto |
| Suscripciones expiradas sin reparación automática | La Edge Function solo limpia 410s, no renueva | 🟡 Medio |
| Sin soporte nativo iOS sin modo standalone | Limitación de Web Push API | 🟡 Medio |
| Diagnóstico imposible | Sin logs estructurados ni dashboard de entregas | 🟡 Medio |

### Ventajas de OneSignal

- ✅ **Entrega garantizada**: gestiona reintentos, expiración y rotación de tokens automáticamente
- ✅ **Cross-platform out of the box**: iOS (incluido sin standalone), Android, Chrome, Firefox, Safari
- ✅ **Dashboard de entregas**: métricas en tiempo real de notificaciones enviadas/recibidas/abiertas
- ✅ **SDK oficial para React**: `react-onesignal` o `@onesignal/web-sdk`
- ✅ **Cero infraestructura de claves VAPID**: OneSignal las gestiona internamente
- ✅ **Segmentación y etiquetas**: enviar notificaciones a grupos específicos de usuarios
- ✅ **Plan gratuito generoso**: hasta 10,000 suscriptores y envíos ilimitados
- ✅ **REST API simple**: un endpoint para enviar a un `external_user_id`

---

## Arquitectura del sistema nuevo

```
[Evento]                    [Entregador]                [Receptor]
──────────────────────────────────────────────────────────────────
Cliente hace pedido    ──➜  Supabase Edge Function  ──➜ App del restaurante
                             onesignal-notify              (cualquier estado ✅)

Owner cambia estado    ──➜  Supabase Edge Function  ──➜ App del cliente
de pedido                    onesignal-notify              (cualquier estado ✅)

+ Lo existente (sin cambio):
Canal Broadcast        ──➜  Supabase Realtime       ──➜ App abierta ✅
```

**Clave del cambio**: Ya no necesitamos gestionar `push_subscriptions`, claves VAPID,
ni `web-push` en la Edge Function. OneSignal se encarga de todo eso internamente.
Solo necesitamos asociar cada usuario autenticado con su `external_user_id` en OneSignal.

---

## PASO 0: Pre-requisitos

### 0.1 Crear cuenta y App en OneSignal

1. Ir a [https://onesignal.com](https://onesignal.com) → **Start for Free**
2. Crear una organización con el nombre de tu proyecto
3. Crear una nueva **App** → nombre: `Delizza`
4. Seleccionar plataforma: **Web**
5. Configurar el sitio:
   - **Site Name**: `Delizza`
   - **Site URL**: `https://tu-dominio-en-vercel.vercel.app` (o tu dominio custom)
   - **Default Icon**: subir `/dlizza-192x192.png`
6. OneSignal genera automáticamente las claves internas. No necesitas hacer nada con VAPID.

### 0.2 Obtener credenciales

En el dashboard de OneSignal → **Settings → Keys & IDs**:

| Credencial | Descripción | Dónde usarla |
|---|---|---|
| **App ID** | Identificador público de tu app | Frontend (`.env`) |
| **REST API Key** | Clave secreta del servidor | Edge Function (Supabase Secret) |

---

## PASO 1: Configurar variables de entorno

### `.env` (local — NO subir a Git)
```env
VITE_ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### `.env.example` (referencia sin valor)
```env
VITE_ONESIGNAL_APP_ID=
```

### Vercel — Dashboard → Settings → Environment Variables
```
VITE_ONESIGNAL_APP_ID = <tu App ID>
```

### Supabase — Edge Function Secret
```bash
supabase secrets set ONESIGNAL_APP_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
supabase secrets set ONESIGNAL_REST_API_KEY="os_v2_app_xxxxx..."
```

> [!IMPORTANT]
> La `ONESIGNAL_REST_API_KEY` es secreta y solo debe vivir en los Edge Functions de Supabase,
> NUNCA en el frontend (no usar prefijo `VITE_`).

---

## PASO 2: Instalar el SDK de OneSignal

```bash
bun add react-onesignal
```

> [!NOTE]
> `react-onesignal` es el SDK oficial de OneSignal para React. Es compatible con Vite + React.
> El paquete `@onesignal/web-sdk` **no existe en npm** — no lo uses.

---

## PASO 3: Configurar OneSignal en el frontend

### 3.1 Crear el servicio de OneSignal

Crear el archivo `src/core/services/oneSignalService.ts`:

```typescript
// src/core/services/oneSignalService.ts

import OneSignal from "react-onesignal";

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID as string;

let initialized = false;

/**
 * Inicializa el SDK de OneSignal. Llamar una sola vez en el arranque de la app.
 * Es idempotente: si ya fue inicializado, no hace nada.
 */
export async function initOneSignal(): Promise<void> {
  if (initialized || !APP_ID) return;
  initialized = true;

  await OneSignal.init({
    appId: APP_ID,
    // No mostrar el prompt automáticamente — lo controlamos desde la UI
    promptOptions: {
      slidedown: {
        prompts: [],
      },
    },
    // Permitir cookies para rastrear suscripciones
    allowLocalhostAsSecureOrigin: import.meta.env.DEV,
    // Ruta del Service Worker de OneSignal (ver Paso 5)
    serviceWorkerPath: "/OneSignalSDKWorker.js",
  });
}

/**
 * Vincula al usuario autenticado de Supabase con su suscripción en OneSignal.
 * Llamar después de que el usuario haga login.
 * @param userId - auth.users.id de Supabase
 */
export async function setOneSignalUser(userId: string): Promise<void> {
  await OneSignal.login(userId);
}

/**
 * Desvincula al usuario al hacer logout.
 */
export async function clearOneSignalUser(): Promise<void> {
  await OneSignal.logout();
}

/**
 * Solicita permiso de notificaciones al usuario.
 * Retorna true si el permiso fue concedido.
 */
export async function requestOneSignalPermission(): Promise<boolean> {
  const permission = await OneSignal.Notifications.requestPermission();
  return permission;
}

/**
 * Verifica si el usuario actual tiene notificaciones activadas.
 */
export function isOneSignalSubscribed(): boolean {
  return OneSignal.User.PushSubscription.optedIn ?? false;
}

/**
 * Obtiene el estado actual del permiso de notificaciones.
 */
export function getNotificationPermission(): NotificationPermission {
  return Notification.permission;
}
```

### 3.2 Crear el hook `useOneSignal`

Crear el archivo `src/core/hooks/useOneSignal.ts`:

```typescript
// src/core/hooks/useOneSignal.ts

import { useState, useEffect, useCallback } from "react";
import {
  requestOneSignalPermission,
  isOneSignalSubscribed,
  getNotificationPermission,
} from "@core/services/oneSignalService";

export type NotificationStatus = "default" | "granted" | "denied" | "unsupported";

export interface UseOneSignalReturn {
  status: NotificationStatus;
  isSubscribed: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
}

export function useOneSignal(): UseOneSignalReturn {
  const isSupported = "Notification" in window;

  const [status, setStatus] = useState<NotificationStatus>(() => {
    if (!isSupported) return "unsupported";
    return Notification.permission as NotificationStatus;
  });

  const [isSubscribed, setIsSubscribed] = useState<boolean>(() => {
    return isSupported ? isOneSignalSubscribed() : false;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sincronizar estado cuando cambia el permiso del sistema
  useEffect(() => {
    if (!isSupported) return;
    setStatus(getNotificationPermission() as NotificationStatus);
    setIsSubscribed(isOneSignalSubscribed());
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setIsLoading(true);
    try {
      const granted = await requestOneSignalPermission();
      setStatus(granted ? "granted" : "denied");
      setIsSubscribed(granted);
      return granted;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return { status, isSubscribed, isLoading, requestPermission };
}
```

---

## PASO 4: Integrar OneSignal en `main.tsx`

Agregar la inicialización de OneSignal antes de `createRoot`. El resto de la estructura
de `main.tsx` se mantiene sin cambios:

```typescript
// src/main.tsx — agregar el import y la llamada antes de createRoot

import { initOneSignal } from "@core/services/oneSignalService";

// Inicializar OneSignal al arrancar (no bloquea el render)
initOneSignal().catch(console.error);

createRoot(document.getElementById("root")!).render(
  // ... estructura existente sin cambios ...
);
```

> [!NOTE]
> No modificar los providers ni los imports existentes de `main.tsx`.
> Solo agregar el import de `initOneSignal` y la llamada antes de `createRoot`.

### Vincular usuario en AuthContext

En `src/core/context/AuthContext.tsx` **no** se debe agregar un segundo `onAuthStateChange`.
Ya existe uno centralizado que delega en `applySession`. Hay dos puntos a modificar:

#### 4.1 — Dentro de `applySession`

Agregar las llamadas a OneSignal en los dos ramos de la condición de sesión existente:

```typescript
// AuthContext.tsx — dentro de applySession(), modificar la condición existente

import { setOneSignalUser, clearOneSignalUser } from "@core/services/oneSignalService";

// ANTES:
if (currentSession?.user) {
  const { role: userRole, profileId: fetchedProfileId } = await fetchRole(currentSession.user.id);
  // ...
} else {
  setRole(null);
  setProfileId(null);
  setBusinessActive(null);
}

// DESPUÉS:
if (currentSession?.user) {
  const { role: userRole, profileId: fetchedProfileId } = await fetchRole(currentSession.user.id);
  // ...lógica existente sin cambios...
  // Vincular el usuario de Supabase con OneSignal
  setOneSignalUser(currentSession.user.id).catch(console.error);
} else {
  setRole(null);
  setProfileId(null);
  setBusinessActive(null);
  // Desvincular al hacer logout
  clearOneSignalUser().catch(console.error);
}
```

#### 4.2 — Función `signOut`

Reemplazar la llamada a `removePushSubscription()` por `clearOneSignalUser()`:

```typescript
// AuthContext.tsx — función signOut

// ANTES:
const signOut = async () => {
  try {
    await removePushSubscription();
  } catch { /* ignorar */ }
  await supabase.auth.signOut();
};

// DESPUÉS:
const signOut = async () => {
  try {
    await clearOneSignalUser();
  } catch { /* ignorar */ }
  await supabase.auth.signOut();
};
```

También eliminar el import de `removePushSubscription` de la cabecera del archivo.

> [!IMPORTANT]
> `OneSignal.login(userId)` asocia el dispositivo actual con el `external_user_id` del usuario.
> Esto permite enviar notificaciones por `userId` sin gestionar tokens de dispositivo manualmente.

---

## PASO 5: Configurar el Service Worker de OneSignal

OneSignal requiere un archivo Service Worker en la raíz del dominio. Crea el archivo:

### `public/OneSignalSDKWorker.js`

```javascript
// public/OneSignalSDKWorker.js
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
```

> [!NOTE]
> Este archivo se sirve desde la raíz (`/OneSignalSDKWorker.js`) gracias a estar en la carpeta `public/`.
> Vite lo copia directamente al `dist/` sin procesarlo. No lo importes en el JS de la app.

### Actualizar `vite.config.ts`

El proyecto usa `strategies: "injectManifest"`, por lo que **no existe un bloque `workbox`
separado**. La opción `excludeChunks` solo aplica a la estrategia `generateSW` y no debe
usarse aquí. Solo hay que agregar `globIgnores` dentro del bloque `injectManifest` existente:

```typescript
// vite.config.ts — dentro del bloque injectManifest existente

injectManifest: {
  globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
  globIgnores: ["**/OneSignalSDKWorker.js"], // ← agregar solo esta línea
},
```

> [!WARNING]
> No agregar un bloque `workbox: { ... }` ni usar `excludeChunks` — esas opciones son
> exclusivas de la estrategia `generateSW` y causarán errores con `injectManifest`.

---

## PASO 6: Reemplazar el componente de notificaciones

Actualizar `src/presentation/components/common/NotificationPermissionBanner.tsx`:

```tsx
// src/presentation/components/common/NotificationPermissionBanner.tsx

import { Bell, BellOff, BellRing } from "lucide-react";
import { useOneSignal } from "@core/hooks/useOneSignal";

export function NotificationPermissionBanner() {
  const { status, isSubscribed, isLoading, requestPermission } = useOneSignal();

  // No soportado
  if (status === "unsupported") return null;

  // Ya está suscrito y con permisos
  if (status === "granted" && isSubscribed) return null;

  // Permisos bloqueados por el usuario
  if (status === "denied") {
    return (
      <div className="mx-4 mt-3 mb-1 bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <BellOff className="w-5 h-5 text-gray-500 flex-shrink-0" />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Notificaciones bloqueadas. Actívalas en la configuración del navegador.
        </p>
      </div>
    );
  }

  // Estado default — mostrar banner de activación
  return (
    <div className="mx-4 mt-3 mb-1 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-amber-100 dark:bg-amber-800/50 p-2 rounded-full">
          <BellRing className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 dark:text-white text-sm">
            Activar notificaciones
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Recibe actualizaciones de tus pedidos en tiempo real
          </span>
        </div>
      </div>
      <button
        id="btn-enable-onesignal-notifications"
        onClick={requestPermission}
        disabled={isLoading}
        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
      >
        {isLoading ? "..." : "Activar"}
      </button>
    </div>
  );
}
```

---

## PASO 7: Crear la nueva Edge Function `onesignal-notify`

Esta función reemplaza a `send-push-notification`. Es más simple porque OneSignal gestiona
internamente la tabla de suscripciones, los tokens de dispositivo y los reintentos.

```bash
supabase functions new onesignal-notify
```

### `supabase/functions/onesignal-notify/index.ts`

```typescript
// supabase/functions/onesignal-notify/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ONESIGNAL_APP_ID  = Deno.env.get("ONESIGNAL_APP_ID")!;
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY")!;
const ONESIGNAL_API_URL = "https://onesignal.com/api/v1/notifications";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyPayload {
  /** auth.users.id del destinatario (external_user_id en OneSignal) */
  targetUserId: string;
  title: string;
  body: string;
  /** Ruta de la PWA a abrir al hacer clic en la notificación */
  url?: string;
  /** Datos extra para el manejador de clic */
  data?: Record<string, string>;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { targetUserId, title, body, url = "/", data }: NotifyPayload = await req.json();

    if (!targetUserId || !title || !body) {
      return new Response(
        JSON.stringify({ error: "targetUserId, title y body son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,

        // Segmentar por external_user_id (= auth.users.id de Supabase)
        include_aliases: {
          external_id: [targetUserId],
        },
        target_channel: "push",

        // Contenido de la notificación
        headings: { en: title, es: title },
        contents:  { en: body,  es: body  },

        // URL a abrir al hacer clic (PWA)
        url,

        // Datos custom para el Service Worker / handler de clic
        data: { url, ...data },

        // Iconos
        chrome_web_icon: "/dlizza-192x192.png",
        chrome_web_badge: "/dlizza-64x64.png",
        firefox_icon:     "/dlizza-192x192.png",

        // No hacer grupos de notificaciones por thread
        thread_id: undefined,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[onesignal-notify] Error de OneSignal API:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: "OneSignal API error", details: result }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[onesignal-notify] Notificación enviada:", JSON.stringify({
      targetUserId,
      title,
      notificationId: result.id,
      recipients: result.recipients,
    }));

    return new Response(
      JSON.stringify({ ok: true, notificationId: result.id, recipients: result.recipients }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[onesignal-notify] Error inesperado:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### Desplegar la Edge Function

```bash
supabase functions deploy onesignal-notify --no-verify-jwt
```

---

## PASO 8: Actualizar los servicios existentes

### 8.1 `checkoutService.ts` — Notificar al restaurante al crear pedido

Reemplazar la llamada a `send-push-notification` por `onesignal-notify`:

```typescript
// checkoutService.ts — dentro de createRestaurantOrder()
// ANTES (problemático):
// const { data: business } = await supabase
//   .from('businesses')
//   .select('profiles!inner(user_id)')   // ← Join que falla
//   ...

// DESPUÉS — consulta directa sin join implícito:
try {
  const { data: business } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", order.restaurant.id)
    .maybeSingle();

  if (business?.owner_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", business.owner_id)
      .maybeSingle();

    if (profile?.user_id) {
      await supabase.functions.invoke("onesignal-notify", {
        body: {
          targetUserId: profile.user_id,
          title: "🛵 ¡Nuevo pedido!",
          body: `${customerProfile.full_name} — $${order.total.toFixed(2)}`,
          url: "/restaurant/orders",
          data: { type: "new_order", orderId: orderId },
        },
      });
    } else {
      console.warn("[checkout] owner_id encontrado pero sin user_id en profiles:", business.owner_id);
    }
  } else {
    console.warn("[checkout] Negocio sin owner_id:", order.restaurant.id);
  }
} catch (e) {
  // No interrumpir el flujo del pedido, pero sí logear
  console.warn("[checkout:push-restaurante] Falló:", JSON.stringify(e));
}
```

### 8.2 `orderService.ts` — Notificar al cliente al cambiar estado

```typescript
// orderService.ts — dentro de updateOrderStatus()
// Reemplazar invocación de send-push-notification:

if (updatedOrder.customer_id) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", updatedOrder.customer_id)
      .maybeSingle();

    if (profile?.user_id) {
      const statusMessages: Record<string, string> = {
        confirmed: "Tu pedido fue confirmado ✅",
        preparing:  "Tu pedido está en preparación 👨‍🍳",
        ready:      "Tu pedido está listo 🎉",
        completed:  "Tu pedido fue entregado 🛵",
        cancelled:  "Tu pedido fue cancelado ❌",
      };

      const body = statusMessages[status] ?? `Estado actualizado: ${status}`;

      await supabase.functions.invoke("onesignal-notify", {
        body: {
          targetUserId: profile.user_id,
          title: "📦 Actualización de tu pedido",
          body,
          url: "/activity",
          data: { type: "order_update", orderId: updatedOrder.id },
        },
      });
    }
  } catch (e) {
    console.warn("[orders:push-cliente] Falló:", JSON.stringify(e));
  }
}
```

---

## PASO 9: Limpieza del sistema anterior

Una vez que OneSignal esté funcionando correctamente en producción, eliminar los artefactos
del sistema anterior:

### Archivos a eliminar

| Archivo | Razón |
|---|---|
| `src/core/services/pushNotificationService.ts` | Reemplazado por `oneSignalService.ts` |
| `src/core/hooks/usePushNotifications.ts` | Reemplazado por `useOneSignal.ts` |
| `supabase/functions/send-push-notification/` | Reemplazado por `onesignal-notify/` |

### Variables de entorno a eliminar

```env
# Eliminar de .env, .env.example y Vercel:
VITE_VAPID_PUBLIC_KEY=

# Eliminar de Supabase Secrets:
# supabase secrets unset VAPID_PRIVATE_KEY
# supabase secrets unset VAPID_PUBLIC_KEY
# supabase secrets unset VAPID_SUBJECT
# supabase secrets unset VAPID_MAILTO
```

### Tabla a deprecar (opcional — mantener si quieres historial)

```sql
-- Opcional: renombrar para indicar que ya no se usa activamente
ALTER TABLE push_subscriptions RENAME TO push_subscriptions_legacy;

-- O eliminar directamente si ya no hay datos útiles:
-- DROP TABLE push_subscriptions;
```

> [!WARNING]
> No eliminar `push_subscriptions` hasta que hayas verificado que **todos** los usuarios
> reciben notificaciones correctamente vía OneSignal durante al menos 1 semana en producción.

### `src/sw.ts` — Mantener los handlers de clic

El Service Worker actual (`src/sw.ts`) puede coexistir con OneSignal. El handler de `push`
que tiene actualmente **no se usará** (OneSignal usa su propio SW). Solo mantener los handlers
de Workbox para el precaching. Si quieres manejar el clic en notificaciones de OneSignal con
lógica personalizada, agregar el handler `notificationclick` en `public/OneSignalSDKWorker.js`:

```javascript
// public/OneSignalSDKWorker.js
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Handler de clic personalizado (opcional)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data;
  const url = data?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => "focus" in c);
        if (existing) {
          existing.focus();
          return existing.navigate(url);
        }
        return self.clients.openWindow(url);
      })
  );
});
```

---

## PASO 10: Deploy completo

```bash
# 1. Configurar secrets en Supabase
supabase secrets set ONESIGNAL_APP_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
supabase secrets set ONESIGNAL_REST_API_KEY="os_v2_app_xxxxx..."

# 2. Deploy de la nueva Edge Function
supabase functions deploy onesignal-notify --no-verify-jwt

# 3. Build del frontend (incluye el nuevo SDK y el OneSignalSDKWorker.js)
bun run build

# 4. Deploy en Vercel (automático si tienes CI/CD, o manual)
vercel deploy --prod
```

---

## PASO 11: Pruebas

### 11.1 Verificar inicialización en el navegador

```javascript
// En la consola del navegador (F12):
OneSignal.Debug.log(true);     // Activa logs detallados del SDK
OneSignal.User.PushSubscription.optedIn;  // true si está suscrito
OneSignal.User.onesignalId;    // ID interno de OneSignal
```

### 11.2 Enviar notificación de prueba desde el Dashboard

1. OneSignal Dashboard → **Messages → Push**
2. **New Push** → selecciona tu app `Delizza`
3. En **Audience**: selecciona **Test Users** o filtra por `external_id` de un usuario de prueba
4. Escribe el título y cuerpo
5. **Send Message**

### 11.3 Probar desde la Edge Function directamente

```bash
# Invocar la Edge Function localmente para probar
curl -X POST http://localhost:54321/functions/v1/onesignal-notify \
  -H "Content-Type: application/json" \
  -d '{
    "targetUserId": "<auth-user-id-de-prueba>",
    "title": "🛵 Prueba OneSignal",
    "body": "Notificación funcionando correctamente",
    "url": "/activity"
  }'
```

### 11.4 Verificar en el Dashboard de OneSignal

Tras enviar, ir a **Messages → Push** → ver el mensaje enviado.
Las columnas **Delivered** y **Clicked** confirman que el flujo completo funciona.

---

## Checklist de migración

```
[ ] PASO 0 — Crear cuenta y App en OneSignal
    [ ] Registrar sitio con URL de producción
    [ ] Copiar App ID y REST API Key

[ ] PASO 1 — Configurar variables de entorno
    [ ] VITE_ONESIGNAL_APP_ID en .env y Vercel
    [ ] ONESIGNAL_APP_ID y ONESIGNAL_REST_API_KEY en Supabase Secrets

[ ] PASO 2 — Instalar @onesignal/web-sdk
    [ ] bun add react-onesignal

[ ] PASO 3 — Crear servicios y hooks
    [ ] src/core/services/oneSignalService.ts
    [ ] src/core/hooks/useOneSignal.ts

[ ] PASO 4 — Integrar en main.tsx y AuthContext
    [ ] Agregar initOneSignal() antes de createRoot en main.tsx
    [ ] setOneSignalUser() en applySession() cuando hay sesión activa
    [ ] clearOneSignalUser() en applySession() cuando no hay sesión
    [ ] Reemplazar removePushSubscription() por clearOneSignalUser() en signOut()
    [ ] Eliminar import de removePushSubscription en AuthContext

[ ] PASO 5 — Service Worker de OneSignal
    [ ] Crear public/OneSignalSDKWorker.js
    [ ] Agregar globIgnores en el bloque injectManifest de vite.config.ts

[ ] PASO 6 — Actualizar NotificationPermissionBanner.tsx
    [ ] Usar useOneSignal en lugar de usePushNotifications

[ ] PASO 7 — Crear Edge Function onesignal-notify
    [ ] supabase/functions/onesignal-notify/index.ts
    [ ] supabase functions deploy onesignal-notify --no-verify-jwt

[ ] PASO 8 — Actualizar servicios
    [ ] checkoutService.ts → llamar a onesignal-notify (fix del join problemático)
    [ ] orderService.ts → llamar a onesignal-notify

[ ] PASO 9 — Limpieza (después de verificar en producción)
    [ ] Eliminar pushNotificationService.ts
    [ ] Eliminar usePushNotifications.ts
    [ ] Eliminar supabase/functions/send-push-notification/
    [ ] Eliminar variables VAPID de .env y Vercel
    [ ] Decidir qué hacer con la tabla push_subscriptions

[ ] PASO 10 — Deploy completo
    [ ] supabase secrets set (OneSignal)
    [ ] supabase functions deploy onesignal-notify
    [ ] bun run build + vercel deploy

[ ] PASO 11 — Verificación en producción
    [ ] Notificación de prueba desde Dashboard de OneSignal
    [ ] Flujo cliente → restaurante (nuevo pedido)
    [ ] Flujo restaurante → cliente (cambio de estado)
    [ ] Verificar en métricas de OneSignal (Delivered ✅)
```

---

## Consideraciones importantes

| Tema | Detalle |
|---|---|
| **external_user_id** | OneSignal usa el `auth.users.id` de Supabase como identificador, eliminando la necesidad de una tabla `push_subscriptions` propia |
| **iOS** | OneSignal tiene soporte nativo para iOS 16.4+ incluyendo modo standalone y Safari en desktop. Mejor cobertura que el sistema actual |
| **Plan gratuito** | Hasta 10,000 suscriptores únicos. Para Delizza en sus etapas actuales es más que suficiente |
| **GDPR / privacidad** | OneSignal almacena datos en USA. Si necesitas cumplimiento estricto EU, usar la opción de EU Data Residency en el plan pagado |
| **Coexistencia de SWs** | El `OneSignalSDKWorker.js` y el SW de Workbox (`sw.ts`) coexisten sin conflictos. Cada uno tiene su scope y responsabilidad |
| **Rollback** | El sistema anterior (`send-push-notification` + `push_subscriptions`) puede mantenerse hasta estar seguro de que OneSignal funciona en producción |
| **Autenticación anónima** | Si tu app permite usuarios no autenticados, `OneSignal.login()` no debe llamarse. Las notificaciones a guests no son posibles sin `external_user_id` |

---

## Recursos

- [OneSignal Web SDK Docs](https://documentation.onesignal.com/docs/web-push-quickstart)
- [OneSignal REST API — Create Notification](https://documentation.onesignal.com/reference/create-notification)
- [OneSignal — External User IDs](https://documentation.onesignal.com/docs/external-user-ids)
- [npm: react-onesignal](https://www.npmjs.com/package/react-onesignal)
- [Contexto del bug actual: `DIAGNOSTICO-Bug-Notificaciones-Restaurante.md`](./DIAGNOSTICO-Bug-Notificaciones-Restaurante.md)

---

*Documento creado como guía de migración del sistema de Push Notifications de Delizza — Abril 2026*
