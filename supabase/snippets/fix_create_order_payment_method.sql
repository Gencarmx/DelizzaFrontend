-- Fix: Agregar 'mercado_pago' como método de pago válido en create_order_with_items
-- Ejecutar en el SQL Editor de Supabase

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_business_id    UUID,
  p_customer_id    UUID,
  p_customer_name  TEXT,
  p_total          NUMERIC,
  p_delivery_type  TEXT,
  p_payment_method TEXT,
  p_items          JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id   UUID;
  v_created_at TIMESTAMPTZ;
  v_item       JSONB;
BEGIN
  -- Validaciones básicas
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'business_id es requerido';
  END IF;
  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id es requerido';
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El pedido debe contener al menos un item';
  END IF;
  IF p_delivery_type NOT IN ('pickup', 'delivery') THEN
    RAISE EXCEPTION 'delivery_type inválido: %', p_delivery_type;
  END IF;
  IF p_payment_method NOT IN ('card', 'cash', 'mercado_pago') THEN
    RAISE EXCEPTION 'payment_method inválido: %', p_payment_method;
  END IF;

  -- 1. Insertar la orden
  INSERT INTO orders (
    business_id, customer_id, customer_name,
    status, total, delivery_type, payment_method
  )
  VALUES (
    p_business_id, p_customer_id, p_customer_name,
    'pending', p_total, p_delivery_type, p_payment_method
  )
  RETURNING id, created_at INTO v_order_id, v_created_at;

  -- 2. Insertar los items — incluye la columna addons
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id, product_id, product_name,
      price, quantity, addons
    )
    VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      (v_item->>'price')::NUMERIC,
      (v_item->>'quantity')::INTEGER,
      CASE
        WHEN v_item->'addons' IS NOT NULL
          AND v_item->>'addons' != 'null'
          AND jsonb_array_length(v_item->'addons') > 0
        THEN (v_item->'addons')::JSONB
        ELSE NULL
      END
    );
  END LOOP;

  -- 3. Retornar el resultado al cliente
  RETURN jsonb_build_object(
    'order_id',   v_order_id,
    'created_at', v_created_at
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creando pedido: % — %', SQLERRM, SQLSTATE;
END;
$$;
