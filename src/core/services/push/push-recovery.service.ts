import OneSignal from "react-onesignal";
import { checkPushSubscriptionHealth } from "./push-health.service";

const MAX_ATTEMPTS = 3;
const MIN_INTERVAL_MS = 30_000;
const POST_OPTIN_WAIT_MS = 1200;

let isRecovering = false;
let attemptCount = 0;
let lastAttemptAt = 0;

/**
 * Attempts a silent automatic recovery of the push subscription without
 * requiring any user interaction.
 *
 * Handles Case A (permission granted, subscription lost) by forcing optIn.
 * Does NOT handle Case B (desynced token) — that requires re-login with
 * the userId, which is triggered by the user clicking EnableNotificationsButton.
 *
 * Returns true if the push subscription is healthy after the attempt.
 */
export async function attemptAutoRecovery(): Promise<boolean> {
  if (isRecovering) return false;

  const now = Date.now();
  if (now - lastAttemptAt < MIN_INTERVAL_MS) return false;
  if (attemptCount >= MAX_ATTEMPTS) return false;

  isRecovering = true;
  lastAttemptAt = now;
  attemptCount++;

  try {
    if (Notification.permission === "granted") {
      try {
        await OneSignal.User.PushSubscription.optIn();
      } catch {
        // optIn can fail if the SW is suspended — not fatal
      }

      await new Promise((r) => setTimeout(r, POST_OPTIN_WAIT_MS));
    }

    const health = await checkPushSubscriptionHealth();

    if (health.status === "healthy") {
      attemptCount = 0;
      return true;
    }

    return false;
  } finally {
    isRecovering = false;
  }
}

/** Resets all throttling state. Useful for testing or after a successful manual recovery. */
export function resetRecoveryState(): void {
  isRecovering = false;
  attemptCount = 0;
  lastAttemptAt = 0;
}
