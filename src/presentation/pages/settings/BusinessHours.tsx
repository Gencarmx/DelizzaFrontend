import { useState, useEffect } from "react";
import { ChevronLeft, Save, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useRestaurantNotifications } from "@core/context/RestaurantNotificationsContext";
import { getBusinessHours, saveBusinessHours, type BusinessHourInput } from "@core/services/businessHoursService";

interface DaySchedule {
  dayOfWeek: number;
  dayName: string;
  openTime: string;
  closeTime: string;
  active: boolean;
}

export default function BusinessHours() {
  const navigate = useNavigate();
  const { businessId } = useRestaurantNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [hasExistingHours, setHasExistingHours] = useState(false);

  // Default schedule: Monday to Friday, 9:00 AM to 9:00 PM
  const defaultSchedule: DaySchedule[] = [
    { dayOfWeek: 0, dayName: "Domingo", openTime: "09:00", closeTime: "21:00", active: false },
    { dayOfWeek: 1, dayName: "Lunes", openTime: "09:00", closeTime: "21:00", active: true },
    { dayOfWeek: 2, dayName: "Martes", openTime: "09:00", closeTime: "21:00", active: true },
    { dayOfWeek: 3, dayName: "Miércoles", openTime: "09:00", closeTime: "21:00", active: true },
    { dayOfWeek: 4, dayName: "Jueves", openTime: "09:00", closeTime: "21:00", active: true },
    { dayOfWeek: 5, dayName: "Viernes", openTime: "09:00", closeTime: "21:00", active: true },
    { dayOfWeek: 6, dayName: "Sábado", openTime: "09:00", closeTime: "21:00", active: false },
  ];

  useEffect(() => {
    loadBusinessHours();
  }, [businessId]);

  const loadBusinessHours = async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      const hours = await getBusinessHours(businessId);

      if (hours && hours.length > 0) {
        setHasExistingHours(true);
        // Map database hours to local state
        const mappedSchedules = defaultSchedule.map(day => {
          const existingHour = hours.find(h => h.day_of_week === day.dayOfWeek);
          if (existingHour) {
            return {
              dayOfWeek: existingHour.day_of_week,
              dayName: day.dayName,
              openTime: existingHour.open_time,
              closeTime: existingHour.close_time,
              active: existingHour.active,
            };
          }
          return day;
        });
        setSchedules(mappedSchedules);
      } else {
        setHasExistingHours(false);
        setSchedules(defaultSchedule);
      }
    } catch (error) {
      console.error("Error loading business hours:", error);
      setHasExistingHours(false);
      setSchedules(defaultSchedule);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = (dayOfWeek: number) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.dayOfWeek === dayOfWeek 
        ? { ...schedule, active: !schedule.active }
        : schedule
    ));
  };

  const handleTimeChange = (dayOfWeek: number, field: 'openTime' | 'closeTime', value: string) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.dayOfWeek === dayOfWeek 
        ? { ...schedule, [field]: value }
        : schedule
    ));
  };

  const handleSave = async () => {
    if (!businessId) {
      alert("No se pudo identificar el negocio");
      return;
    }

    setSaving(true);
    try {
      const hoursToSave: BusinessHourInput[] = schedules.map(schedule => ({
        day_of_week: schedule.dayOfWeek,
        open_time: schedule.openTime,
        close_time: schedule.closeTime,
        active: schedule.active,
      }));

      await saveBusinessHours(businessId, hoursToSave);
      alert(hasExistingHours ? "Cambios guardados correctamente" : "Horarios guardados correctamente");
      navigate(-1);
    } catch (error) {
      console.error("Error saving business hours:", error);
      alert("Error al guardar los horarios");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-2 pb-24 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 bg-white dark:bg-gray-800 sticky top-0 z-10 px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>
        <h2 className="font-bold text-lg text-gray-900 dark:text-white">
          Horarios de atención
        </h2>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 px-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configura los horarios de atención de tu restaurante. Los clientes solo podrán hacer pedidos cuando el restaurante esté activo.
        </p>

        {/* Days Schedule */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {schedules.map((schedule, index) => (
            <div
              key={schedule.dayOfWeek}
              className={`p-4 ${
                index !== schedules.length - 1
                  ? "border-b border-gray-100 dark:border-gray-700"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-900 dark:text-white">
                  {schedule.dayName}
                </span>
                <button
                  onClick={() => handleToggleDay(schedule.dayOfWeek)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    schedule.active ? "bg-amber-400" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                      schedule.active ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {schedule.active && (
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Apertura
                    </label>
                    <input
                      type="time"
                      value={schedule.openTime}
                      onChange={(e) => handleTimeChange(schedule.dayOfWeek, 'openTime', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                  <span className="text-gray-400 dark:text-gray-500 mt-5">-</span>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Cierre
                    </label>
                    <input
                      type="time"
                      value={schedule.closeTime}
                      onChange={(e) => handleTimeChange(schedule.dayOfWeek, 'closeTime', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>{hasExistingHours ? "Guardar cambios" : "Guardar horarios"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
