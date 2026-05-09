import OneSignal from "react-onesignal";
import type { PushHealthStatus, PushStatus } from "./types";

const SW_READY_TIMEOUT_MS = 5000;

export function isIOSPWA(): boolean {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  return isIOS && isStandalone;
}

export async function checkPushSubscriptionHealth(): Promise<PushHealthStatus> {
  const isStandalonePWA = window.matchMedia("(display-mode: standalone)").matches;
  const userAgent = navigator.userAgent;

  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return {
      permission: "default",
      hasServiceWorker: false,
      hasPushManager: false,
      hasSubscription: false,
      oneSignalToken: null,
      oneSignalOptedIn: false,
      isStandalonePWA,
      userAgent,
      status: "unsupported",
    };
  }

  const permission = Notification.permission;

  if (permission === "denied") {
    return {
      permission,
      hasServiceWorker: false,
      hasPushManager: false,
      hasSubscription: false,
      oneSignalToken: null,
      oneSignalOptedIn: false,
      isStandalonePWA,
      userAgent,
      status: "permission_denied",
    };
  }

  let hasServiceWorker = false;
  let hasPushManager = false;
  let hasSubscription = false;

  try {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("SW timeout")), SW_READY_TIMEOUT_MS)
      ),
    ]);
    hasServiceWorker = true;
    hasPushManager = "pushManager" in registration;

    if (hasPushManager) {
      const subscription = await registration.pushManager.getSubscription();
      hasSubscription = subscription !== null;
    }
  } catch {
    // Service worker not available or timed out (common on iOS PWA suspension)
  }

  if (!hasServiceWorker) {
    return {
      permission,
      hasServiceWorker: false,
      hasPushManager,
      hasSubscription,
      oneSignalToken: null,
      oneSignalOptedIn: false,
      isStandalonePWA,
      userAgent,
      status: "service_worker_missing",
    };
  }

  const oneSignalOptedIn = OneSignal.User?.PushSubscription?.optedIn ?? false;
  const oneSignalToken = OneSignal.User?.PushSubscription?.token ?? null;

  let status: PushStatus;

  if (permission === "granted" && !hasSubscription) {
    // Case A: permission still granted but the real push subscription was lost
    status = "missing_subscription";
  } else if (hasSubscription && !oneSignalToken) {
    // Case B: browser has an active subscription but OneSignal lost its token
    status = "onesignal_desynced";
  } else if (hasSubscription && oneSignalToken && oneSignalOptedIn) {
    status = "healthy";
  } else {
    // permission is 'default' and no subscription yet — user never opted in
    status = "missing_subscription";
  }

  return {
    permission,
    hasServiceWorker,
    hasPushManager,
    hasSubscription,
    oneSignalToken,
    oneSignalOptedIn,
    isStandalonePWA,
    userAgent,
    status,
  };
}
