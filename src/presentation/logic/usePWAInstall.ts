import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone: boolean }).standalone ===
      true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function usePWAInstall() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

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
    setIsDismissed(true);
    setPromptEvent(null);
    window.__pwaInstallPrompt = null;
  }

  const canInstall = !!promptEvent && !isDismissed && !isInStandaloneMode();

  return { canInstall, triggerInstall, dismiss };
}
