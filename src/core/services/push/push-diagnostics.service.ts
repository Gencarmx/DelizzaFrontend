import {
  onPermissionChange,
  offPermissionChange,
  onPushSubscriptionChange,
  offPushSubscriptionChange,
} from "../oneSignalService";

type DiagnosticsCallback = () => void;

const callbacks = new Set<DiagnosticsCallback>();
let active = false;

const handleSubscription = (_event: {
  current: { optedIn: boolean; token: string | null | undefined };
}) => {
  callbacks.forEach((cb) => cb());
};

const handlePermission = (_granted: boolean) => {
  callbacks.forEach((cb) => cb());
};

/**
 * Starts module-level singleton listeners for push state changes.
 * Safe to call multiple times — guards against duplicate registration.
 * Must be stopped via stopDiagnosticsListeners() to avoid memory leaks.
 */
export function startDiagnosticsListeners(): void {
  if (active) return;
  active = true;
  onPushSubscriptionChange(handleSubscription);
  onPermissionChange(handlePermission);
}

/**
 * Removes the module-level listeners registered by startDiagnosticsListeners().
 */
export function stopDiagnosticsListeners(): void {
  if (!active) return;
  active = false;
  offPushSubscriptionChange(handleSubscription);
  offPermissionChange(handlePermission);
}

/**
 * Subscribes to any push state change (permission or subscription).
 * Returns an unsubscribe function for cleanup.
 */
export function subscribeToPushChanges(callback: DiagnosticsCallback): () => void {
  callbacks.add(callback);
  return () => callbacks.delete(callback);
}
