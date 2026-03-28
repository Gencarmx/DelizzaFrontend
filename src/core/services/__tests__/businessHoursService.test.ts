import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isBusinessOpenNow } from "@core/services/businessHoursService";

// isBusinessOpenNow no usa Supabase directamente, pero el archivo lo importa.
// Este mock mínimo evita que el cliente real intente conectarse en el entorno de test.
vi.mock("@core/supabase/client", () => ({ supabase: {} }));

// ── Helper ───────────────────────────────────────────────────────────────────

type PartialHour = {
  day_of_week: number;
  open_time: string;
  close_time: string;
  active: boolean;
};

function makeHour(
  day_of_week: number,
  open_time: string,
  close_time: string,
  active = true
): PartialHour & Record<string, unknown> {
  return {
    id: "test-id",
    business_id: "biz-1",
    day_of_week,
    open_time,
    close_time,
    active,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ── Suite ────────────────────────────────────────────────────────────────────

describe("isBusinessOpenNow", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("retorna null cuando el array de horarios está vacío", () => {
    expect(isBusinessOpenNow([])).toBeNull();
  });

  it("retorna false cuando el día de hoy no tiene horario registrado", () => {
    // Domingo (0), solo existe horario para Lunes (1)
    vi.setSystemTime(new Date("2026-03-22T14:00:00")); // domingo
    const hours = [makeHour(1, "08:00:00", "20:00:00")];
    expect(isBusinessOpenNow(hours as any)).toBe(false);
  });

  it("retorna false cuando el horario del día está inactivo", () => {
    vi.setSystemTime(new Date("2026-03-23T14:00:00")); // lunes
    const hours = [makeHour(1, "08:00:00", "20:00:00", false)];
    expect(isBusinessOpenNow(hours as any)).toBe(false);
  });

  it("retorna true cuando la hora actual está dentro del horario", () => {
    vi.setSystemTime(new Date("2026-03-23T12:00:00")); // lunes 12:00
    const hours = [makeHour(1, "08:00:00", "20:00:00")];
    expect(isBusinessOpenNow(hours as any)).toBe(true);
  });

  it("retorna false cuando la hora actual es anterior a la apertura", () => {
    vi.setSystemTime(new Date("2026-03-23T07:30:00")); // antes de abrir
    const hours = [makeHour(1, "08:00:00", "20:00:00")];
    expect(isBusinessOpenNow(hours as any)).toBe(false);
  });

  it("retorna false cuando la hora actual supera el cierre", () => {
    vi.setSystemTime(new Date("2026-03-23T21:00:00")); // después de cerrar
    const hours = [makeHour(1, "08:00:00", "20:00:00")];
    expect(isBusinessOpenNow(hours as any)).toBe(false);
  });

  it("retorna true en el instante exacto de apertura (>=)", () => {
    vi.setSystemTime(new Date("2026-03-23T08:00:00")); // exactamente a la apertura
    const hours = [makeHour(1, "08:00:00", "20:00:00")];
    expect(isBusinessOpenNow(hours as any)).toBe(true);
  });

  it("retorna false en el instante exacto de cierre (<)", () => {
    vi.setSystemTime(new Date("2026-03-23T20:00:00")); // exactamente al cierre
    const hours = [makeHour(1, "08:00:00", "20:00:00")];
    expect(isBusinessOpenNow(hours as any)).toBe(false);
  });

  it("selecciona solo el horario del día correcto entre varios días", () => {
    // Lunes (1) a las 12:00, pero el lunes abre a las 15:00
    vi.setSystemTime(new Date("2026-03-23T12:00:00")); // lunes
    const hours = [
      makeHour(0, "00:00:00", "23:59:00"), // domingo — todo el día
      makeHour(1, "15:00:00", "22:00:00"), // lunes  — abre a las 15
      makeHour(2, "00:00:00", "23:59:00"), // martes — todo el día
    ];
    expect(isBusinessOpenNow(hours as any)).toBe(false);
  });

  it("retorna true cuando hay múltiples días y el actual está abierto", () => {
    vi.setSystemTime(new Date("2026-03-23T16:00:00")); // lunes 16:00
    const hours = [
      makeHour(0, "10:00:00", "22:00:00"),
      makeHour(1, "15:00:00", "22:00:00"), // lunes abre 15-22
      makeHour(2, "10:00:00", "22:00:00"),
    ];
    expect(isBusinessOpenNow(hours as any)).toBe(true);
  });
});
