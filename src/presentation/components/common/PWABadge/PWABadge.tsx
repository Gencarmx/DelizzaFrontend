import { useRegisterSW } from "virtual:pwa-register/react";

export default function PWABadge() {
  // check for updates every hour
  const period = 60 * 60 * 1000;

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (period <= 0) return;
      if (r?.active?.state === "activated") {
        registerPeriodicSync(period, swUrl, r);
      } else if (r?.installing) {
        r.installing.addEventListener("statechange", (e) => {
          const sw = e.target as ServiceWorker;
          if (sw.state === "activated") registerPeriodicSync(period, swUrl, r);
        });
      }
    },
  });

  function close() {
    setNeedRefresh(false);
  }

  return (
    <div
      className="p-0 m-0 w-0 h-0"
      role="alert"
      aria-labelledby="toast-message"
    >
      {needRefresh && (
        <div className="fixed right-0 bottom-0 m-4 p-3 border border-[#8885] rounded z-10 text-left shadow-[3px_4px_5px_0_#8885] bg-white">
          <div className="mb-2">
            <span id="toast-message">
              New content available, click on reload button to update.
            </span>
          </div>
          <div className="flex">
            <button
              className="border border-[#8885] outline-none mr-1 rounded-sm px-2.5 py-0.5"
              onClick={() => updateServiceWorker(true)}
            >
              Reload
            </button>
            <button
              className="border border-[#8885] outline-none mr-1 rounded-sm px-2.5 py-0.5"
              onClick={() => close()}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * This function will register a periodic sync check every hour, you can modify the interval as needed.
 */
function registerPeriodicSync(
  period: number,
  swUrl: string,
  r: ServiceWorkerRegistration
) {
  if (period <= 0) return;

  setInterval(async () => {
    if ("onLine" in navigator && !navigator.onLine) return;

    const resp = await fetch(swUrl, {
      cache: "no-store",
      headers: {
        cache: "no-store",
        "cache-control": "no-cache",
      },
    });

    if (resp?.status === 200) await r.update();
  }, period);
}
