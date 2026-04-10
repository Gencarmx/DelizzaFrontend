/// <reference lib="webworker" />
/**
 * sw.ts — Service Worker personalizado de Delizza
 *
 * Maneja:
 * - Precaching de assets (inyectado por vite-plugin-pwa en build)
 * - Navegación offline (SPA fallback)
 * - Recepción de Web Push Notifications
 * - Clic en notificaciones (navegar a la ruta correcta)
 */

import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare const self: ServiceWorkerGlobalScope;

// ── Precaching ────────────────────────────────────────────────────────────────
// self.__WB_MANIFEST es reemplazado por vite-plugin-pwa con la lista de assets
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA fallback: todas las rutas de navegación sirven index.html
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));

// ── Ciclo de vida ─────────────────────────────────────────────────────────────
self.skipWaiting();
self.addEventListener("activate", () => self.clients.claim());

// ── Push: recibir y mostrar la notificación ───────────────────────────────────
self.addEventListener("push", (event: PushEvent) => {
  console.log("[SW] push event recibido, tiene data:", !!event.data);
  if (!event.data) return;

  let data: {
    title: string;
    body: string;
    url?: string;
    type?: "order_update" | "new_order";
    icon?: string;
  };

  try {
    data = event.data.json();
    console.log("[SW] push payload parseado:", JSON.stringify(data));
  } catch (e) {
    console.error("[SW] Error al parsear push payload:", e, "| raw:", event.data.text());
    return;
  }

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon ?? "/dlizza-192x192.png",
    badge: "/dlizza-64x64.png",
    tag: data.type ?? "delizza-notification",
    data: { url: data.url ?? "/" },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options).then(() => {
      console.log("[SW] showNotification exitoso:", data.title);
    }).catch((e) => {
      console.error("[SW] showNotification falló:", e);
    })
  );
});

// ── Notification Click: abrir o enfocar la ventana ───────────────────────────
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data?.url as string) ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const win = clients.find((c) => "focus" in c);
        if (win) {
          win.focus();
          return (win as WindowClient).navigate(targetUrl);
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
