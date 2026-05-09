export type PushStatus =
  | 'healthy'
  | 'missing_subscription'
  | 'permission_denied'
  | 'onesignal_desynced'
  | 'unsupported'
  | 'service_worker_missing';

export interface PushHealthStatus {
  permission: NotificationPermission;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasSubscription: boolean;
  oneSignalToken: string | null;
  oneSignalOptedIn: boolean;
  isStandalonePWA: boolean;
  userAgent: string;
  status: PushStatus;
}
