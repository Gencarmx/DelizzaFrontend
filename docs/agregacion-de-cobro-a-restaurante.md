# Sistema de Comisiones y Cobro Quincenal — Delizza

## Problema

Al salir al mercado, Delizza cobra **$10 MXN por cada transacción completada** a través de la plataforma. Dado que no se cuenta con un método de pago integrado, los restaurantes retienen ese monto hasta que Delizza se los cobra quincenalmente (días 15 y último de cada mes).

Se necesita un sistema que:

1. **Capture automáticamente** cada comisión en el momento exacto en que ocurre.
2. **Genere documentación** que demuestre el desglose exacto de lo que se le cobra a cada restaurante.
3. **Proteja a Delizza** ante posibles disputas o demandas, manteniendo registros inmutables.

---

## Decisiones de diseño

| Decisión | Elección | Razón |
|---|---|---|
| ¿Qué órdenes generan comisión? | Solo `status = 'completed'` | Es el estado final confirmado de una orden |
| ¿Cómo se captura la comisión? | Trigger automático en Postgres | Ninguna orden puede escaparse sin importar qué cliente la complete |
| ¿El registro de comisión es editable? | No — inmutable por diseño | Valor probatorio legal; sin UPDATE ni DELETE vía RLS |
| ¿Quién gestiona el sistema? | Solo admins de Delizza | Los restaurantes no tienen visibilidad del sistema de cobros |
| ¿Qué formato tiene la documentación? | Documento HTML por restaurante por quincena, almacenado en Supabase Storage | Descargable, enviable digitalmente, con datos de contacto del restaurante |
| ¿Los $10 son fijos? | Fijos, pero configurables sin tocar código | La tabla `commission_settings` permite cambiar la tarifa en el futuro |
| ¿Cuándo se cierra la quincena? | Manualmente por el admin | Mayor control sobre el momento del corte |

---

## Esquema de base de datos

### Diagrama de relaciones

```
commission_settings
  └─ (consultada por el trigger para obtener la tarifa vigente)

billing_periods
  ├── order_commissions (N)
  └── billing_statements (N)
        └── businesses (1)
              └── profiles (owner)

orders ──[trigger]──► order_commissions
```

### Tablas nuevas

#### `commission_settings`
Configuración global de la tarifa. Permite cambiar el monto sin modificar código.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador |
| `fee_per_order` | NUMERIC(10,2) | Monto por transacción (default $10.00) |
| `currency` | TEXT | Moneda (default `MXN`) |
| `active` | BOOLEAN | Solo la fila activa se usa en el trigger |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última modificación |

---

#### `billing_periods`
Representa cada quincena. El admin la abre al inicio y la cierra al final del periodo.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador |
| `period_start` | TIMESTAMPTZ | Inicio de la quincena |
| `period_end` | TIMESTAMPTZ | Fin de la quincena |
| `status` | TEXT | `open` \| `closed` \| `charged` |
| `closed_at` | TIMESTAMPTZ | Fecha en que el admin cerró el periodo |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última modificación |

> **Restricción:** Solo puede existir un periodo con `status = 'open'` al mismo tiempo (índice único parcial).

Estados del periodo:
```
open ──► closed ──► charged
```

---

#### `order_commissions`
**Registro inmutable.** Una fila por cada orden completada. Es la prueba legal de que la comisión fue generada.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador |
| `order_id` | UUID FK → orders | Orden que generó la comisión (único) |
| `business_id` | UUID FK → businesses | Restaurante al que se le cobra |
| `billing_period_id` | UUID FK → billing_periods | Quincena a la que pertenece |
| `fee_amount` | NUMERIC(10,2) | Snapshot de la tarifa al momento de completarse |
| `order_total` | NUMERIC(10,2) | Snapshot del total de la orden |
| `order_completed_at` | TIMESTAMPTZ | Momento exacto en que la orden se completó |
| `created_at` | TIMESTAMPTZ | Momento en que se registró la comisión |

> **Inmutabilidad:** RLS solo permite `SELECT`. No existen políticas de `UPDATE` ni `DELETE`. El `INSERT` ocurre exclusivamente vía trigger `SECURITY DEFINER`.

---

#### `billing_statements`
Estado de cuenta oficial por restaurante por quincena. Referencia el documento generado en Storage.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador |
| `billing_period_id` | UUID FK → billing_periods | Quincena del cobro |
| `business_id` | UUID FK → businesses | Restaurante cobrado |
| `total_orders` | INTEGER | Cantidad de órdenes en el periodo |
| `total_commission` | NUMERIC(10,2) | Total a cobrar (`total_orders × fee`) |
| `status` | TEXT | `draft` \| `issued` \| `paid` |
| `pdf_url` | TEXT | URL firmada del documento en Supabase Storage |
| `issued_at` | TIMESTAMPTZ | Fecha de emisión del documento |
| `paid_at` | TIMESTAMPTZ | Fecha en que el admin confirmó el cobro |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última modificación |

Estados del statement:
```
draft ──► issued ──► paid
```

---

## Flujo de operación

```
[Admin] Abre billing_period (status='open')
              │
              │  Durante la quincena...
              │
        [Trigger automático — Postgres]
        Se dispara en cada UPDATE de orders
        cuando NEW.status = 'completed'
              │
              └──► INSERT order_commissions
                   (snapshot inmutable: fee, total, fecha)

[Quincena terminada — Admin presiona botón]
              │
              ▼
   Edge Function: close-billing-period
              │
              ├──► Cierra billing_period (status → 'closed')
              ├──► Agrupa comisiones por restaurante
              └──► Por cada restaurante:
                    Edge Function: generate-billing-statement
                          │
                          ├──► Genera documento HTML
                          │    (datos negocio + dueño + tabla de transacciones)
                          ├──► Sube a Supabase Storage (bucket privado)
                          └──► Guarda URL en billing_statements.pdf_url
                               (status → 'issued')

[Admin descarga/envía documentos y cobra]
              │
              └──► UPDATE billing_statements SET status = 'paid'
```

---

## Contenido del documento generado

El estado de cuenta HTML incluye:

- **Encabezado:** Logo Delizza, título "Estado de Cuenta", folio único (`EDC-XXXXXXXX`), fecha de emisión
- **Datos del establecimiento:** Nombre, dirección, teléfono
- **Datos del responsable:** Nombre del dueño, teléfono del dueño
- **Periodo de facturación:** Fecha inicio — fecha fin
- **Tabla de transacciones:** `# | Fecha | Folio Orden | Total Orden | Comisión Delizza`
- **Resumen:** Total de transacciones, comisión por transacción, **total a cobrar**
- **Aviso legal:** Texto probatorio que certifica la validez del documento

Los datos del restaurante y su dueño se toman de las tablas `businesses` y `profiles (owner_id)` existentes en el backend.

---

## Seguridad (RLS)

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `commission_settings` | admin | admin | admin | admin |
| `billing_periods` | admin | admin | admin | admin |
| `order_commissions` | admin | **solo trigger** | — | — |
| `billing_statements` | admin | admin | admin | admin |
| Storage `billing-statements` | admin | admin | — | — |

La inmutabilidad de `order_commissions` está garantizada a nivel de base de datos: aunque un admin intente hacer `UPDATE` o `DELETE` desde el cliente, RLS lo bloqueará.

---

## SQL de implementación

Ejecutar el siguiente bloque completo en **Supabase → SQL Editor**.

### Paso 1 — Tablas

```sql
-- ================================================================
-- TABLA 1: commission_settings
-- Configuración global de comisiones (editable sin tocar código)
-- ================================================================
CREATE TABLE public.commission_settings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_per_order NUMERIC(10,2) NOT NULL DEFAULT 10.00,
  currency      TEXT        NOT NULL DEFAULT 'MXN',
  active        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.commission_settings               IS 'Configuración global de la comisión por transacción de Delizza';
COMMENT ON COLUMN public.commission_settings.fee_per_order IS 'Monto fijo en MXN que se cobra al restaurante por cada orden completada';

-- ================================================================
-- TABLA 2: billing_periods
-- Una fila por quincena — creada y cerrada manualmente por admin
-- ================================================================
CREATE TABLE public.billing_periods (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end   TIMESTAMPTZ NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'closed', 'charged')),
  closed_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.billing_periods          IS 'Periodos de facturación quincenales gestionados manualmente por el admin de Delizza';
COMMENT ON COLUMN public.billing_periods.status   IS 'open=en curso | closed=cerrado y documentado | charged=cobrado al restaurante';
COMMENT ON COLUMN public.billing_periods.closed_at IS 'Fecha en que el admin cerró el periodo y generó los estados de cuenta';

-- Solo puede existir un periodo open a la vez
CREATE UNIQUE INDEX idx_billing_periods_single_open
  ON public.billing_periods (status)
  WHERE status = 'open';

-- ================================================================
-- TABLA 3: order_commissions  (INMUTABLE)
-- ================================================================
CREATE TABLE public.order_commissions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id           UUID        NOT NULL REFERENCES public.orders(id),
  business_id        UUID        NOT NULL REFERENCES public.businesses(id),
  billing_period_id  UUID        REFERENCES public.billing_periods(id),
  fee_amount         NUMERIC(10,2) NOT NULL,
  order_total        NUMERIC(10,2) NOT NULL,
  order_completed_at TIMESTAMPTZ NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_order_commission UNIQUE (order_id)
);

COMMENT ON TABLE  public.order_commissions                   IS 'Registro inmutable de cada comisión generada. NO se modifica ni elimina tras su creación.';
COMMENT ON COLUMN public.order_commissions.fee_amount        IS 'Snapshot del monto cobrado al momento de completar la orden';
COMMENT ON COLUMN public.order_commissions.order_total       IS 'Snapshot del total de la orden al momento de completarse';
COMMENT ON COLUMN public.order_commissions.order_completed_at IS 'Timestamp exacto en que la orden cambió a status=completed';

CREATE INDEX idx_order_commissions_business_period
  ON public.order_commissions (business_id, billing_period_id);

CREATE INDEX idx_order_commissions_period
  ON public.order_commissions (billing_period_id);

-- ================================================================
-- TABLA 4: billing_statements
-- Estado de cuenta oficial por negocio por quincena
-- ================================================================
CREATE TABLE public.billing_statements (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_period_id UUID        NOT NULL REFERENCES public.billing_periods(id),
  business_id       UUID        NOT NULL REFERENCES public.businesses(id),
  total_orders      INTEGER     NOT NULL DEFAULT 0,
  total_commission  NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  status            TEXT        NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'issued', 'paid')),
  pdf_url           TEXT,
  issued_at         TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_statement_per_period_business
    UNIQUE (billing_period_id, business_id)
);

COMMENT ON TABLE  public.billing_statements        IS 'Estado de cuenta quincenal por restaurante generado por el admin al cerrar un periodo.';
COMMENT ON COLUMN public.billing_statements.status IS 'draft=generado | issued=enviado al restaurante | paid=cobro confirmado';
COMMENT ON COLUMN public.billing_statements.pdf_url IS 'URL firmada (Supabase Storage) del documento HTML del estado de cuenta';
COMMENT ON COLUMN public.billing_statements.paid_at IS 'Fecha en que el admin confirmó haber cobrado al restaurante';

CREATE INDEX idx_billing_statements_period   ON public.billing_statements (billing_period_id);
CREATE INDEX idx_billing_statements_business ON public.billing_statements (business_id);
CREATE INDEX idx_billing_statements_status   ON public.billing_statements (status);
```

---

### Paso 2 — Función y trigger

```sql
-- ================================================================
-- FUNCIÓN: captura automática de comisiones
-- Se ejecuta en cada UPDATE de orders cuando status → 'completed'
-- ================================================================
CREATE OR REPLACE FUNCTION public.capture_order_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_id UUID;
  v_fee       NUMERIC(10,2);
BEGIN
  -- Solo actuar cuando la orden pasa a 'completed' desde otro estado
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN

    -- Buscar periodo de facturación activo en curso
    SELECT id INTO v_period_id
    FROM public.billing_periods
    WHERE status = 'open'
      AND period_start <= now()
      AND period_end   >= now()
    LIMIT 1;

    -- Obtener tarifa vigente (la más reciente activa)
    SELECT fee_per_order INTO v_fee
    FROM public.commission_settings
    WHERE active = true
    ORDER BY created_at DESC
    LIMIT 1;

    -- Fallback de seguridad si no hay configuración
    IF v_fee IS NULL THEN
      v_fee := 10.00;
    END IF;

    IF v_period_id IS NOT NULL THEN
      -- ON CONFLICT protege contra doble disparo del trigger
      INSERT INTO public.order_commissions (
        order_id,
        business_id,
        billing_period_id,
        fee_amount,
        order_total,
        order_completed_at
      ) VALUES (
        NEW.id,
        NEW.business_id,
        v_period_id,
        v_fee,
        NEW.total,
        now()
      )
      ON CONFLICT (order_id) DO NOTHING;
    ELSE
      -- Sin periodo activo: warning visible en logs de Postgres
      RAISE WARNING
        '[Delizza] COMISIÓN NO CAPTURADA: Sin billing_period activo para orden %. '
        'Abrir un periodo de facturación antes de iniciar operaciones.',
        NEW.id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.capture_order_commission() IS
  'Trigger que captura automáticamente la comisión de Delizza ($10 MXN) al completarse una orden. Registro inmutable.';

-- Registrar el trigger en la tabla orders
CREATE TRIGGER trg_capture_order_commission
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_order_commission();
```

---

### Paso 3 — Políticas RLS

```sql
-- ================================================================
-- RLS: commission_settings — solo admins
-- ================================================================
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_commission_settings"
  ON public.commission_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND user_role = 'admin'
        AND active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND user_role = 'admin'
        AND active = true
    )
  );

-- ================================================================
-- RLS: billing_periods — solo admins
-- ================================================================
ALTER TABLE public.billing_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_billing_periods"
  ON public.billing_periods
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND user_role = 'admin'
        AND active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND user_role = 'admin'
        AND active = true
    )
  );

-- ================================================================
-- RLS: order_commissions
-- Solo SELECT para admins.
-- INSERT ocurre exclusivamente vía trigger SECURITY DEFINER.
-- Sin políticas de UPDATE ni DELETE → inmutabilidad legal garantizada.
-- ================================================================
ALTER TABLE public.order_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_select_order_commissions"
  ON public.order_commissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND user_role = 'admin'
        AND active = true
    )
  );

-- ================================================================
-- RLS: billing_statements — solo admins
-- ================================================================
ALTER TABLE public.billing_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_all_billing_statements"
  ON public.billing_statements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND user_role = 'admin'
        AND active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND user_role = 'admin'
        AND active = true
    )
  );
```

---

### Paso 4 — Bucket de Storage y su política

```sql
-- ================================================================
-- STORAGE: Bucket privado para documentos de cobro
-- ================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'billing-statements',
  'billing-statements',
  false,        -- privado: no accesible públicamente
  5242880,      -- 5 MB máximo por documento
  ARRAY['text/html', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Solo admins pueden leer y subir documentos
CREATE POLICY "admins_storage_billing_statements"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'billing-statements'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND user_role = 'admin'
        AND active = true
    )
  )
  WITH CHECK (
    bucket_id = 'billing-statements'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND user_role = 'admin'
        AND active = true
    )
  );
```

---

### Paso 5 — Seed inicial y registro del admin

```sql
-- Tarifa inicial: $10 MXN por transacción
INSERT INTO public.commission_settings (fee_per_order, currency, active)
VALUES (10.00, 'MXN', true);

-- Registrar la cuenta de administrador de Delizza
-- (ejecutar después de que el usuario se haya registrado en la app)
UPDATE public.profiles
SET user_role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'admin@delizza.com'
);

-- Abrir el primer periodo de facturación
-- (ajustar las fechas según la quincena en curso)
INSERT INTO public.billing_periods (period_start, period_end, status)
VALUES (
  '2026-03-01 00:00:00-06',
  '2026-03-15 23:59:59-06',
  'open'
);
```

---

## Edge Functions

El sistema requiere dos Edge Functions desplegadas en Supabase:

### `generate-billing-statement`
Genera el documento HTML de estado de cuenta para un restaurante en un periodo dado y lo sube a Storage.

**Entrada:**
```json
{
  "billing_period_id": "uuid",
  "business_id": "uuid"
}
```

**Salida:**
```json
{
  "success": true,
  "statement_id": "uuid",
  "folio": "EDC-XXXXXXXX",
  "business_name": "Nombre del restaurante",
  "total_orders": 12,
  "total_commission": 120.00,
  "document_url": "https://... (válida 7 días)"
}
```

---

### `close-billing-period`
Cierra la quincena activa y genera automáticamente los estados de cuenta para **todos** los restaurantes con comisiones en ese periodo.

**Entrada:**
```json
{
  "billing_period_id": "uuid"
}
```

**Salida:**
```json
{
  "success": true,
  "period_closed": true,
  "summary": {
    "total_businesses": 3,
    "statements_generated": 3,
    "grand_total_orders": 45,
    "grand_total_commission": 450.00
  },
  "statements": [
    {
      "business_name": "Restaurante Ejemplo",
      "total_orders": 15,
      "total_commission": 150.00,
      "document_url": "https://...",
      "folio": "EDC-XXXXXXXX",
      "status": "success"
    }
  ]
}
```

Ambas funciones validan que el llamador tenga `user_role = 'admin'` antes de ejecutar cualquier operación.

---

### Paso 6 — Edge Functions

El sistema requiere dos Edge Functions de Supabase. A continuación se incluye el código completo de cada una y los pasos para desplegarlas.

---

#### 6.1 — `generate-billing-statement`

Genera el documento HTML de estado de cuenta para un restaurante en un periodo dado, lo sube al bucket `billing-statements` y actualiza (o crea) el registro en `billing_statements`.

**Archivo:** `supabase/functions/generate-billing-statement/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  // ── Autenticación: solo admins ──────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("user_role, active")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.user_role !== "admin" || !profile.active) {
    return Response.json({ error: "Solo los administradores pueden ejecutar esta función" }, { status: 403 });
  }

  // ── Entrada ─────────────────────────────────────────────────────────────────
  const { billing_period_id, business_id } = await req.json();
  if (!billing_period_id || !business_id) {
    return Response.json({ error: "Se requieren billing_period_id y business_id" }, { status: 400 });
  }

  // ── Datos del periodo ────────────────────────────────────────────────────────
  const { data: period, error: periodError } = await serviceClient
    .from("billing_periods")
    .select("id, period_start, period_end, status")
    .eq("id", billing_period_id)
    .single();

  if (periodError || !period) {
    return Response.json({ error: "Periodo de facturación no encontrado" }, { status: 404 });
  }

  // ── Datos del negocio y su dueño ─────────────────────────────────────────────
  const { data: business, error: bizError } = await serviceClient
    .from("businesses")
    .select("id, name, address, phone, owner_id")
    .eq("id", business_id)
    .single();

  if (bizError || !business) {
    return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const { data: owner } = await serviceClient
    .from("profiles")
    .select("full_name, phone_number")
    .eq("id", business.owner_id)
    .single();

  // ── Comisiones del periodo para este negocio ─────────────────────────────────
  const { data: commissions, error: commError } = await serviceClient
    .from("order_commissions")
    .select("id, order_id, fee_amount, order_total, order_completed_at, created_at")
    .eq("billing_period_id", billing_period_id)
    .eq("business_id", business_id)
    .order("order_completed_at", { ascending: true });

  if (commError) {
    return Response.json({ error: "Error al obtener comisiones" }, { status: 500 });
  }

  const totalOrders = commissions?.length ?? 0;
  const totalCommission = commissions?.reduce((sum, c) => sum + Number(c.fee_amount), 0) ?? 0;

  // ── Generar folio único ──────────────────────────────────────────────────────
  const folio = "EDC-" + Math.random().toString(36).substring(2, 10).toUpperCase();

  // ── Generar HTML del estado de cuenta ────────────────────────────────────────
  const issuedAt = new Date().toLocaleDateString("es-MX", {
    year: "numeric", month: "long", day: "numeric",
  });

  const periodStart = new Date(period.period_start).toLocaleDateString("es-MX", {
    year: "numeric", month: "long", day: "numeric",
  });
  const periodEnd = new Date(period.period_end).toLocaleDateString("es-MX", {
    year: "numeric", month: "long", day: "numeric",
  });

  const transactionRows = (commissions ?? []).map((c, i) => {
    const fecha = new Date(c.order_completed_at).toLocaleDateString("es-MX", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${fecha}</td>
        <td style="font-family:monospace;font-size:0.8em">${c.order_id.substring(0, 8).toUpperCase()}</td>
        <td style="text-align:right">$${Number(c.order_total).toFixed(2)}</td>
        <td style="text-align:right">$${Number(c.fee_amount).toFixed(2)}</td>
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Estado de Cuenta — ${business.name} — ${folio}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 14px; color: #1a1a1a; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #e63946; padding-bottom: 24px; }
    .brand { font-size: 28px; font-weight: 900; color: #e63946; letter-spacing: -1px; }
    .doc-title { font-size: 20px; font-weight: 700; color: #1a1a1a; }
    .folio { font-size: 13px; color: #666; margin-top: 4px; }
    .issued { font-size: 13px; color: #666; }
    .section { margin-bottom: 24px; }
    .section h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
    .section p { line-height: 1.6; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #1a1a1a; color: #fff; }
    thead th { padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    tbody tr:nth-child(even) { background: #f9f9f9; }
    tbody td { padding: 9px 12px; border-bottom: 1px solid #eee; }
    .summary { background: #fff8f8; border: 2px solid #e63946; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .summary-row.total { font-size: 18px; font-weight: 900; color: #e63946; border-top: 2px solid #e63946; margin-top: 8px; padding-top: 12px; }
    .legal { background: #f5f5f5; border-left: 4px solid #999; padding: 16px; font-size: 12px; color: #555; line-height: 1.6; }
    .legal strong { color: #1a1a1a; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Delizza</div>
      <div class="doc-title">Estado de Cuenta</div>
      <div class="folio">Folio: <strong>${folio}</strong></div>
    </div>
    <div style="text-align:right">
      <div class="issued">Fecha de emisión:</div>
      <div style="font-weight:600">${issuedAt}</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="section">
      <h3>Establecimiento</h3>
      <p><strong>${business.name}</strong></p>
      ${business.address ? `<p>${business.address}</p>` : ""}
      ${business.phone ? `<p>Tel: ${business.phone}</p>` : ""}
    </div>
    <div class="section">
      <h3>Responsable</h3>
      <p><strong>${owner?.full_name ?? "—"}</strong></p>
      ${owner?.phone_number ? `<p>Tel: ${owner.phone_number}</p>` : ""}
    </div>
  </div>

  <div class="section">
    <h3>Periodo de Facturación</h3>
    <p>${periodStart} — ${periodEnd}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Fecha</th>
        <th>Folio Orden</th>
        <th style="text-align:right">Total Orden</th>
        <th style="text-align:right">Comisión Delizza</th>
      </tr>
    </thead>
    <tbody>
      ${transactionRows || '<tr><td colspan="5" style="text-align:center;padding:20px;color:#999">Sin transacciones en este periodo</td></tr>'}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-row"><span>Total de transacciones:</span><span><strong>${totalOrders}</strong></span></div>
    <div class="summary-row"><span>Comisión por transacción:</span><span>$${totalOrders > 0 ? Number(commissions![0].fee_amount).toFixed(2) : "10.00"} MXN</span></div>
    <div class="summary-row total"><span>TOTAL A COBRAR:</span><span>$${totalCommission.toFixed(2)} MXN</span></div>
  </div>

  <div class="legal">
    <strong>Aviso Legal —</strong> El presente documento es emitido por Delizza y certifica las comisiones generadas por el uso de la plataforma
    durante el periodo señalado. Cada transacción listada corresponde a una orden con estado <em>completada</em> registrada en el sistema.
    Este documento tiene validez probatoria ante cualquier disputa comercial. La tarifa aplicada fue de
    <strong>$${totalOrders > 0 ? Number(commissions![0].fee_amount).toFixed(2) : "10.00"} MXN por transacción completada</strong>,
    conforme a los términos de servicio vigentes al momento de cada operación.
  </div>
</body>
</html>`;

  // ── Subir HTML a Supabase Storage ─────────────────────────────────────────────
  const fileName = `${billing_period_id}/${business_id}/${folio}.html`;
  const { error: uploadError } = await serviceClient.storage
    .from("billing-statements")
    .upload(fileName, new TextEncoder().encode(html), {
      contentType: "text/html; charset=utf-8",
      upsert: true,
    });

  if (uploadError) {
    return Response.json({ error: `Error al subir documento: ${uploadError.message}` }, { status: 500 });
  }

  // URL firmada válida por 7 días
  const { data: signedUrl } = await serviceClient.storage
    .from("billing-statements")
    .createSignedUrl(fileName, 60 * 60 * 24 * 7);

  // ── Upsert billing_statements ─────────────────────────────────────────────────
  const now = new Date().toISOString();
  const { data: statement, error: stmtError } = await serviceClient
    .from("billing_statements")
    .upsert(
      {
        billing_period_id,
        business_id,
        total_orders: totalOrders,
        total_commission: totalCommission,
        status: "issued",
        pdf_url: signedUrl?.signedUrl ?? null,
        issued_at: now,
        updated_at: now,
      },
      { onConflict: "billing_period_id,business_id" }
    )
    .select("id")
    .single();

  if (stmtError) {
    return Response.json({ error: `Error al guardar statement: ${stmtError.message}` }, { status: 500 });
  }

  return Response.json({
    success: true,
    statement_id: statement.id,
    folio,
    business_name: business.name,
    total_orders: totalOrders,
    total_commission: totalCommission,
    document_url: signedUrl?.signedUrl ?? null,
  });
});
```

---

#### 6.2 — `close-billing-period`

Cierra la quincena activa y llama internamente a `generate-billing-statement` por cada restaurante con comisiones en ese periodo.

**Archivo:** `supabase/functions/close-billing-period/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  // ── Autenticación: solo admins ──────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("user_role, active")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.user_role !== "admin" || !profile.active) {
    return Response.json({ error: "Solo los administradores pueden ejecutar esta función" }, { status: 403 });
  }

  // ── Entrada ─────────────────────────────────────────────────────────────────
  const { billing_period_id } = await req.json();
  if (!billing_period_id) {
    return Response.json({ error: "Se requiere billing_period_id" }, { status: 400 });
  }

  // ── Verificar que el periodo existe y está abierto ───────────────────────────
  const { data: period, error: periodError } = await serviceClient
    .from("billing_periods")
    .select("id, status, period_start, period_end")
    .eq("id", billing_period_id)
    .single();

  if (periodError || !period) {
    return Response.json({ error: "Periodo de facturación no encontrado" }, { status: 404 });
  }

  if (period.status !== "open") {
    return Response.json(
      { error: `El periodo ya se encuentra en estado '${period.status}'. Solo se pueden cerrar periodos 'open'.` },
      { status: 400 }
    );
  }

  // ── Obtener los negocios distintos con comisiones en el periodo ───────────────
  const { data: commissions, error: commError } = await serviceClient
    .from("order_commissions")
    .select("business_id")
    .eq("billing_period_id", billing_period_id);

  if (commError) {
    return Response.json({ error: "Error al obtener comisiones del periodo" }, { status: 500 });
  }

  const businessIds = [...new Set((commissions ?? []).map((c) => c.business_id))];

  if (businessIds.length === 0) {
    // Cerrar el periodo aunque no haya comisiones
    await serviceClient
      .from("billing_periods")
      .update({ status: "closed", closed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", billing_period_id);

    return Response.json({
      success: true,
      period_closed: true,
      summary: {
        total_businesses: 0,
        statements_generated: 0,
        grand_total_orders: 0,
        grand_total_commission: 0,
      },
      statements: [],
    });
  }

  // ── Cerrar el periodo antes de generar documentos ────────────────────────────
  const { error: closeError } = await serviceClient
    .from("billing_periods")
    .update({ status: "closed", closed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", billing_period_id);

  if (closeError) {
    return Response.json({ error: `Error al cerrar el periodo: ${closeError.message}` }, { status: 500 });
  }

  // ── Generar estado de cuenta por cada negocio ────────────────────────────────
  const functionUrl = `${SUPABASE_URL}/functions/v1/generate-billing-statement`;

  const statementResults = await Promise.all(
    businessIds.map(async (businessId) => {
      try {
        const res = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({ billing_period_id, business_id: businessId }),
        });

        const result = await res.json();

        if (!res.ok) {
          return {
            business_id: businessId,
            business_name: result.business_name ?? businessId,
            status: "error",
            error: result.error ?? "Error desconocido",
          };
        }

        return {
          business_id: businessId,
          business_name: result.business_name,
          total_orders: result.total_orders,
          total_commission: result.total_commission,
          document_url: result.document_url,
          folio: result.folio,
          status: "success",
        };
      } catch (err) {
        return {
          business_id: businessId,
          status: "error",
          error: String(err),
        };
      }
    })
  );

  // ── Calcular resumen ─────────────────────────────────────────────────────────
  const successful = statementResults.filter((s) => s.status === "success");
  const grandTotalOrders = successful.reduce((sum, s) => sum + (s.total_orders ?? 0), 0);
  const grandTotalCommission = successful.reduce((sum, s) => sum + (s.total_commission ?? 0), 0);

  return Response.json({
    success: true,
    period_closed: true,
    summary: {
      total_businesses: businessIds.length,
      statements_generated: successful.length,
      grand_total_orders: grandTotalOrders,
      grand_total_commission: grandTotalCommission,
    },
    statements: statementResults,
  });
});
```

---

#### 6.3 — Pasos para desplegar las Edge Functions

Ejecutar los siguientes comandos desde la raíz del proyecto. Se requiere tener instalado el [Supabase CLI](https://supabase.com/docs/guides/cli).

##### Prerequisito — Vincular el proyecto local con Supabase

```bash
# Si aún no está vinculado:
bunx supabase login
bunx supabase link --project-ref czaiyunauxgfvdmvqxsw
```

##### Crear los archivos de las funciones

*(Nota: Si los archivos ya existen en tu carpeta `supabase/functions`, **salta este paso** y ve directamente a "Desplegar")*

```bash
bunx supabase functions new generate-billing-statement
bunx supabase functions new close-billing-period
```

Esto crea la estructura:
```
supabase/
└── functions/
    ├── generate-billing-statement/
    │   └── index.ts
    └── close-billing-period/
    │   └── index.ts
```

Copiar el código de los apartados **6.1** y **6.2** en sus respectivos `index.ts`.

##### Desplegar ambas funciones

```bash
# Desplegar generate-billing-statement
bunx supabase functions deploy generate-billing-statement --no-verify-jwt

# Desplegar close-billing-period
bunx supabase functions deploy close-billing-period --no-verify-jwt
```

> **Nota sobre `--no-verify-jwt`:** Las funciones reciben el JWT del cliente y lo validan internamente contra Supabase Auth para verificar el rol `admin`. Por eso se pasa `--no-verify-jwt` al CLI (la verificación la hace el código, no el gateway de Supabase).

##### Verificar el despliegue

```bash
bunx supabase functions list
```

Ambas funciones deben aparecer con estado `active`.

##### Probar manualmente (curl)

Obtener el JWT de sesión de un usuario admin desde la app o desde Supabase Studio → Authentication → Users → "Copy JWT".

```bash
# Probar generate-billing-statement
curl -X POST https://czaiyunauxgfvdmvqxsw.supabase.co/functions/v1/generate-billing-statement \
  -H "Authorization: Bearer <JWT_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"billing_period_id": "<UUID_PERIODO>", "business_id": "<UUID_NEGOCIO>"}'

# Probar close-billing-period
curl -X POST https://czaiyunauxgfvdmvqxsw.supabase.co/functions/v1/close-billing-period \
  -H "Authorization: Bearer <JWT_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"billing_period_id": "<UUID_PERIODO>"}'
```

##### Ver logs en tiempo real (debugging)

```bash
bunx supabase functions logs generate-billing-statement --tail
bunx supabase functions logs close-billing-period --tail
```

---

## Guía operativa quincenal

| Momento | Acción | Método |
|---|---|---|
| Día 1 o 16 del mes | Abrir nuevo periodo | SQL — Sección 5 (seed) |
| Durante la quincena | Captura automática de comisiones | Trigger automático |
| Día 15 o último del mes | Cerrar quincena y generar documentos | Botón admin → `close-billing-period` |
| Tras el cobro | Marcar statement como `paid` | SQL o botón admin |
| En cualquier momento | Auditar órdenes sin comisión | SQL — tabla `order_commissions` |
