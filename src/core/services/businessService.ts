/**
 * Business Service - Gestión de información de restaurantes
 * Proporciona funcionalidades para obtener y gestionar datos de negocios
 */

import { supabase } from "@core/supabase/client";
import type { Database } from "@core/supabase/types";

type Business = Database['public']['Tables']['businesses']['Row'];
type BusinessInsert = Database['public']['Tables']['businesses']['Insert'];
type BusinessUpdate = Database['public']['Tables']['businesses']['Update'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export interface BusinessWithProfile extends Business {
  profile?: Profile;
}

export interface BusinessFilters {
  active?: boolean;
  search?: string;
}

/**
 * Obtiene el restaurante de un propietario específico
 * Nota: ownerId debe ser el auth.uid() del usuario (no el profile.id)
 */
export async function getBusinessByOwner(userId: string): Promise<Business | null> {
  try {
    // Primero obtenemos el perfil del usuario para encontrar su profile.id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') return null; // Usuario no tiene perfil
      throw profileError;
    }

    if (!profile) {
      return null;
    }

    // Ahora buscamos el business usando el profile.id
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', profile.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error obteniendo restaurante:', error);
    throw new Error('No se pudo obtener el restaurante');
  }
}

/**
 * Obtiene un restaurante por ID con información del perfil
 */
export async function getBusinessById(businessId: string): Promise<BusinessWithProfile | null> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select(`
        *,
        profiles:owner_id (
          id,
          full_name,
          phone_number
        )
      `)
      .eq('id', businessId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      throw error;
    }

    return data as BusinessWithProfile;
  } catch (error) {
    console.error('Error obteniendo restaurante por ID:', error);
    throw new Error('No se pudo obtener el restaurante');
  }
}

/**
 * Obtiene todos los restaurantes con filtros opcionales
 */
export async function getBusinesses(filters?: BusinessFilters): Promise<Business[]> {
  try {
    let query = supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (filters?.active !== undefined) {
      query = query.eq('active', filters.active);
    }

    if (filters?.search) {
      // Escapar caracteres especiales de la sintaxis de filtros PostgREST antes
      // de interpolar en la cadena or(). Los caracteres "(", ")", "," tienen
      // significado especial en el lenguaje de filtros y podrían romper la query
      // o producir resultados inesperados si el usuario los incluye en su búsqueda.
      const sanitizedTerm = filters.search
        .trim()
        .replace(/[(),\\]/g, "\\$&"); // escapar caracteres especiales PostgREST
      query = query.or(
        `name.ilike.%${sanitizedTerm}%,address.ilike.%${sanitizedTerm}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error obteniendo restaurantes:', error);
    throw new Error('No se pudieron obtener los restaurantes');
  }
}

/**
 * Crea un nuevo restaurante
 */
export async function createBusiness(businessData: {
  name: string;
  owner_id: string;
  address?: string;
  logo_url?: string;
}): Promise<Business> {
  try {
    // Validar datos requeridos
    if (!businessData.name?.trim()) {
      throw new Error('El nombre del restaurante es requerido');
    }

    if (!businessData.owner_id) {
      throw new Error('El ID del propietario es requerido');
    }

    const insertData: BusinessInsert = {
      name: businessData.name.trim(),
      owner_id: businessData.owner_id,
      address: businessData.address?.trim(),
      logo_url: businessData.logo_url,
      active: true,
    };

    const { data, error } = await supabase
      .from('businesses')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creando restaurante:', error);
    throw error instanceof Error ? error : new Error('Error desconocido al crear restaurante');
  }
}

/**
 * Actualiza información de un restaurante
 */
export async function updateBusiness(
  businessId: string,
  updates: Partial<{
    name: string;
    address: string;
    logo_url: string;
    active: boolean;
  }>
): Promise<Business> {
  try {
    // Validar que al menos un campo se esté actualizando
    if (Object.keys(updates).length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    // Validaciones específicas
    if (updates.name !== undefined && !updates.name.trim()) {
      throw new Error('El nombre del restaurante no puede estar vacío');
    }

    const updateData: BusinessUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('businesses')
      .update(updateData)
      .eq('id', businessId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error actualizando restaurante:', error);
    throw error instanceof Error ? error : new Error('Error desconocido al actualizar restaurante');
  }
}

/**
 * Obtiene el estado de pausa (hibernación) de un restaurante.
 * Retorna null si el negocio no existe o hay un error.
 */
export async function getBusinessPausedState(businessId: string): Promise<boolean | null> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('is_paused')
      .eq('id', businessId)
      .single();

    if (error) throw error;
    return data?.is_paused ?? false;
  } catch (error) {
    console.error('Error obteniendo estado de pausa:', error);
    return null;
  }
}

/**
 * Activa o desactiva el modo hibernación del restaurante.
 * En modo pausa, el restaurante sigue visible para clientes pero no acepta pedidos.
 * @param businessId - ID del restaurante
 * @param paused - true para activar pausa, false para desactivar
 */
export async function setBusinessPaused(
  businessId: string,
  paused: boolean
): Promise<Business> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .update({
        is_paused: paused,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error cambiando modo pausa del restaurante:', error);
    throw error instanceof Error
      ? error
      : new Error('Error desconocido al cambiar modo pausa');
  }
}

/**
 * Activa/desactiva un restaurante
 */
export async function toggleBusinessStatus(businessId: string): Promise<Business> {
  try {
    // Obtener el estado actual
    const business = await getBusinessById(businessId);
    if (!business) {
      throw new Error('Restaurante no encontrado');
    }

    const newStatus = !business.active;

    const { data, error } = await supabase
      .from('businesses')
      .update({
        active: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error cambiando estado del restaurante:', error);
    throw error instanceof Error ? error : new Error('Error desconocido al cambiar estado del restaurante');
  }
}

/**
 * Sube una imagen de logo para un negocio a Supabase Storage
 */
export async function uploadBusinessLogo(
  businessId: string,
  file: File
): Promise<string> {
  try {
    // Derivar extensión del nombre del archivo; si no tiene punto, usar el MIME type
    // como fallback para evitar paths corruptos como "uuid/logo.undefined"
    const extFromName = file.name.includes('.') ? file.name.split('.').pop() : undefined;
    const extFromMime = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const fileExt = extFromName ?? extFromMime;
    const fileName = `${businessId}/logo.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('business-logos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('business-logos')
      .getPublicUrl(fileName);

    if (!urlData.publicUrl) {
      throw new Error('No se pudo obtener la URL del logo');
    }

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error subiendo logo:', error);
    throw error instanceof Error ? error : new Error('Error desconocido al subir logo');
  }
}

/**
 * Elimina el logo de un negocio de Supabase Storage
 */
export async function deleteBusinessLogo(logoUrl: string): Promise<void> {
  try {
    const fileName = logoUrl.split('/business-logos/')[1];
    if (!fileName) return;

    const { error } = await supabase.storage
      .from('business-logos')
      .remove([fileName]);

    if (error) throw error;

  } catch (error) {
    console.error('Error eliminando logo:', error);
  }
}

/**
 * Obtiene estadísticas generales de restaurantes
 */
export async function getBusinessStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('active');

    if (error) throw error;

    const total = data.length;
    const active = data.filter(b => b.active).length;
    const inactive = total - active;

    return { total, active, inactive };
  } catch (error) {
    console.error('Error obteniendo estadísticas de restaurantes:', error);
    throw new Error('No se pudieron obtener las estadísticas');
  }
}

/**
 * Verifica si un usuario puede gestionar un restaurante.
 *
 * @param authUserId - El auth.users.id del usuario (NO el profiles.id).
 *   La función resuelve internamente el profileId correspondiente para
 *   comparar con businesses.owner_id, evitando confusión entre los dos
 *   tipos de UUID que coexisten en el schema.
 * @param businessId - El ID del negocio a verificar.
 */
export async function canUserManageBusiness(
  authUserId: string,
  businessId: string
): Promise<boolean> {
  try {
    // Paso 1: resolver el profileId a partir del authUserId.
    // businesses.owner_id referencia profiles.id, no auth.users.id.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', authUserId)
      .maybeSingle();

    if (profileError || !profile) return false;

    // Paso 2: verificar que el negocio pertenece a ese perfil.
    const { data, error } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .eq('owner_id', profile.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return false; // No encontrado
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error verificando permisos:', error);
    return false;
  }
}
