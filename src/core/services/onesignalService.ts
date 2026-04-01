import OneSignal from 'react-onesignal';

let initialized = false;

export async function initOneSignal(): Promise<void> {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  await OneSignal.init({
    appId: import.meta.env.VITE_ONESIGNAL_APP_ID_DEV as string,
    safari_web_id: "web.onesignal.auto.166712e5-2aee-41ea-b95e-8df3d8ab1f28",
    serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js',
    serviceWorkerParam: { scope: '/' },
    promptOptions: {
      slidedown: {
        prompts: [
          {
            type: 'push',
            autoPrompt: true,
            delay: { pageViews: 1, timeDelay: 3 },
          },
        ],
      },
    },
    persistNotification: true,
    allowLocalhostAsSecureOrigin: import.meta.env.DEV as boolean,
  });
}

export default OneSignal;
