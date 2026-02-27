import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "pwa-android-install-dismissed";

export function usePWAInstall() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) {
      setIsDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function triggerInstall() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") {
      setPromptEvent(null);
    } else {
      dismiss();
    }
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setIsDismissed(true);
    setPromptEvent(null);
  }

  const canInstall = !!promptEvent && !isDismissed;

  return { canInstall, triggerInstall, dismiss };
}
