/// <reference lib="webworker" />
/**
 * OneSignalSDKWorker.ts — Service Worker unificado de Delizza
 *
 * Un único SW que combina:
 * - OneSignal SDK (push notifications + notificationclick)
 * - Workbox (precaching de assets + SPA fallback)
 *
 * IMPORTANTE: importScripts debe ir primero para que OneSignal registre
 * sus event listeners antes de que Workbox tome el control del ciclo de vida.
 */

// 1. OneSignal SDK: gestiona los eventos push y notificationclick internamente.
//    NO agregar handlers propios de push/notificationclick — causarían notificaciones duplicadas.
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare const self: ServiceWorkerGlobalScope;

// 2. Precaching — self.__WB_MANIFEST es inyectado por vite-plugin-pwa en build
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// 3. SPA fallback: todas las rutas de navegación sirven index.html
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));

// 4. Ciclo de vida
self.skipWaiting();
self.addEventListener("activate", () => self.clients.claim());
