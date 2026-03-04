/**
 * cartService.ts
 *
 * Servicio de persistencia del carrito en Supabase.
 * carts.user_id → auth.users.id directamente.
 */

import { supabase } from "@core/supabase/client";
import type { CartItem } from "@core/context/CartContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
 * @param authUserId - auth.users.id del usuario autenticado
 * @param items - Array de CartItem a guardar
 */
export async function saveCartToSupabase(
  authUserId: string,
  items: CartItem[],
): Promise<void> {
  const { error } = await supabase.from("carts").upsert(
    {
      user_id: authUserId,
      items: items as unknown as Record<string, unknown>[],
      updated_at: new Date().toISOString(),
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
 * El callback es llamado ante cualquier cambio; useCartSync recarga
 * la fila completa desde Supabase para garantizar datos correctos.
 *
 * @param authUserId - auth.users.id del usuario autenticado
 * @param onChange   - Callback llamado cuando hay algún cambio
 * @returns Función para cancelar la suscripción
 */
export function subscribeToCartChanges(
  authUserId: string,
  onChange: () => void,
): () => void {
  let channel: RealtimeChannel;

  channel = supabase
    .channel(`cart-${authUserId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "carts",
        filter: `user_id=eq.${authUserId}`,
      },
      (_payload) => {
        console.log("[cartService] Realtime evento:", _payload.eventType);
        onChange();
      },
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        console.log("[cartService] Realtime suscrito para user:", authUserId);
      }
      if (status === "CHANNEL_ERROR") {
        console.error("[cartService] Error en canal Realtime:", err);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
