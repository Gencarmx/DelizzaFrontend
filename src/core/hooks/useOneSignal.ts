// Re-export desde el contexto compartido.
// El estado de OneSignal vive en OneSignalProvider (montado en main.tsx),
// lo que garantiza que todos los componentes lean el mismo estado.
export { useOneSignal } from "@core/context/OneSignalContext";
export type { NotificationStatus, } from "@core/context/OneSignalContext";
