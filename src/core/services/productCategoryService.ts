import { supabase } from "@core/supabase/client";

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
 * Obtiene todas las categorías de productos activas ordenadas por sort_order
 */
export async function getActiveProductCategories(): Promise<ProductCategory[]> {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error obteniendo categorías de productos:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error en getActiveProductCategories:', error);
    return [];
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
