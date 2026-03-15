/**
 * Business Hours Service - Gestión de horarios de negocios
 * Proporciona funcionalidades para obtener y guardar horarios de apertura/cierre
 */

import { supabase } from "@core/supabase/client";
import type { Database } from "@core/supabase/types";

type BusinessHour = Database['public']['Tables']['business_hours']['Row'];
type BusinessHourInsert = Database['public']['Tables']['business_hours']['Insert'];
type BusinessHourUpdate = Database['public']['Tables']['business_hours']['Update'];

export interface BusinessHourInput {
  day_of_week: number;
  open_time: string;
  close_time: string;
  active: boolean;
}

export interface DaySchedule {
  dayOfWeek: number;
  dayName: string;
  openTime: string;
  closeTime: string;
  active: boolean;
}

export const DAYS_OF_WEEK = [
  { value: 0, name: "Domingo" },
  { value: 1, name: "Lunes" },
  { value: 2, name: "Martes" },
  { value: 3, name: "Miércoles" },
  { value: 4, name: "Jueves" },
  { value: 5, name: "Viernes" },
  { value: 6, name: "Sábado" },
];

export async function getBusinessHours(businessId: string): Promise<BusinessHour[]> {
  try {
    const { data, error } = await supabase
      .from('business_hours')
      .select('*')
      .eq('business_id', businessId)
      .order('day_of_week', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error obteniendo horarios del negocio:', error);
    throw new Error('No se pudieron obtener los horarios del negocio');
  }
}

export async function saveBusinessHours(
  businessId: string,
  hours: BusinessHourInput[]
): Promise<BusinessHour[]> {
  try {
    const { error: deleteError } = await supabase
      .from('business_hours')
      .delete()
      .eq('business_id', businessId);

    if (deleteError) {
      throw deleteError;
    }

    const hoursToInsert: BusinessHourInsert[] = hours.map(hour => ({
      id: crypto.randomUUID(),
      business_id: businessId,
      day_of_week: hour.day_of_week,
      open_time: hour.open_time,
      close_time: hour.close_time,
      active: hour.active,
    }));

    const { data, error } = await supabase
      .from('business_hours')
      .insert(hoursToInsert)
      .select();

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error guardando horarios del negocio:', error);
    throw new Error('No se pudieron guardar los horarios del negocio');
  }
}

export async function updateBusinessHour(
  hourId: string,
  updates: Partial<BusinessHourInput>
): Promise<BusinessHour> {
  try {
    const updateData: BusinessHourUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('business_hours')
      .update(updateData)
      .eq('id', hourId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error actualizando horario:', error);
    throw new Error('No se pudo actualizar el horario');
  }
}

export async function toggleBusinessHour(
  hourId: string,
  active: boolean
): Promise<BusinessHour> {
  try {
    const { data, error } = await supabase
      .from('business_hours')
      .update({ 
        active,
        updated_at: new Date().toISOString()
      })
      .eq('id', hourId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error toggling horario:', error);
    throw new Error('No se pudo cambiar el estado del horario');
  }
}

/**
 * Calcula si un negocio está abierto en este momento basándose en sus horarios.
 * Función pura — no realiza llamadas a la BD, recibe el array ya obtenido.
 *
 * @param hours - Array de horarios del negocio obtenidos desde la BD
 * @returns true si está abierto, false si está cerrado,
 *          null si no hay horarios configurados (significa "sin restricción horaria")
 */
export function isBusinessOpenNow(hours: BusinessHour[]): boolean | null {
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
  const openTime = todaySchedule.open_time.slice(0, 5);   // "HH:MM"
  const closeTime = todaySchedule.close_time.slice(0, 5); // "HH:MM"

  return currentTime >= openTime && currentTime < closeTime;
}
