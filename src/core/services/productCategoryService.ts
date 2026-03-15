import { supabase } from "@core/supabase/client";

/**
 * Caché de módulo para las categorías activas.
 * Las categorías de productos son datos estáticos que rara vez cambian.
 * Almacenar el resultado evita re-consultar Supabase en cada montaje de
 * los componentes Home, ProductAdd y ProductEdit.
 * TTL de 5 minutos para reflejar cambios eventuales sin consultas constantes.
 */
let _categoriesCache: ProductCategory[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export function invalidateCategoriesCache() {
  _categoriesCache = null;
  _cacheTimestamp = 0;
}

export interface ProductCategory {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Obtiene todas las categorías de productos activas ordenadas por sort_order.
 * Utiliza caché de módulo con TTL de 5 minutos para evitar re-consultas en
 * cada montaje de componente (Home, ProductAdd, ProductEdit).
 */
export async function getActiveProductCategories(): Promise<ProductCategory[]> {
  const now = Date.now();
  if (_categoriesCache && now - _cacheTimestamp < CACHE_TTL_MS) {
    return _categoriesCache;
  }

  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error obteniendo categorías de productos:', error);
      return _categoriesCache ?? []; // devolver caché vencida si hay error de red
    }

    _categoriesCache = data || [];
    _cacheTimestamp = now;
    return _categoriesCache;
  } catch (error) {
    console.error('Error en getActiveProductCategories:', error);
    return _categoriesCache ?? [];
  }
}

/**
 * Obtiene una categoría por ID
 */
export async function getProductCategoryById(id: string): Promise<ProductCategory | null> {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('id', id)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo categoría por ID:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error en getProductCategoryById:', error);
    return null;
  }
}

/**
 * Crea una nueva categoría (solo para owners)
 */
export async function createProductCategory(category: Omit<ProductCategory, 'id' | 'created_at' | 'updated_at'>): Promise<ProductCategory | null> {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .insert(category)
      .select()
      .single();

    if (error) {
      console.error('Error creando categoría:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error en createProductCategory:', error);
    return null;
  }
}

/**
 * Actualiza una categoría (solo para owners)
 */
export async function updateProductCategory(id: string, updates: Partial<Omit<ProductCategory, 'id' | 'created_at' | 'updated_at'>>): Promise<ProductCategory | null> {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando categoría:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error en updateProductCategory:', error);
    return null;
  }
}

/**
 * Desactiva una categoría (soft delete - solo para owners)
 */
export async function deactivateProductCategory(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('product_categories')
      .update({ active: false })
      .eq('id', id);

    if (error) {
      console.error('Error desactivando categoría:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en deactivateProductCategory:', error);
    return false;
  }
}
