/**
 * pushNotificationService.ts
 * Gestión de Web Push Notifications.
 * - Solicita permisos al usuario
 * - Crea/obtiene la suscripción push del navegador
 * - Persiste la suscripción en Supabase para el usuario autenticado
 */

import { supabase } from "@core/supabase/client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

/**
 * Convierte una VAPID public key en base64url a Uint8Array.
 * Requerido por la Web Push API.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Verifica si el navegador soporta Web Push.
 */
export function isPushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Solicita permiso de notificaciones al usuario.
 * Retorna true si fue concedido.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Obtiene la suscripción push activa o crea una nueva.
 * Requiere que el Service Worker esté registrado y que tengamos permiso.
 */
export async function getOrCreatePushSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

  const registration = await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  });
}

/**
 * Guarda la suscripción en Supabase para el usuario autenticado.
 */
export async function savePushSubscription(
  subscription: PushSubscription
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const json = subscription.toJSON();
  const { endpoint, keys } = json;

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      profile_id: profile?.id ?? null,
      endpoint: endpoint!,
      p256dh: keys!["p256dh"],
      auth: keys!["auth"],
      user_agent: navigator.userAgent,
    },
    { onConflict: "endpoint" }
  );

  if (error) throw error;
}

/**
 * Elimina la suscripción push del navegador y de Supabase.
 */
export async function removePushSubscription(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);
  }
}

/**
 * Activa las push notifications: pide permiso, crea suscripción y la guarda.
 * Función principal a llamar desde la UI.
 */
export async function enablePushNotifications(): Promise<{
  success: boolean;
  reason?: "unsupported" | "denied" | "error";
}> {
  if (!isPushSupported()) {
    return { success: false, reason: "unsupported" };
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    return { success: false, reason: "denied" };
  }

  try {
    const subscription = await getOrCreatePushSubscription();
    if (!subscription) return { success: false, reason: "error" };

    await savePushSubscription(subscription);
    return { success: true };
  } catch {
    return { success: false, reason: "error" };
  }
}
