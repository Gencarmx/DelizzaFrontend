/**
 * Product Service - Gestión completa de productos para restaurantes
 * Proporciona funcionalidades CRUD para productos con imágenes
 */

import { supabase } from "@core/supabase/client";
import type { Database } from "@core/supabase/types";

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

export interface ProductData {
  name: string;
  description?: string;
  price: number;
  business_id: string;
  image_url?: string;
  active?: boolean;
  stock?: number;
}

export interface ProductFilters {
  business_id?: string;
  active?: boolean;
  category?: string;
  search?: string;
}

/**
 * Obtiene todos los productos de un restaurante
 */
export async function getProductsByBusiness(
  businessId: string,
  filters?: ProductFilters
): Promise<Product[]> {
  try {
    let query = supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (filters?.active !== undefined) {
      query = query.eq('active', filters.active);
    }

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    throw new Error('No se pudieron obtener los productos');
  }
}

/**
 * Obtiene un producto específico por ID
 */
export async function getProductById(productId: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    throw new Error('No se pudo obtener el producto');
  }
}

/**
 * Crea un nuevo producto
 */
export async function createProduct(productData: ProductData): Promise<Product> {
  try {
    // Validar datos requeridos
    if (!productData.name?.trim()) {
      throw new Error('El nombre del producto es requerido');
    }

    if (!productData.business_id) {
      throw new Error('El ID del restaurante es requerido');
    }

    if (productData.price <= 0) {
      throw new Error('El precio debe ser mayor a 0');
    }

    const insertData: ProductInsert = {
      name: productData.name.trim(),
      description: productData.description?.trim(),
      price: productData.price,
      business_id: productData.business_id,
      image_url: productData.image_url,
      active: productData.active ?? true,
      stock: productData.stock ?? 0,
    };

    const { data, error } = await supabase
      .from('products')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creando producto:', error);
    throw error instanceof Error ? error : new Error('Error desconocido al crear producto');
  }
}

/**
 * Actualiza un producto existente
 */
export async function updateProduct(
  productId: string,
  updates: Partial<ProductData>
): Promise<Product> {
  try {
    // Validar que al menos un campo se esté actualizando
    if (Object.keys(updates).length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    // Validaciones específicas
    if (updates.name !== undefined && !updates.name.trim()) {
      throw new Error('El nombre del producto no puede estar vacío');
    }

    if (updates.price !== undefined && updates.price <= 0) {
      throw new Error('El precio debe ser mayor a 0');
    }

    const updateData: ProductUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error actualizando producto:', error);
    throw error instanceof Error ? error : new Error('Error desconocido al actualizar producto');
  }
}

/**
 * Elimina un producto (desactivación lógica)
 */
export async function deleteProduct(productId: string): Promise<void> {
  try {
    // Primero verificar que el producto existe
    const existingProduct = await getProductById(productId);
    if (!existingProduct) {
      throw new Error('Producto no encontrado');
    }

    // Desactivar el producto en lugar de eliminarlo
    const { error } = await supabase
      .from('products')
      .update({
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId);

    if (error) throw error;
  } catch (error) {
    console.error('Error eliminando producto:', error);
    throw error instanceof Error ? error : new Error('Error desconocido al eliminar producto');
  }
}

/**
 * Activa/desactiva un producto
 */
export async function toggleProductStatus(productId: string): Promise<Product> {
  try {
    // Obtener el estado actual
    const product = await getProductById(productId);
    if (!product) {
      throw new Error('Producto no encontrado');
    }

    const newStatus = !product.active;

    const { data, error } = await supabase
      .from('products')
      .update({
        active: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error cambiando estado del producto:', error);
    throw error instanceof Error ? error : new Error('Error desconocido al cambiar estado del producto');
  }
}

/**
 * Sube una imagen de producto a Supabase Storage
 */
export async function uploadProductImage(
  file: File,
  businessId: string,
  productId?: string
): Promise<string> {
  try {
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen');
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('La imagen no puede ser mayor a 5MB');
    }

    // Generar nombre único para el archivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${businessId}/${productId || 'temp'}_${Date.now()}.${fileExt}`;

    // Subir archivo a Supabase Storage
    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Obtener URL pública del archivo
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    if (!urlData.publicUrl) {
      throw new Error('No se pudo obtener la URL de la imagen');
    }

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error subiendo imagen:', error);
    throw error instanceof Error ? error : new Error('Error desconocido al subir imagen');
  }
}

/**
 * Elimina una imagen de producto de Supabase Storage
 */
export async function deleteProductImage(imageUrl: string): Promise<void> {
  try {
    // Extraer el path del archivo de la URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts.slice(-2).join('/'); // businessId/filename

    const { error } = await supabase.storage
      .from('product-images')
      .remove([fileName]);

    if (error) throw error;

    console.log('Imagen eliminada exitosamente:', fileName);
  } catch (error) {
    console.error('Error eliminando imagen:', error);
    // No lanzamos error si falla la eliminación de imagen
  }
}

/**
 * Obtiene estadísticas de productos de un restaurante
 */
export async function getProductStats(businessId: string): Promise<{
  total: number;
  active: number;
  inactive: number;
}> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('active')
      .eq('business_id', businessId);

    if (error) throw error;

    const total = data.length;
    const active = data.filter(p => p.active).length;
    const inactive = total - active;

    return { total, active, inactive };
  } catch (error) {
    console.error('Error obteniendo estadísticas de productos:', error);
    throw new Error('No se pudieron obtener las estadísticas');
  }
}
