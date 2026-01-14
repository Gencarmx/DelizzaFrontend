import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Usar valores por defecto si no están configuradas las variables de entorno
// Esto permite que la app funcione durante el desarrollo sin Supabase
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Advertencia: Variables de entorno de Supabase no configuradas.\n" +
    "La aplicación funcionará pero las funciones de autenticación no estarán disponibles.\n" +
    "Crea un archivo .env en la raíz del proyecto con:\n" +
    "VITE_SUPABASE_URL=tu_url_de_supabase\n" +
    "VITE_SUPABASE_ANON_KEY=tu_clave_anonima"
  );
}

// Crear cliente con valores por defecto si no están configurados
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

export default supabase;
