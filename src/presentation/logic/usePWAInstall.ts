import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "pwa-android-install-dismissed";

export function usePWAInstall() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(
    () => !!sessionStorage.getItem(STORAGE_KEY)
  );

  useEffect(() => {
    if (isDismissed) return;

    // Leer el evento capturado globalmente antes de que React montara
    if (window.__pwaInstallPrompt) {
      setPromptEvent(window.__pwaInstallPrompt as BeforeInstallPromptEvent);
    }

    // También escuchar si llega después del montaje
    const handler = (e: Event) => {
      e.preventDefault();
      window.__pwaInstallPrompt = e;
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isDismissed]);

  async function triggerInstall() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    window.__pwaInstallPrompt = null;
    if (outcome === "accepted") {
      setPromptEvent(null);
    } else {
      dismiss();
    }
  }

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setIsDismissed(true);
    setPromptEvent(null);
    window.__pwaInstallPrompt = null;
  }

  const canInstall = !!promptEvent && !isDismissed;

  return { canInstall, triggerInstall, dismiss };
}
