# 🔔 Guía de Implementación: Push Notifications en Delizza

> Esta guía está diseñada específicamente para el stack de Delizza:
> **Vite + React + TypeScript + vite-plugin-pwa (Workbox) + Supabase**

---

## 📋 Resumen de la Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                     FLUJO COMPLETO                      │
│                                                         │
│  1. Usuario instala/abre la PWA                         │
│  2. App solicita permiso de notificaciones              │
│  3. Browser genera subscription con clave VAPID         │
│  4. App guarda la subscription en Supabase (tabla)      │
│  5. Evento ocurre (nueva order, status change, etc.)    │
│  6. Supabase Edge Function envía push a subscription    │
│  7. Service Worker recibe push → muestra notificación   │
└─────────────────────────────────────────────────────────┘
```

---

## PASO 1: Generar Claves VAPID

Las claves VAPID autentican tu servidor ante los push services de los browsers.

### 1.1 Instalar web-push localmente (solo para generar claves)

```bash
bun add -g web-push
```

### 1.2 Generar el par de claves

```bash
web-push generate-vapid-keys
```

Guarda el output — se verá así:

```
Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjZJtHaE8x1_c3AQg2oCFIPnM...

Private Key:
4dFPuQ6SQfK20FolkHbhFzE_Tj0Tz7pqWH...
```

### 1.3 Agregar las claves como variables de entorno

**En `.env` (local, NO subir a Git):**
```env
VITE_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69y...
```

**En `.env.example` (agregar referencia sin valor):**
```env
VITE_VAPID_PUBLIC_KEY=
```

**En Vercel (Dashboard → Settings → Environment Variables):**
```
VITE_VAPID_PUBLIC_KEY = <tu public key>
VAPID_PRIVATE_KEY    = <tu private key>  ← Solo para Edge Functions, NO prefijo VITE_
VAPID_SUBJECT        = mailto:tu@email.com
```

> [!IMPORTANT]
> La `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` deben configurarse TAMBIÉN como Secrets en Supabase:
> `supabase secrets set VAPID_PRIVATE_KEY=<key> VAPID_SUBJECT=mailto:tu@email.com`

---

## PASO 2: Crear la Tabla en Supabase

Ejecuta este SQL en el SQL Editor de Supabase:

```sql
-- Tabla para almacenar push subscriptions
CREATE TABLE push_subscriptions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  device_info JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can read all subscriptions"
  ON push_subscriptions
  FOR SELECT
  USING (auth.role() = 'service_role');
```

---

## PASO 3: Configurar el Service Worker

### 3.1 Actualizar `vite.config.ts`

Cambiar `strategies` a `"injectManifest"` para usar un SW personalizado:

```typescript
VitePWA({
  registerType: "autoUpdate",
  strategies: "injectManifest",   // ← CAMBIO CLAVE
  srcDir: "src",
  filename: "sw.ts",              // ← Tu SW personalizado

  injectManifest: {
    globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
  },

  manifest: {
    // ... tu manifest actual sin cambios ...
  },

  workbox: {
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

### 3.2 Crear `src/sw.ts`

```typescript
// src/sw.ts
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();
self.skipWaiting();

// ── Push Notifications ─────────────────────────────────────

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  const data = event.data.json() as {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
  };

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon ?? "/dlizza-192x192.png",
    badge: data.badge ?? "/dlizza-64x64.png",
    tag: data.tag ?? "delizza-notification",
    data: { url: data.url ?? "/" },
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url: string })?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) {
          existing.focus();
          existing.navigate(url);
        } else {
          self.clients.openWindow(url);
        }
      })
  );
});
```

### 3.3 Actualizar `tsconfig.app.json`

Asegurarte de incluir `WebWorker` en los `lib`:

```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable", "WebWorker"]
  }
}
```

---

## PASO 4: Crear la Edge Function para Enviar Notificaciones

```bash
supabase functions new send-push-notification
```

**`supabase/functions/send-push-notification/index.ts`:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT")!,
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!
    );

    const { user_id, title, body, url, tag } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (error) throw error;
    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ message: "No subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({ title, body, url: url ?? "/activity", tag });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );

    // Limpiar suscripciones expiradas (HTTP 410 Gone)
    const expiredEndpoints = subscriptions
      .filter((_, i) => {
        const r = results[i];
        return r.status === "rejected" &&
          (r.reason as { statusCode: number })?.statusCode === 410;
      })
      .map((s) => s.endpoint);

    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    return new Response(JSON.stringify({ sent: subscriptions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

## PASO 5: Hook `usePushNotifications`

**`src/core/hooks/usePushNotifications.ts`:**

```typescript
import { useState, useCallback } from "react";
import { supabase } from "@core/supabase/client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export type PushPermissionStatus = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const [status, setStatus] = useState<PushPermissionStatus>(() => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission as PushPermissionStatus;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      setStatus(permission as PushPermissionStatus);
      if (permission !== "granted") return false;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const sub = subscription.toJSON();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { error: dbError } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: sub.keys!["p256dh"],
          auth: sub.keys!["auth"],
          device_info: { userAgent: navigator.userAgent },
        },
        { onConflict: "endpoint" }
      );
      if (dbError) throw dbError;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
      }
      setStatus("default");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al desuscribirse");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { status, isLoading, error, subscribe, unsubscribe };
}
```

---

## PASO 6: Componente de UI

**`src/presentation/components/notifications/PushNotificationToggle.tsx`:**

```tsx
import { Bell, BellOff, BellRing } from "lucide-react";
import { usePushNotifications } from "@core/hooks/usePushNotifications";

export function PushNotificationToggle() {
  const { status, isLoading, error, subscribe, unsubscribe } = usePushNotifications();

  if (status === "unsupported") return null;

  const handleToggle = () => {
    status === "granted" ? unsubscribe() : subscribe();
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleToggle}
        disabled={isLoading || status === "denied"}
        className="flex items-center gap-3 w-full p-4 rounded-xl
                   bg-surface border border-border hover:bg-surface-hover
                   transition-colors disabled:opacity-50"
      >
        {status === "granted" ? (
          <BellRing className="text-amber-400" size={20} />
        ) : status === "denied" ? (
          <BellOff className="text-muted" size={20} />
        ) : (
          <Bell size={20} />
        )}
        <div className="flex flex-col items-start">
          <span className="font-medium text-sm">
            {status === "granted"
              ? "Notificaciones activas"
              : status === "denied"
              ? "Notificaciones bloqueadas"
              : "Activar notificaciones"}
          </span>
          <span className="text-xs text-muted">
            {status === "granted"
              ? "Recibirás alertas de tus pedidos"
              : status === "denied"
              ? "Actívalas desde configuración del navegador"
              : "Entérate del estado de tu pedido en tiempo real"}
          </span>
        </div>
      </button>
      {error && <p className="text-xs text-red-400 px-1">{error}</p>}
    </div>
  );
}
```

Agrega `<PushNotificationToggle />` en tu página de Settings o Profile.

---

## PASO 7: Integrar con el Sistema de Órdenes

Cuando el restaurante actualice el estado de un pedido, invocar la Edge Function:

```typescript
const statusMessages: Record<string, { title: string; body: string }> = {
  confirmed:  { title: "✅ Pedido confirmado",   body: "Tu pedido está siendo preparado" },
  preparing:  { title: "👨‍🍳 En preparación",     body: "El restaurante está cocinando tu pedido" },
  ready:      { title: "🛵 ¡Listo!",             body: "Tu pedido está listo para entrega" },
  on_the_way: { title: "🛵 En camino",           body: "Tu repartidor está en camino" },
  delivered:  { title: "🎉 ¡Entregado!",         body: "¡Que lo disfrutes!" },
  cancelled:  { title: "❌ Pedido cancelado",    body: "Tu pedido fue cancelado" },
};

// Llamar después de actualizar el status en la DB:
const message = statusMessages[newStatus];
if (message) {
  await supabase.functions.invoke("send-push-notification", {
    body: {
      user_id: customerId,
      ...message,
      url: "/activity",
      tag: `order-${orderId}`,
    },
  });
}
```

---

## PASO 8: Deploy

```bash
# Configurar secrets en Supabase
supabase secrets set VAPID_PUBLIC_KEY="BEl62iUYgUivxIkv69y..."
supabase secrets set VAPID_PRIVATE_KEY="4dFPuQ6SQfK20F..."
supabase secrets set VAPID_SUBJECT="mailto:tu@email.com"

# Deploy de la Edge Function
supabase functions deploy send-push-notification --no-verify-jwt

# Build del frontend
bun run build
```

---

## PASO 9: Prueba Local

```bash
bun run dev
# Abre localhost:5173, activa notificaciones en la app
```

Simula un push desde Chrome DevTools:
> **F12 → Application → Service Workers → Push** (campo de texto + botón Push)

Escribe el payload JSON:
```json
{ "title": "🛵 Prueba", "body": "Notificación funcionando!", "url": "/activity" }
```

---

## ✅ Checklist

- [ ] **PASO 1** — Generar claves VAPID + configurar en `.env` y Vercel
- [ ] **PASO 2** — Crear tabla `push_subscriptions` con RLS en Supabase
- [ ] **PASO 3** — Cambiar `vite.config.ts` a `injectManifest` + crear `src/sw.ts`
- [ ] **PASO 4** — Crear Edge Function `send-push-notification`
- [ ] **PASO 5** — Crear hook `usePushNotifications`
- [ ] **PASO 6** — Crear componente `PushNotificationToggle` e integrarlo en Settings
- [ ] **PASO 7** — Disparar notificaciones al cambiar status de orden
- [ ] **PASO 8** — Configurar secrets + deploy
- [ ] **PASO 9** — Probar en local y producción

---

## ⚠️ Consideraciones Importantes

| Tema | Detalle |
|------|---------|
| **iOS Safari** | Solo disponible en iOS 16.4+ y solo en modo **standalone** (añadida a pantalla inicio) |
| **HTTPS** | Push Notifications **solo funcionan en HTTPS** — Vercel lo maneja automáticamente |
| **Permiso del usuario** | Solo solicitar permiso tras una acción del usuario (botón), nunca on load |
| **Subscriptions caducan** | La Edge Function ya elimina las que devuelvan HTTP 410 (Gone) |
| **Chrome DevTools** | Application → Service Workers → Push — para simular en desarrollo |
