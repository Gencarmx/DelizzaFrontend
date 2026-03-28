import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCustomerNotifications } from "@presentation/logic/useCustomerNotifications";
import { supabase } from "@core/supabase/client";

// ── Mocks de módulos ─────────────────────────────────────────────────────────

vi.mock("@core/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "auth-uid-test" } }),
}));

vi.mock("@core/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
    channel: vi.fn(),
    removeChannel: vi.fn().mockResolvedValue(undefined),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Configura el mock de la cadena de profiles para devolver un profileId fijo. */
function setupProfilesMock() {
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "profile-test-123" },
          error: null,
        }),
      }),
    }),
  } as any);
}

/**
 * Crea un mock del canal de Supabase que:
 *   1. Captura el callback de broadcast para poder dispararlo manualmente
 *   2. Llama automáticamente al callback de subscribe con SUBSCRIBED
 */
function setupChannelMock() {
  let capturedBroadcastCb: ((data: { payload: unknown }) => void) | null = null;

  const channelInstance = {
    on: vi.fn().mockImplementation(
      (_type: string, _filter: unknown, cb: (data: { payload: unknown }) => void) => {
        capturedBroadcastCb = cb;
        return channelInstance;
      }
    ),
    subscribe: vi.fn().mockImplementation((cb: (status: string) => void) => {
      // Llamar en el siguiente tick para simular la conexión asíncrona
      Promise.resolve().then(() => cb("SUBSCRIBED"));
      return channelInstance;
    }),
  };

  vi.mocked(supabase.channel).mockReturnValue(channelInstance as any);
  vi.mocked(supabase.removeChannel).mockResolvedValue(undefined as any);

  return {
    fireBroadcast: (payload: unknown) => capturedBroadcastCb?.({ payload }),
  };
}

/** Configura window.Notification con el permiso indicado. */
function mockNotificationPermission(permission: NotificationPermission) {
  const MockNotification = vi.fn();
  Object.assign(MockNotification, { permission, requestPermission: vi.fn() });
  Object.defineProperty(window, "Notification", {
    value: MockNotification,
    writable: true,
    configurable: true,
  });
}

// ── Suite: requestPermission ─────────────────────────────────────────────────

describe("requestPermission", () => {
  afterEach(() => vi.clearAllMocks());

  it("retorna true y no llama requestPermission cuando ya está concedido", async () => {
    mockNotificationPermission("granted");
    setupProfilesMock();
    setupChannelMock();

    const { result } = renderHook(() => useCustomerNotifications());
    const granted = await act(async () => result.current.requestPermission());

    expect(granted).toBe(true);
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
  });

  it("retorna false y no llama requestPermission cuando está denegado", async () => {
    mockNotificationPermission("denied");
    setupProfilesMock();
    setupChannelMock();

    const { result } = renderHook(() => useCustomerNotifications());
    const granted = await act(async () => result.current.requestPermission());

    expect(granted).toBe(false);
    expect(window.Notification.requestPermission).not.toHaveBeenCalled();
  });

  it("llama a Notification.requestPermission cuando el estado es default", async () => {
    mockNotificationPermission("default");
    const mockRequestPermission = vi.fn().mockResolvedValue("granted");
    (window.Notification as any).requestPermission = mockRequestPermission;

    setupProfilesMock();
    setupChannelMock();

    const { result } = renderHook(() => useCustomerNotifications());
    const granted = await act(async () => result.current.requestPermission());

    expect(mockRequestPermission).toHaveBeenCalledOnce();
    expect(granted).toBe(true);
  });
});

// ── Suite: notificación in-app al recibir broadcast ──────────────────────────

describe("showBrowserNotification — notificación in-app (bug fix)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("llama onInAppNotification cuando permission es 'default'", async () => {
    mockNotificationPermission("default");
    setupProfilesMock();
    const { fireBroadcast } = setupChannelMock();

    const onInAppNotification = vi.fn();
    const { result } = renderHook(() =>
      useCustomerNotifications(undefined, onInAppNotification)
    );

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    await act(async () => {
      fireBroadcast({ id: "order-1", status: "confirmed" });
    });

    expect(onInAppNotification).toHaveBeenCalledWith(
      "¡Tu pedido ha sido actualizado!",
      "Tu pedido está ahora: Confirmado"
    );
  });

  it("llama onInAppNotification cuando permission es 'granted' (regresión del bug)", async () => {
    // Esta es la prueba clave: antes del fix, con permission 'granted' el toast
    // nunca se mostraba porque el código hacía return antes de llamarlo.
    mockNotificationPermission("granted");
    // Mockear el constructor de Notification para que no falle
    (window.Notification as any) = Object.assign(vi.fn(), {
      permission: "granted",
      requestPermission: vi.fn(),
    });
    // Simular serviceWorker no disponible para que use new Notification()
    Object.defineProperty(navigator, "serviceWorker", {
      value: undefined,
      configurable: true,
    });

    setupProfilesMock();
    const { fireBroadcast } = setupChannelMock();

    const onInAppNotification = vi.fn();
    const { result } = renderHook(() =>
      useCustomerNotifications(undefined, onInAppNotification)
    );

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    await act(async () => {
      fireBroadcast({ id: "order-1", status: "preparing" });
    });

    expect(onInAppNotification).toHaveBeenCalledWith(
      "¡Tu pedido ha sido actualizado!",
      "Tu pedido está ahora: Preparando"
    );
  });

  it("llama onOrderUpdate para recargar la pantalla de actividad", async () => {
    mockNotificationPermission("default");
    setupProfilesMock();
    const { fireBroadcast } = setupChannelMock();

    const onOrderUpdate = vi.fn();
    const { result } = renderHook(() =>
      useCustomerNotifications(onOrderUpdate, undefined)
    );

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    await act(async () => {
      fireBroadcast({ id: "order-1", status: "ready" });
    });

    expect(onOrderUpdate).toHaveBeenCalledOnce();
  });

  it("no notifica duplicados del mismo estado para el mismo pedido", async () => {
    mockNotificationPermission("default");
    setupProfilesMock();
    const { fireBroadcast } = setupChannelMock();

    const onInAppNotification = vi.fn();
    const { result } = renderHook(() =>
      useCustomerNotifications(undefined, onInAppNotification)
    );

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    // Mismo pedido y mismo estado disparado dos veces
    await act(async () => {
      fireBroadcast({ id: "order-1", status: "confirmed" });
      fireBroadcast({ id: "order-1", status: "confirmed" });
    });

    // Solo debe notificar una vez
    expect(onInAppNotification).toHaveBeenCalledOnce();
  });
});
