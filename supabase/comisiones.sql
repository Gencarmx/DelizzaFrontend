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


