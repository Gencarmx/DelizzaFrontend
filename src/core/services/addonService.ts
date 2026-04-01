/**
 * addonService.ts
 * Gestión de extras/adiciones para productos.
 * - Lectura pública: clientes ven addons activos (lazy al abrir el modal)
 * - Escritura: solo restaurantes autenticados (RLS en Supabase)
 */

import { supabase } from "@core/supabase/client";
import type { ProductAddon, AddonGroup, SelectedAddon } from "@core/supabase/types";

// ─── Lectura ──────────────────────────────────────────────────────────────────

/**
 * Obtiene addons activos agrupados por categoría.
 * Usa la función RPC para una sola roundtrip (modal de cliente).
 */
export async function getAddonsGrouped(productId: string): Promise<AddonGroup[]> {
  const { data, error } = await supabase
    .rpc('get_product_addons_grouped', { p_product_id: productId });

  if (error) throw error;
  return (data as AddonGroup[]) ?? [];
}

/**
 * Obtiene todos los addons de un producto (activos e inactivos).
 * Para el formulario de administración del restaurante.
 */
export async function getAddonsByProductId(productId: string): Promise<ProductAddon[]> {
  const { data, error } = await supabase
    .from('product_addons')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Obtiene addons activos de múltiples productos en una sola roundtrip.
 * Útil para listas de productos que muestran badge de "personalizable".
 */
export async function getAddonsByProductIds(
  productIds: string[]
): Promise<Record<string, ProductAddon[]>> {
  if (productIds.length === 0) return {};

  const { data, error } = await supabase
    .rpc('get_products_addons', { p_product_ids: productIds });

  if (error) throw error;

  return ((data ?? []) as { product_id: string; addons: ProductAddon[] }[]).reduce(
    (acc, row) => {
      acc[row.product_id] = row.addons;
      return acc;
    },
    {} as Record<string, ProductAddon[]>
  );
}

// ─── Escritura (restaurante) ──────────────────────────────────────────────────

/**
 * Reemplaza todos los addons de un producto en una operación.
 * Usado al guardar el formulario de extras del admin.
 * El trigger sync_product_has_addons actualiza products.has_addons automáticamente.
 */
export async function upsertProductAddons(
  productId: string,
  addons: Omit<ProductAddon, 'id' | 'product_id' | 'created_at' | 'updated_at'>[]
): Promise<void> {
  const { error } = await supabase.rpc('upsert_product_addons', {
    p_product_id: productId,
    p_addons: addons.map((a, index) => ({
      category_name: a.category_name,
      name:          a.name,
      price:         a.price,
      max_quantity:  a.max_quantity,
      sort_order:    index,
      active:        a.active,
    })),
  });

  if (error) throw error;
}

// ─── Helpers para el carrito ──────────────────────────────────────────────────

/**
 * Calcula el total de extras seleccionados por unidad de producto.
 */
export function calculateAddonsTotal(addons: SelectedAddon[]): number {
  return addons.reduce((sum, a) => sum + a.price * a.quantity, 0);
}

/**
 * Genera el ID de carrito para un producto.
 * - Sin addons: retorna el productId directamente.
 * - Con addons: genera un ID compuesto único por combinación de extras.
 */
export function buildCartItemId(productId: string, addons: SelectedAddon[]): string {
  const active = addons.filter(a => a.quantity > 0);
  if (active.length === 0) return productId;
  const sig = [...active]
    .map(a => `${a.addon_id}:${a.quantity}`)
    .sort()
    .join('|');
  return `${productId}_${sig}`;
}

/**
 * Formatea los extras seleccionados para persistir en order_items.addons.
 */
export function formatAddonsForOrder(
  addons: SelectedAddon[]
): Array<{ name: string; price: number; quantity: number }> {
  return addons
    .filter(a => a.quantity > 0)
    .map(a => ({ name: a.name, price: a.price, quantity: a.quantity }));
}
