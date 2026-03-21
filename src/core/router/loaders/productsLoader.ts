import { supabase } from "@core/supabase/client";

// Tipo para los datos del loader - productos con información del restaurante
export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  business_id: string;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  businesses?: {
    name: string;
    address: string | null;
    logo_url: string | null;
  };
}

// Loader function - obtiene productos de la base de datos
export async function productsLoader(): Promise<Product[]> {
  try {
    // Obtener la sesión del usuario actual con timeout de 3 segundos
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Session fetch timeout')), 3000)
    );
    
    const { data: { session }, error: sessionError } = await Promise.race([
      sessionPromise,
      timeoutPromise
    ]) as any;


    if (sessionError) {
      console.error('Error obteniendo sesión:', sessionError);
      // Si hay error de sesión, mostrar todos los productos activos
      return await getAllActiveProducts();
    }

    const user = session?.user;

    if (!user) {
      // Usuario no autenticado - mostrar todos los productos activos
      return await getAllActiveProducts();
    }

    // Usuario autenticado - verificar si es colaborador (owner/seller) de algún negocio
    const businessIds = await getUserBusinessIds(user.id);

    if (businessIds.length > 0) {
      // Usuario es colaborador - mostrar productos de sus negocios (activos e inactivos)
      return await getCollaboratorProducts(businessIds);
    } else {
      // Usuario no es colaborador - mostrar todos los productos activos (cliente)
      return await getAllActiveProducts();
    }

  } catch (error) {
    console.error('Error en productsLoader:', error);
    // En caso de error general, mostrar productos vacíos para evitar crashes
    return [];
  }
}

// Función para obtener los business_ids donde el usuario es colaborador activo
async function getUserBusinessIds(userId: string): Promise<string[]> {
  try {
    // Primero obtener el profile.id del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('Error obteniendo perfil del usuario:', profileError);
      return [];
    }

    // Obtener los business_ids donde el usuario es colaborador activo con rol owner o seller
    const { data: collaborators, error: collabError } = await supabase
      .from('collaborators')
      .select('business_id')
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .in('role', ['owner', 'seller']);

    if (collabError) {
      console.error('Error obteniendo colaboradores:', collabError);
      return [];
    }

    return (collaborators || []).map(c => c.business_id).filter(Boolean) as string[];
  } catch (error) {
    console.error('Error en getUserBusinessIds:', error);
    return [];
  }
}

// Función para obtener todos los productos activos (para clientes y usuarios no autenticados)
async function getAllActiveProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        businesses: business_id (
          name,
          address,
          logo_url,
          active
        )
      `)
      .eq('active', true)
      .eq('businesses.active', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error obteniendo productos activos:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error en getAllActiveProducts:', error);
    return [];
  }
}

// Función para obtener productos de los negocios donde el usuario es colaborador
async function getCollaboratorProducts(businessIds: string[]): Promise<Product[]> {
  try {
    // Obtener productos de todos los negocios donde el usuario es colaborador
    // Incluye productos activos e inactivos (como permiten las políticas RLS)
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        businesses: business_id (
          name,
          address,
          logo_url
        )
      `)
      .in('business_id', businessIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo productos del colaborador:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error en getCollaboratorProducts:', error);
    return [];
  }
}
