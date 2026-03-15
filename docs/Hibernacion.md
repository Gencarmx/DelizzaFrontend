Propuesta Técnica: Modo Hibernación + Horarios Automáticos
---
1. Base de Datos — SQL para Supabase
Paso 1: Agregar columna is_paused a la tabla businesses
-- Agregar columna de pausa al restaurante
ALTER TABLE public.businesses
ADD COLUMN is_paused boolean NOT NULL DEFAULT false;
-- Comentario descriptivo de la columna
COMMENT ON COLUMN public.businesses.is_paused IS 
'Modo hibernación: cuando es true, el restaurante aparece para los clientes pero 
no acepta nuevos pedidos. Se muestra un aviso de "No recibimos pedidos por el momento". 
Independiente del campo active (que controla si el restaurante está aprobado/visible).';
Verificación (opcional, para confirmar que quedó bien)
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'businesses'
  AND column_name = 'is_paused';
> Nota: No se necesitan cambios en las políticas RLS existentes ya que is_paused es solo un campo más de la tabla businesses que ya tiene RLS configurado.
---
## 2. Archivos de Código a Modificar
A continuación se describen todos los archivos que se modificarán en la implementación, con la lógica exacta de cada cambio.
---
2.1 src/core/supabase/types.ts
Qué cambia: Agregar is_paused a los tipos TypeScript de businesses.
// En la sección businesses > Row (aprox. línea 139)
// ANTES:
active: boolean | null
// DESPUÉS — agregar debajo de active:
active: boolean | null
is_paused: boolean  // ← NUEVO
// En la sección businesses > Insert (aprox. línea 151):
is_paused?: boolean  // ← NUEVO (opcional con default false)
// En la sección businesses > Update (aprox. línea 163):
is_paused?: boolean  // ← NUEVO
---
2.2 src/core/services/businessHoursService.ts
Qué cambia: Agregar una función utilitaria isBusinessOpenNow que compara la hora actual con los horarios configurados. Esta función es pura (no llama a la BD) — recibe el array de horarios ya obtenido.
// Nueva función a agregar al final del archivo
/**
 * Calcula si un negocio está abierto en este momento basándose en sus horarios.
 * @param hours - Array de horarios del negocio obtenidos desde la BD
 * @returns true si está abierto, false si está cerrado o no tiene horarios activos hoy
 */
export function isBusinessOpenNow(hours: BusinessHour[]): boolean | null {
  // Si no hay horarios configurados, retornar null (significa "sin horarios, usar active")
  if (!hours || hours.length === 0) return null;
  const now = new Date();
  // getDay() retorna 0=Domingo, 1=Lunes ... 6=Sábado — igual que day_of_week en BD
  const todayDayOfWeek = now.getDay();
  
  // Buscar el horario del día actual que esté activo
  const todaySchedule = hours.find(
    h => h.day_of_week === todayDayOfWeek && h.active === true
  );
  // Si el día de hoy no tiene horario activo, el negocio está cerrado
  if (!todaySchedule) return false;
  // Comparar hora actual vs open_time y close_time
  // Los tiempos en BD están en formato "HH:MM:SS" o "HH:MM"
  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
  const openTime = todaySchedule.open_time.slice(0, 5);  // "HH:MM"
  const closeTime = todaySchedule.close_time.slice(0, 5); // "HH:MM"
  return currentTime >= openTime && currentTime < closeTime;
}
---
2.3 src/core/services/businessService.ts
Qué cambia: Agregar función setBusinessPaused para activar/desactivar el modo hibernación.
// Nueva función a agregar después de toggleBusinessStatus (aprox. línea 248)
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
---
2.4 src/presentation/pages/Home.tsx
Qué cambia: 
- Incluir is_paused en el SELECT de businesses
- Incluir business_hours en el fetch paralelo para calcular estado real
- Agregar helper computeRestaurantStatus con la jerarquía de estados
- Renderizado del card con colores diferenciados por estado
Lógica de estado nueva (computeRestaurantStatus):
type RestaurantStatus = 
  | { type: 'open';    label: 'Abierto' }
  | { type: 'paused';  label: 'No recibimos pedidos' }
  | { type: 'closed';  label: 'Cerrado por el momento' };
function computeRestaurantStatus(
  active: boolean | null,
  isPaused: boolean,
  hours: BusinessHour[]
): RestaurantStatus {
  if (!active) return { type: 'closed', label: 'Cerrado por el momento' };
  if (isPaused) return { type: 'paused', label: 'No recibimos pedidos' };
  
  const openNow = isBusinessOpenNow(hours);
  
  if (openNow === null) return { type: 'open', label: 'Abierto' }; // Sin horarios → abierto
  if (openNow === false) return { type: 'closed', label: 'Cerrado por el momento' };
  return { type: 'open', label: 'Abierto' };
}
Query actualizado:
// Agregar is_paused al SELECT
supabase
  .from('businesses')
  .select('id, name, address, active, logo_url, is_paused')
  .eq('active', true)
// En paralelo, fetch de business_hours de todos los restaurantes
// (en el mismo Promise.all que ya existe)
supabase
  .from('business_hours')
  .select('business_id, day_of_week, open_time, close_time, active')
  .in('business_id', restaurantIds)
Renderizado de badge por estado:
Estado	Badge color
open	Verde bg-green-100 text-green-700
paused	Ámbar bg-amber-100 text-amber-700
closed	Gris bg-gray-200 text-gray-600
---
2.5 src/presentation/pages/RestaurantDetail.tsx
Qué cambia:
- Incluir is_paused en el SELECT
- Fetch de business_hours de este restaurante específico
- Calcular estado con computeRestaurantStatus
- Mostrar banner de aviso si pausado o cerrado
Banner de aviso en página de detalle:
┌──────────────────────────────────────────────────────────┐
│  🔔  No recibimos pedidos por el momento                 │
│  Estamos saturados de pedidos. Reanudaremos la atención  │
│  lo más pronto posible. ¡Gracias por tu paciencia!       │
└──────────────────────────────────────────────────────────┘
(Color: ámbar/naranja — bg-amber-50 border-amber-200)
┌──────────────────────────────────────────────────────────┐
│  🕐  Cerrado por el momento                              │
│  Este restaurante se encuentra fuera de su horario de    │
│  atención. Puedes ver el menú pero no realizar pedidos.  │
└──────────────────────────────────────────────────────────┘
(Color: gris — bg-gray-50 border-gray-200)
- Los productos siguen mostrándose normalmente
- Al hacer click en un producto, el modal se abre
- Los botones del modal están deshabilitados con mensaje explicativo
---
2.6 src/presentation/components/common/ProductModal/ProductModal.tsx
Qué cambia: Recibir prop restaurantStatus y bloquear botones cuando el restaurante no puede aceptar pedidos.
Props actualizadas:
// Agregar a ProductModalProps:
restaurantStatus?: 'open' | 'paused' | 'closed';
Comportamiento de botones cuando restaurantStatus !== 'open':
[Agregar al carrito]  →  disabled + opacity-50 + cursor-not-allowed
[Pedir ahora]         →  disabled + opacity-50 + cursor-not-allowed
Mensaje debajo de los botones:
  - Si paused:  "Este restaurante no está recibiendo pedidos por el momento"
  - Si closed:  "Este restaurante está cerrado en este momento"
---
2.7 src/presentation/pages/restaurantUI/Dashboard.tsx
Qué cambia: Agregar un toggle de pausa en la parte superior del dashboard para acceso rápido.
Diseño del toggle:
┌─────────────────────────────────────────────────────────────┐
│  ⏸  Modo Hibernación                              [OFF/ON]  │
│  Al activarlo, los clientes verán tu restaurante pero       │
│  no podrán realizar nuevos pedidos.                         │
└─────────────────────────────────────────────────────────────┘
- Estado ON → fondo ámbar, switch naranja
- Estado OFF → fondo blanco/dark, switch gris
- Al hacer toggle → llama setBusinessPaused(businessId, !isPaused) del service
- Feedback visual inmediato (optimistic UI) + toast de confirmación
---
2.8 src/presentation/pages/settings/Settings.tsx
Qué cambia: Agregar una tarjeta "Disponibilidad del restaurante" en la página de configuración con explicación más detallada.
Diseño de la sección:
┌─────────────────────────────────────────────────────────────┐
│  Disponibilidad del Restaurante                             │
│                                                             │
│  Modo Hibernación           [Toggle ON/OFF]                 │
│                                                             │
│  Cuando el modo hibernación está activo:                    │
│  • Tu restaurante seguirá visible para los clientes         │
│  • Los clientes NO podrán realizar nuevos pedidos           │
│  • Verán el mensaje: "No recibimos pedidos por el momento"  │
│  • Puedes seguir gestionando tus pedidos existentes         │
│                                                             │
│  Úsalo cuando estés saturado de pedidos o necesites         │
│  una pausa temporal. Se restablece cuando lo desactives.    │
└─────────────────────────────────────────────────────────────┘
---
3. Diagrama de Flujo de Estados
Cliente abre la app
         │
         ▼
¿business.active = true?
    │              │
   NO             SÍ
    │              │
    ▼              ▼
No aparece    ¿is_paused = true?
en lista           │              │
                  SÍ             NO
                   │              │
                   ▼              ▼
             Badge ÁMBAR    ¿Tiene horarios
             "No recibimos   configurados?
              pedidos"            │              │
                   │             NO             SÍ
                   │              │              │
                   │              ▼              ▼
                   │        Badge VERDE     ¿Está en horario
                   │        "Abierto"       de apertura hoy?
                   │                             │              │
                   │                            SÍ             NO
                   │                             │              │
                   │                             ▼              ▼
                   │                       Badge VERDE    Badge GRIS
                   │                       "Abierto"      "Cerrado por
                   │                                       el momento"
                   │
         En todos los casos donde
         no está "Abierto":
         → Productos visibles
         → Botones de compra DESHABILITADOS
---
4. Resumen de Archivos Afectados
Archivo
Supabase SQL
types.ts
businessHoursService.ts
businessService.ts
Home.tsx
RestaurantDetail.tsx
ProductModal.tsx
Dashboard.tsx
Settings.tsx
Total: 8 archivos (1 en BD, 7 en frontend)
---
5. SQL Completo para Copiar y Pegar en Supabase
-- ============================================================
-- MIGRACIÓN: Modo Hibernación para restaurantes
-- Fecha: 2026-03-14
-- Descripción: Agrega soporte para que los restaurantes puedan
--              pausar la recepción de nuevos pedidos sin
--              desactivarse completamente.
-- ============================================================
-- 1. Agregar la columna is_paused
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false;
-- 2. Comentario descriptivo
COMMENT ON COLUMN public.businesses.is_paused IS 
'Modo hibernación: cuando es true el restaurante aparece en la lista de clientes pero 
no acepta nuevos pedidos. Se muestra aviso "No recibimos pedidos por el momento". 
Independiente de active (que controla aprobación/visibilidad general del restaurante).';
-- 3. Verificación — debe retornar 1 fila con is_paused
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'businesses'
  AND column_name = 'is_paused';
