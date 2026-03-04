/**
 * useCartSync.ts
 *
 * Hook que sincroniza el carrito con Supabase.
 * carts.user_id → auth.users.id directamente.
 *
 * - Login: carga desde Supabase (prioridad sobre localStorage)
 * - Cambio local: upsert con debounce de 800ms
 * - Realtime: recarga la fila completa al detectar cambios de otro dispositivo
 * - Logout: cancela suscripción y limpia localStorage
 */

import { useEffect, useRef } from "react";
import type { CartItem } from "@core/context/CartContext";
import {
  loadCartFromSupabase,
  saveCartToSupabase,
  subscribeToCartChanges,
} from "@core/services/cartService";

interface UseCartSyncOptions {
  authUserId: string | null;
  items: CartItem[];
  setItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const DEBOUNCE_MS = 800;
const CART_LOCAL_KEY = "cart";

export function useCartSync({
  authUserId,
  items,
  setItems,
  setIsLoading,
}: UseCartSyncOptions): void {
  // Ref para evitar stale closure en el debounce
  const itemsRef = useRef<CartItem[]>(items);
  itemsRef.current = items;

  // Flag para evitar re-sync cuando el cambio viene de Realtime/Supabase
  const isRemoteUpdateRef = useRef(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ── Login / Logout ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authUserId) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      localStorage.removeItem(CART_LOCAL_KEY);
      return;
    }

    let cancelled = false;

    const init = async () => {
      setIsLoading(true);
      console.log("[CartSync] Iniciando sync para user:", authUserId);

      // 1. Cargar desde Supabase
      const remoteItems = await loadCartFromSupabase(authUserId);
      if (cancelled) return;

      if (remoteItems !== null) {
        console.log(
          "[CartSync] Cargado desde Supabase:",
          remoteItems.length,
          "items",
        );
        isRemoteUpdateRef.current = true;
        setItems(remoteItems);
        localStorage.setItem(CART_LOCAL_KEY, JSON.stringify(remoteItems));
      }

      setIsLoading(false);

      // 2. Suscribir a Realtime — recarga la fila completa en cada evento
      if (unsubscribeRef.current) unsubscribeRef.current();

      unsubscribeRef.current = subscribeToCartChanges(authUserId, async () => {
        if (cancelled) return;
        console.log("[CartSync] Realtime: recargando desde Supabase...");
        const updated = await loadCartFromSupabase(authUserId);
        if (cancelled || updated === null) return;
        isRemoteUpdateRef.current = true;
        setItems(updated);
        localStorage.setItem(CART_LOCAL_KEY, JSON.stringify(updated));
      });
    };

    init();

    return () => {
      cancelled = true;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [authUserId, setItems, setIsLoading]);

  // ── Guardar en Supabase al cambiar items localmente (con debounce) ──────────
  useEffect(() => {
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    if (!authUserId) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      console.log(
        "[CartSync] Guardando en Supabase:",
        itemsRef.current.length,
        "items",
      );
      saveCartToSupabase(authUserId, itemsRef.current);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [items, authUserId]);
}
