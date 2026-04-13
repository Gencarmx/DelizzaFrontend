// src/core/services/oneSignalService.ts

import OneSignal from "react-onesignal";
import { supabase } from "@core/supabase/client";

// En desarrollo se elige el App ID según el puerto para soportar dos instancias
// simultáneas (5173 y 5174) sin conflicto de origen en OneSignal.
const APP_ID: string = (() => {
  if (import.meta.env.DEV) {
    const port = window.location.port;
    // Sin puerto explícito → acceso vía túnel (ngrok, cloudflare, etc.)
    if (!port) return import.meta.env.VITE_ONESIGNAL_APP_ID_NGROK as string;
    if (port === "5174") return import.meta.env.VITE_ONESIGNAL_APP_ID_5174 as string;
    return import.meta.env.VITE_ONESIGNAL_APP_ID_5173 as string;
  }
  return import.meta.env.VITE_ONESIGNAL_APP_ID as string;
})();

// En dev (localhost o túnel) se guarda el appId activo en profiles.onesignal_app_id
// para que el servidor sepa a qué app enviar la notificación durante pruebas locales.
// En producción no se usa: solo existe una app y el servidor ya conoce su ID.
const activeOneSignalAppId: string | undefined =
  import.meta.env.DEV ? APP_ID : undefined;
// En desarrollo, OneSignal solo se inicializa si VITE_ONESIGNAL_ENABLED=true.
// Esto evita errores de dominio al correr en localhost con puerto variable.
// En producción siempre está habilitado (import.meta.env.DEV === false).
const ENABLED =
  !import.meta.env.DEV || import.meta.env.VITE_ONESIGNAL_ENABLED === "true";

/**
 * Promesa única del proceso de inicialización.
 * - null  → todavía no se llamó a initOneSignal()
 * - Promise<void> resuelta  → init OK
 * - Promise<void> rechazada → init falló (dominio no registrado, etc.)
 */
let initPromise: Promise<void> | null = null;

/**
 * Inicializa el SDK de OneSignal. Llamar una sola vez en el arranque de la app.
 * Es idempotente: devuelve la misma promesa si ya fue llamado.
 */
export async function initOneSignal(): Promise<void> {
  if (!APP_ID || !ENABLED) return;
  if (initPromise) return initPromise;

  initPromise = OneSignal.init({
    appId: APP_ID,
    // No mostrar el prompt automáticamente — lo controlamos desde la UI
    promptOptions: {
      slidedown: {
        prompts: [],
      },
    },
    // Permitir localhost como origen seguro en desarrollo
    allowLocalhostAsSecureOrigin: import.meta.env.DEV,
    // serviceWorkerPath eliminado: en SDK v16 no existe esta opción y
    // causaba que el SDK construyera una URL malformada ("http://onesignalsdkworker.js").
    // El SDK v16 busca /OneSignalSDKWorker.js en la raíz automáticamente.
  });

  return initPromise;
}

/**
 * Espera a que el SDK esté listo antes de ejecutar cualquier operación.
 * Devuelve false si el SDK no está disponible o el init falló (ej. dominio
 * no registrado en dev), evitando crashes en lugar de propagarlos.
 */
async function whenReady(): Promise<boolean> {
  if (!APP_ID || !initPromise) return false;
  try {
    await initPromise;
    return true;
  } catch {
    return false;
  }
}

/**
 * Versión pública de whenReady para que hooks externos puedan sincronizar
 * su estado tras el init sin importar el SDK directamente.
 */
export const waitForOneSignal = whenReady;

type SubscriptionChangeHandler = (event: {
  current: { optedIn: boolean; token: string | null | undefined };
}) => void;

/** Registra un listener para cambios en la suscripción push (optIn/optOut). */
export function onPushSubscriptionChange(handler: SubscriptionChangeHandler): void {
  OneSignal.User.PushSubscription.addEventListener("change", handler);
}

/** Elimina un listener registrado con onPushSubscriptionChange. */
export function offPushSubscriptionChange(handler: SubscriptionChangeHandler): void {
  OneSignal.User.PushSubscription.removeEventListener("change", handler);
}

/** Registra un listener para cambios en el permiso del navegador (granted/denied). */
export function onPermissionChange(handler: (granted: boolean) => void): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  OneSignal.Notifications.addEventListener("permissionChange", handler as any);
}

/** Elimina un listener registrado con onPermissionChange. */
export function offPermissionChange(handler: (granted: boolean) => void): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  OneSignal.Notifications.removeEventListener("permissionChange", handler as any);
}

/**
 * Vincula al usuario autenticado de Supabase con su suscripción en OneSignal
 * y guarda el appId activo en su perfil para que el servidor sepa a qué app
 * enviarle notificaciones.
 * @param userId - auth.users.id de Supabase
 */
// Evita loguear en OneSignal en cada TOKEN_REFRESH cuando no cambió nada
let lastLinkedUserId: string | null = null;

export async function setOneSignalUser(userId: string): Promise<void> {
  if (!(await whenReady())) return;
  if (userId === lastLinkedUserId) return;
  await OneSignal.login(userId);
  lastLinkedUserId = userId;

  // Solo en desarrollo: guarda el appId activo en profiles.onesignal_app_id
  // para que el servidor sepa a qué app de prueba enviarle notificaciones.
  // En producción este campo no se usa (el servidor conoce el appId de producción).
  if (import.meta.env.DEV && activeOneSignalAppId) {
    const { error } = await supabase
      .from("profiles")
      .update({ onesignal_app_id: activeOneSignalAppId })
      .eq("user_id", userId);
    if (error) {
      console.error("[OneSignal] Error guardando onesignal_app_id:", error.message);
    }
  }
}

/**
 * Desvincula al usuario al hacer logout.
 * Llamar dentro de applySession cuando la sesión se limpia.
 */
export async function clearOneSignalUser(): Promise<void> {
  if (!(await whenReady())) return;
  await OneSignal.logout();
}

/**
 * Solicita permiso de notificaciones al usuario.
 * Retorna true si el permiso fue concedido.
 */
export async function requestOneSignalPermission(): Promise<boolean> {
  if (!(await whenReady())) return false;
  return OneSignal.Notifications.requestPermission();
}

/**
 * Desactiva las push notifications en este dispositivo sin cerrar sesión.
 * El usuario permanece registrado en OneSignal pero no recibirá notificaciones.
 */
export async function optOutOneSignal(): Promise<void> {
  if (!(await whenReady())) return;
  await OneSignal.User.PushSubscription.optOut();
}

/**
 * Reactiva las push notifications después de un optOut.
 */
export async function optInOneSignal(): Promise<void> {
  if (!(await whenReady())) return;
  await OneSignal.User.PushSubscription.optIn();
}

/**
 * Verifica si el usuario actual tiene notificaciones activadas en este dispositivo.
 */
export function isOneSignalSubscribed(): boolean {
  // initPromise puede no estar listo aún — si el SDK no inicializó, optedIn es undefined
  return OneSignal.User?.PushSubscription?.optedIn ?? false;
}

/**
 * Obtiene el estado actual del permiso de notificaciones del navegador.
 */
export function getNotificationPermission(): NotificationPermission {
  return Notification.permission;
}
