# Plan: Web Push Notifications — Delizza

> **Fecha:** Abril 2026  
> **Estado:** En planeación  
> **Objetivo:** Implementar push notifications nativas que funcionen con la app cerrada, para dos audiencias:
> - **Clientes**: reciben actualizaciones de estado de su pedido
> - **Restaurante (owner)**: recibe alertas de nuevos pedidos

---

## Contexto y Diagnóstico

### Lo que ya existe (NO tocar)

El proyecto ya tiene un sistema completo de notificaciones **en-app** (cuando la app está abierta):

| Componente | Archivo | Función actual |
|---|---|---|
| `useRealtimeNotifications` | `src/presentation/logic/useRealtimeNotifications.ts` | Suscripción Realtime + sonido + notif. browser para el restaurante |
| `useCustomerNotifications` | `src/presentation/logic/useCustomerNotifications.ts` | Suscripción Realtime + sonido + notif. browser para el cliente |
| `RestaurantNotificationsContext` | `src/core/context/RestaurantNotificationsContext.tsx` | Proveedor de estado de notif. del restaurante |
| `CustomerNotificationsContext` | `src/core/context/CustomerNotificationsContext.tsx` | Proveedor de estado de notif. del cliente |
| `NotificationPermissionBanner` | `src/presentation/components/common/NotificationPermissionBanner.tsx` | Banner actual para pedir permisos (básico) |
| `notifyRestaurant()` | `src/core/services/checkoutService.ts` | Broadcasts al canal del restaurante cuando se crea un pedido |
| `updateOrderStatus()` | `src/core/services/orderService.ts` | Broadcasts al canal del cliente cuando cambia el estado |

### El Gap: Notificaciones con la App Cerrada

El sistema **Supabase Broadcast** solo funciona cuando la app está abierta y conectada. Cuando el usuario cierra el browser/app:
- ❌ El restaurante no sabe que llegó un pedido nuevo
- ❌ El cliente no sabe que su pedido fue confirmado/preparado/entregado

**La solución:** **Web Push API** vía Service Worker. Funciona cuando la app está completamente cerrada.

### Arquitectura Objetivo

```
[Evento]                    [Entregador]              [Receptor]
─────────────────────────────────────────────────────────────────
Cliente hace pedido    ──➜  Edge Function             ──➜ SW del Owner
                             send-push-notification        (app cerrada ✅)

Owner cambia estado    ──➜  Edge Function             ──➜ SW del Cliente
de pedido                    send-push-notification        (app cerrada ✅)

+ Lo existente:
Canal Broadcast        ──➜  Realtime                  ──➜ App abierta ✅
```

---

## Prerequisitos: VAPID Keys

Las VAPID keys son un par criptográfico único que identifica tu servidor. Se generan **una sola vez**.

```bash
# En el proyecto, ejecutar:
npx web-push generate-vapid-keys
```

**Salida esperada:**
```
Public Key:  BLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Private Key: yyyyyyyyyyyyyyyyyyyyyyyyyyy
```

**Dónde guardarlas:**

| Variable | Dónde |
|---|---|
| `VITE_VAPID_PUBLIC_KEY` | `.env` (frontend, prefijo VITE) |
| `VAPID_PRIVATE_KEY` | Supabase Edge Function Secrets |
| `VAPID_MAILTO` | Supabase Edge Function Secrets (ej: `mailto:admin@delizza.com`) |

> ⚠️ **CRÍTICO**: Una vez que usuarios se suscriban, NO cambiar las keys. Las suscripciones dejan de funcionar si las keys cambian.

---

## Fase 1: Base de Datos

### Tabla `push_subscriptions`

```sql
-- Archivo: sql/create_push_subscriptions.sql

create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  profile_id    uuid references public.profiles(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,                          -- para diagnóstico
  created_at    timestamptz default now()
);

-- Índice para búsquedas por usuario
create index if not exists idx_push_subscriptions_user_id 
  on public.push_subscriptions(user_id);

create index if not exists idx_push_subscriptions_profile_id 
  on public.push_subscriptions(profile_id);

-- Row Level Security
alter table public.push_subscriptions enable row level security;

-- Los usuarios solo pueden leer/modificar sus propias suscripciones
create policy "Users manage own subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- El service role (Edge Functions) puede leer todas para enviar notifs
-- (ya tiene acceso por defecto al usar service_role key)
```

---

## Fase 2: Service Worker Personalizado

### Cambio en `vite.config.ts`

Pasar de `generateSW` (automático) a `injectManifest` (personalizado) para poder manejar el evento `push`.

```typescript
// vite.config.ts — cambio en la sección VitePWA

VitePWA({
  registerType: "autoUpdate",
  // ─── CAMBIO CLAVE ──────────────────────────
  strategies: "injectManifest",   // antes: implícito "generateSW"
  srcDir: "src",
  filename: "sw.ts",
  // ───────────────────────────────────────────
  injectRegister: "auto",
  includeAssets: ["favicon.ico", "apple-touch-icon.png"],
  manifest: {
    // ... todo igual que antes
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
    navigateFallback: "index.html",
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true,
  },
  devOptions: {
    enabled: true,
    navigateFallback: "index.html",
    suppressWarnings: true,
    type: "module",
  },
})
```

### Nuevo archivo `src/sw.ts`

Service Worker personalizado. Es el corazón de las push notifications.

```typescript
// src/sw.ts
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

// ── Precaching (igual que antes) ──────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

self.skipWaiting();
self.addEventListener('activate', () => self.clients.claim());

// ── Push Event: Recibir y mostrar notificación ────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  const data = event.data.json() as {
    title: string;
    body: string;
    url?: string;
    type?: 'order_update' | 'new_order';
    icon?: string;
  };

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon ?? '/dlizza-192x192.png',
    badge: '/dlizza-64x64.png',
    tag: data.type ?? 'delizza-notification',
    data: { url: data.url ?? '/' },
    // vibrate solo en Android
    // vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Notification Click: Navegar a la ruta correcta ───────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data?.url as string) ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Si ya hay una ventana abierta, enfocarla y navegar
        const win = clients.find(c => 'focus' in c);
        if (win) {
          win.focus();
          return (win as WindowClient).navigate(targetUrl);
        }
        // Si no hay ventana, abrir una nueva
        return self.clients.openWindow(targetUrl);
      })
  );
});
```

---

## Fase 3: Servicio Frontend

### Nuevo archivo `src/core/services/pushNotificationService.ts`

```typescript
// src/core/services/pushNotificationService.ts

import { supabase } from "@core/supabase/client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

/**
 * Convierte una VAPID public key en base64 a Uint8Array.
 * Requerido por la Web Push API.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

/**
 * Solicita permiso de notificaciones al usuario.
 * Retorna true si fue concedido.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Obtiene la suscripción push activa o crea una nueva.
 * Requiere que el Service Worker esté registrado y que tengamos permiso.
 */
export async function getOrCreatePushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  
  const registration = await navigator.serviceWorker.ready;
  
  // Ver si ya hay una suscripción activa
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  
  // Crear nueva suscripción
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

/**
 * Verifica si el navegador soporta push notifications.
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Guarda la suscripción en Supabase para el usuario autenticado.
 */
export async function savePushSubscription(subscription: PushSubscription): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa');

  // Obtener profile_id para facilitar búsquedas en la Edge Function
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const json = subscription.toJSON();
  const { endpoint, keys } = json;

  await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: user.id,
      profile_id: profile?.id ?? null,
      endpoint: endpoint!,
      p256dh: keys!['p256dh'],
      auth: keys!['auth'],
      user_agent: navigator.userAgent,
    }, {
      onConflict: 'endpoint',  // actualizar si ya existe (renovación de suscripción)
    });
}

/**
 * Elimina la suscripción push del navegador y de Supabase.
 */
export async function removePushSubscription(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    
    // Eliminar de Supabase
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);
  }
}

/**
 * Activa las push notifications: pide permiso, crea suscripción y la guarda.
 * Función principal a llamar desde UI.
 */
export async function enablePushNotifications(): Promise<{
  success: boolean;
  reason?: 'unsupported' | 'denied' | 'error';
}> {
  if (!isPushSupported()) {
    return { success: false, reason: 'unsupported' };
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    return { success: false, reason: 'denied' };
  }

  try {
    const subscription = await getOrCreatePushSubscription();
    if (!subscription) return { success: false, reason: 'error' };
    
    await savePushSubscription(subscription);
    return { success: true };
  } catch {
    return { success: false, reason: 'error' };
  }
}
```

---

## Fase 4: Hook React

### Nuevo archivo `src/core/hooks/usePushNotifications.ts`

```typescript
// src/core/hooks/usePushNotifications.ts

import { useState, useEffect, useCallback } from 'react';
import {
  isPushSupported,
  enablePushNotifications,
  removePushSubscription,
} from '@core/services/pushNotificationService';

export type PushPermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  permissionState: PushPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported] = useState(() => isPushSupported());
  const [permissionState, setPermissionState] = useState<PushPermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Inicializar estado desde el navegador
  useEffect(() => {
    if (!isSupported) {
      setPermissionState('unsupported');
      return;
    }

    setPermissionState(Notification.permission as PushPermissionState);

    // Verificar si ya existe suscripción activa
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription()
    ).then(sub => {
      setIsSubscribed(!!sub);
    }).catch(() => {
      setIsSubscribed(false);
    });
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await enablePushNotifications();
      if (result.success) {
        setPermissionState('granted');
        setIsSubscribed(true);
      } else if (result.reason === 'denied') {
        setPermissionState('denied');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      await removePushSubscription();
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isSupported, permissionState, isSubscribed, isLoading, subscribe, unsubscribe };
}
```

---

## Fase 5: Supabase Edge Function

### Nuevo archivo `supabase/functions/send-push-notification/index.ts`

Esta función es el **entregador central**. La llaman:
- `checkoutService.ts` (al crear un pedido → notifica al owner)
- `orderService.ts` (al cambiar estado → notifica al cliente)

```typescript
// supabase/functions/send-push-notification/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push";

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_PUBLIC_KEY  = Deno.env.get("VITE_VAPID_PUBLIC_KEY")!;
const VAPID_MAILTO      = Deno.env.get("VAPID_MAILTO")!;

webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface PushPayload {
  targetUserId: string;     // auth.users.id del destinatario
  title: string;
  body: string;
  url?: string;             // ruta a abrir al hacer clic
  type?: 'order_update' | 'new_order';
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const payload: PushPayload = await req.json();
    const { targetUserId, title, body, url = "/", type } = payload;

    // Supabase con service role para leer todas las suscripciones
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Obtener todas las suscripciones del usuario
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", targetUserId);

    if (error) throw error;
    if (!subscriptions?.length) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No subscriptions found" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const notificationPayload = JSON.stringify({ title, body, url, type });

    // Enviar a todos los dispositivos del usuario (puede tener móvil + desktop)
    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notificationPayload
        )
      )
    );

    // Limpiar suscripciones expiradas (HTTP 410 = Gone)
    const expiredEndpoints = subscriptions
      .filter((_, i) => {
        const r = results[i];
        return r.status === 'rejected' && (r.reason as any)?.statusCode === 410;
      })
      .map(s => s.endpoint);

    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    const sent = results.filter(r => r.status === 'fulfilled').length;
    return new Response(
      JSON.stringify({ sent, total: subscriptions.length }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

### Configurar secretos en Supabase

```bash
supabase secrets set VAPID_PRIVATE_KEY="tu-clave-privada"
supabase secrets set VITE_VAPID_PUBLIC_KEY="tu-clave-publica"
supabase secrets set VAPID_MAILTO="mailto:admin@delizza.com"
```

---

## Fase 6: Integración con Servicios Existentes

### Modificar `checkoutService.ts` — Notificar al owner al crear pedido

En `createRestaurantOrder()`, después de llamar a `notifyRestaurant()` (que ya existe para en-app), agregar la llamada a la Edge Function:

```typescript
// En createRestaurantOrder(), después de: await notifyRestaurant(orderId, ...);

// Notificación push al owner (funciona con app cerrada)
try {
  // Obtener el user_id del owner del restaurante
  const { data: business } = await supabase
    .from('businesses')
    .select('profiles!inner(user_id)')
    .eq('id', order.restaurant.id)
    .maybeSingle();
  
  const ownerUserId = (business as any)?.profiles?.user_id;
  
  if (ownerUserId) {
    await supabase.functions.invoke('send-push-notification', {
      body: {
        targetUserId: ownerUserId,
        title: '🛵 ¡Nuevo pedido!',
        body: `${customerProfile.full_name} — $${order.total.toFixed(2)}`,
        url: '/restaurant/orders',
        type: 'new_order',
      },
    });
  }
} catch {
  // No interrumpir el flujo si falla la push
}
```

### Modificar `orderService.ts` — Notificar al cliente al cambiar estado

En `updateOrderStatus()`, después del broadcast existente, agregar:

```typescript
// En updateOrderStatus(), después del canal de broadcast existente:

// Notificación push al cliente (funciona con app cerrada)
if (updatedOrder.customer_id) {
  try {
    // Obtener user_id del cliente
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', updatedOrder.customer_id)
      .maybeSingle();
    
    if (profile?.user_id) {
      const statusMessages: Record<string, string> = {
        confirmed: 'Tu pedido fue confirmado ✅',
        preparing: 'Tu pedido está en preparación 👨‍🍳',
        ready:     'Tu pedido está listo 🎉',
        completed: 'Tu pedido fue entregado 🛵',
        cancelled: 'Tu pedido fue cancelado ❌',
      };
      
      const body = statusMessages[status] ?? `Estado actualizado: ${status}`;
      
      await supabase.functions.invoke('send-push-notification', {
        body: {
          targetUserId: profile.user_id,
          title: '📦 Actualización de tu pedido',
          body,
          url: '/activity',
          type: 'order_update',
        },
      });
    }
  } catch {
    // No interrumpir si falla la push
  }
}
```

---

## Fase 7: UI — Botón de Activar Notificaciones

### 7.1 Mejorar `NotificationPermissionBanner.tsx`

El banner actual solo maneja el permiso del sistema. Expandirlo para también suscribir a Web Push:

```typescript
// Reemplazar/expandir NotificationPermissionBanner.tsx

import { Bell, BellOff, BellRing } from "lucide-react";
import { usePushNotifications } from "@core/hooks/usePushNotifications";

export function NotificationPermissionBanner() {
  const { isSupported, permissionState, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) return null;

  // Ya tiene permisos y está suscrito — no mostrar banner
  if (permissionState === 'granted' && isSubscribed) return null;
  
  // Ya negó el permiso — mostrar info de cómo habilitarlo
  if (permissionState === 'denied') {
    return (
      <div className="mx-4 mt-3 mb-1 bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <BellOff className="w-5 h-5 text-gray-500 flex-shrink-0" />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Notificaciones bloqueadas. Actívalas en la configuración del navegador.
        </p>
      </div>
    );
  }

  // Estado "default" o tiene permiso pero no suscripción — mostrar botón
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
            Recibe actualizaciones de tus pedidos
          </span>
        </div>
      </div>
      <button
        id="btn-enable-push-notifications"
        onClick={subscribe}
        disabled={isLoading}
        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
      >
        {isLoading ? '...' : 'Activar'}
      </button>
    </div>
  );
}
```

### 7.2 Dónde mostrar el banner

**Cliente:** En `Home.tsx`, al inicio de la página (antes del contenido principal).

**Restaurante:** En `RestaurantLayout.tsx`, en el header o justo después del spinner de carga.

### 7.3 Página `/notifications` (ya existe en el router)

Expandir la página `Notifications.tsx` para incluir:
- Toggle para activar/desactivar push notifications
- Estado actual de permisos
- Opción de desuscribirse

---

## Fase 8: Integrar Providers en `main.tsx`

```typescript
// main.tsx — agregar CustomerNotificationsProvider al árbol
import { CustomerNotificationsProvider } from "@core/context/CustomerNotificationsContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AddressProvider>
          <CartProvider>
            <CustomerNotificationsProvider>  {/* ← NUEVO */}
              <RouterProvider router={router} />
            </CustomerNotificationsProvider>
          </CartProvider>
        </AddressProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
```

> **Nota:** `CustomerNotificationsProvider` ya existe en el archivo del contexto pero no está en `main.tsx`. Debe agregarse para que el `NotificationPermissionBanner` funcione en el scope del cliente.

---

## Checklist de Implementación

```
[ ] FASE 0: Prerequisitos
    [ ] Ejecutar: npx web-push generate-vapid-keys
    [ ] Agregar VITE_VAPID_PUBLIC_KEY al .env local
    [ ] Agregar VITE_VAPID_PUBLIC_KEY al .env de Vercel

[ ] FASE 1: Base de datos
    [ ] Crear tabla push_subscriptions en Supabase Studio
    [ ] Verificar políticas RLS

[ ] FASE 2: Service Worker
    [ ] Crear src/sw.ts con handlers push y notificationclick
    [ ] Modificar vite.config.ts: strategies: "injectManifest"
    [ ] Verificar que la caché existente sigue funcionando

[ ] FASE 3: Servicio frontend
    [ ] Crear src/core/services/pushNotificationService.ts
    [ ] Verificar import de VITE_VAPID_PUBLIC_KEY

[ ] FASE 4: Hook React
    [ ] Crear src/core/hooks/usePushNotifications.ts
    [ ] Agregar carpeta hooks al alias en tsconfig si es necesario

[ ] FASE 5: Edge Function
    [ ] Crear supabase/functions/send-push-notification/index.ts
    [ ] Configurar secretos: supabase secrets set ...
    [ ] Deploy: supabase functions deploy send-push-notification

[ ] FASE 6: Integración con servicios
    [ ] Modificar checkoutService.ts — llamada push al owner
    [ ] Modificar orderService.ts — llamada push al cliente

[ ] FASE 7: UI
    [ ] Expandir NotificationPermissionBanner.tsx
    [ ] Agregar banner en Home.tsx (cliente)
    [ ] Agregar banner en RestaurantLayout.tsx (owner)
    [ ] Actualizar página Notifications.tsx con toggle

[ ] FASE 8: main.tsx
    [ ] Agregar CustomerNotificationsProvider al árbol de providers

[ ] VERIFICACIÓN
    [ ] Probar en Chrome DevTools: Application → Push Messaging
    [ ] Probar con app cerrada en Android
    [ ] Probar clic en notificación → navega a la ruta correcta
    [ ] Verificar que suscripciones expiradas se limpian (HTTP 410)
```

---

## Compatibilidad

| Plataforma | Soporte |
|---|---|
| Chrome (Android/Desktop) | ✅ Completo |
| Firefox (Android/Desktop) | ✅ Completo |
| Edge | ✅ Completo |
| Safari macOS ≥ 13 | ✅ Con VAPID |
| iOS PWA instalada (≥ 16.4) | ✅ Solo si la PWA está instalada en home screen |
| iOS Safari (no instalada) | ❌ No soportado |
| Samsung Internet | ✅ Completo |

---

## Notas de Seguridad

1. **VAPID keys no cambiar:** Una vez usuarios suscritos, cambiar keys elimina todas las suscripciones
2. **RLS en push_subscriptions:** Usuarios solo ven sus propias suscripciones
3. **Edge Function usa service_role:** Solo la Edge Function puede leer suscripciones ajenas (para enviar push)
4. **No guardar claves privadas en el frontend:** La `VAPID_PRIVATE_KEY` solo va en los secrets de Supabase
5. **Limpieza de suscripciones expiradas:** La Edge Function elimina automáticamente las suscripciones con HTTP 410

---

## Prueba Manual End-to-End

### Prueba A: Cliente recibe actualización de pedido

1. Cliente activa notificaciones en Home
2. Cliente hace un pedido
3. **Cerrar el navegador completamente**
4. Owner cambia el estado del pedido a "Confirmado"
5. ✅ El cliente debe recibir una notificación push aunque el app esté cerrado

### Prueba B: Owner recibe alerta de nuevo pedido

1. Owner activa notificaciones en el panel
2. **Cerrar el browser del owner**
3. Un cliente hace un pedido
4. ✅ El owner debe recibir: "🛵 ¡Nuevo pedido!"

### Prueba de Edge Function (curl)

```bash
curl -X POST \
  https://czaiyunauxgfvdmvqxsw.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "targetUserId": "UUID-DEL-USUARIO",
    "title": "Prueba de notificación",
    "body": "Si ves esto, funciona 🎉",
    "url": "/activity",
    "type": "order_update"
  }'
```
