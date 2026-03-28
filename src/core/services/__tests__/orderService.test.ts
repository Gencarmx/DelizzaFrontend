import { describe, it, expect, vi, beforeEach } from "vitest";
import { canUserManageOrder, updateOrderStatus } from "@core/services/orderService";
import { supabase } from "@core/supabase/client";

// ── Mock de Supabase ─────────────────────────────────────────────────────────

vi.mock("@core/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

// ── Helper: cadena fluida awaitable ─────────────────────────────────────────
//
// Devuelve un Proxy que:
//   - Permite encadenar cualquier método (select, eq, update, …) sin errores
//   - Es awaitable directamente (await chain → result)
//   - .single() y .maybeSingle() también resuelven con result

function createChain(result: { data: unknown; error: unknown }) {
  const resolved = Promise.resolve(result);

  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then") return resolved.then.bind(resolved);
      if (prop === "catch") return resolved.catch.bind(resolved);
      if (prop === "finally") return resolved.finally.bind(resolved);
      if (prop === "single" || prop === "maybeSingle") {
        return () => resolved;
      }
      return () => proxy;
    },
  };

  const proxy = new Proxy({}, handler);
  return proxy;
}

// Pedido simulado devuelto tras un UPDATE exitoso
const mockUpdatedOrder = {
  id: "order-1",
  status: "confirmed",
  customer_id: "customer-profile-1",
  business_id: "biz-1",
  total: 150,
  updated_at: new Date().toISOString(),
};

// Canal de broadcast vacío (no dispara callbacks — no necesitamos probar el broadcast aquí)
const silentChannel = {
  subscribe: vi.fn().mockReturnThis(),
  send: vi.fn().mockResolvedValue("ok"),
};

// ── canUserManageOrder ───────────────────────────────────────────────────────

describe("canUserManageOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna true cuando el perfil es propietario del pedido", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      createChain({ data: { business_id: "biz-1" }, error: null }) as any
    );

    const result = await canUserManageOrder("profile-123", "order-1");
    expect(result).toBe(true);
  });

  it("retorna false cuando el pedido no existe (PGRST116)", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      createChain({ data: null, error: { code: "PGRST116", message: "Not found" } }) as any
    );

    const result = await canUserManageOrder("profile-123", "order-999");
    expect(result).toBe(false);
  });

  it("retorna false ante un error inesperado de base de datos", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      createChain({ data: null, error: { code: "42P01", message: "DB error" } }) as any
    );

    const result = await canUserManageOrder("profile-123", "order-1");
    expect(result).toBe(false);
  });
});

// ── updateOrderStatus ────────────────────────────────────────────────────────

describe("updateOrderStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza error inmediatamente con un estado inválido", async () => {
    await expect(
      updateOrderStatus("order-1", "flying" as any)
    ).rejects.toThrow("Estado de pedido inválido");

    // Supabase no debe haber recibido ninguna llamada
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it("no llama a auth.getUser cuando se proporciona profileId", async () => {
    // Primera llamada a from('orders') → canUserManageOrder (autorizado)
    // Segunda llamada a from('orders') → update exitoso
    let callIndex = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        return createChain({ data: { business_id: "biz-1" }, error: null }) as any;
      }
      return createChain({ data: [mockUpdatedOrder], error: null }) as any;
    });

    vi.mocked(supabase.channel).mockReturnValue(silentChannel as any);
    vi.mocked(supabase.removeChannel).mockResolvedValue(undefined as any);

    await updateOrderStatus("order-1", "confirmed", undefined, "profile-123");

    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it("llama a auth.getUser para resolver el profileId cuando no se proporciona", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: "auth-uid-1" } },
      error: null,
    } as any);

    let callIndex = 0;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "profiles") {
        return createChain({ data: { id: "profile-resolved" }, error: null }) as any;
      }
      callIndex++;
      if (callIndex === 1) {
        // canUserManageOrder
        return createChain({ data: { business_id: "biz-1" }, error: null }) as any;
      }
      // update
      return createChain({ data: [mockUpdatedOrder], error: null }) as any;
    });

    vi.mocked(supabase.channel).mockReturnValue(silentChannel as any);
    vi.mocked(supabase.removeChannel).mockResolvedValue(undefined as any);

    await updateOrderStatus("order-1", "confirmed");

    expect(supabase.auth.getUser).toHaveBeenCalledOnce();
    expect(supabase.from).toHaveBeenCalledWith("profiles");
  });

  it("lanza error cuando el usuario no tiene permisos sobre el pedido", async () => {
    // canUserManageOrder retorna false → no encontrado
    vi.mocked(supabase.from).mockReturnValue(
      createChain({ data: null, error: { code: "PGRST116" } }) as any
    );

    await expect(
      updateOrderStatus("order-1", "confirmed", undefined, "profile-no-access")
    ).rejects.toThrow("No autorizado");
  });
});
