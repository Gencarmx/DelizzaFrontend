/**
 * cartService.ts
 *
 * Servicio de persistencia del carrito en Supabase.
 * carts.user_id → auth.users.id directamente.
 */

import { supabase } from "@core/supabase/client";
import type { CartItem } from "@core/context/CartContext";

// ─── CRUD ────────────────────────────────────────────────────────────────────

/**
 * Carga los items del carrito desde Supabase.
 * @param authUserId - auth.users.id del usuario autenticado
 */
export async function loadCartFromSupabase(
  authUserId: string,
): Promise<CartItem[] | null> {
  const { data, error } = await supabase
    .from("carts")
    .select("items")
    .eq("user_id", authUserId)
    .maybeSingle();

  if (error) {
    console.error("[cartService] Error cargando carrito:", error.message);
    return null;
  }

  if (!data) return [];

  return (data.items as CartItem[]) ?? [];
}

/**
 * Guarda (upsert) los items del carrito en Supabase.
 * Incluye un `client_token` único por sesión para que el listener Realtime
 * pueda ignorar el evento generado por esta misma escritura y evitar el loop:
 *   guardada local → evento Realtime → recarga → nueva guardada → ...
 *
 * @param authUserId  - auth.users.id del usuario autenticado
 * @param items       - Array de CartItem a guardar
 * @param clientToken - Token de sesión del cliente que realizó la escritura
 */
export async function saveCartToSupabase(
  authUserId: string,
  items: CartItem[],
  clientToken?: string,
): Promise<void> {
  const { error } = await supabase.from("carts").upsert(
    {
      user_id: authUserId,
      items: items as unknown as Record<string, unknown>[],
      updated_at: new Date().toISOString(),
      ...(clientToken ? { client_token: clientToken } : {}),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[cartService] Error guardando carrito:", error.message);
  }
}

// ─── Realtime ────────────────────────────────────────────────────────────────

/**
 * Suscribe a cambios Realtime en el carrito del usuario.
 * Ignora eventos generados por el propio cliente (mismo `client_token`) para
 * evitar el loop: escritura local → evento Realtime → recarga → escritura...
 *
 * @param authUserId        - auth.users.id del usuario autenticado
 * @param onChange          - Callback llamado cuando hay algún cambio externo
 * @param getClientToken    - Getter del token del cliente actual (puede cambiar)
 * @returns Función para cancelar la suscripción
 */
export function subscribeToCartChanges(
  authUserId: string,
  onChange: () => void,
  getClientToken?: () => string | undefined,
): () => void {
  const channel = supabase
    .channel(`cart-${authUserId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "carts",
        filter: `user_id=eq.${authUserId}`,
      },
      (payload) => {
        // Si el evento incluye el mismo client_token que usamos al guardar,
        // es nuestra propia escritura — ignorarla para evitar loops.
        const eventToken = (payload.new as Record<string, unknown>)?.client_token as string | undefined;
        const ownToken = getClientToken?.();
        if (ownToken && eventToken === ownToken) {
          return;
        }
        onChange();
      },
    )
    .subscribe((status, err) => {
      if (status === "CHANNEL_ERROR") {
        console.error("[cartService] Error en canal Realtime:", err);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
