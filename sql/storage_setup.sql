-- ============================================================================
-- CONFIGURACIÓN DE SUPABASE STORAGE PARA IMÁGENES DE PRODUCTOS
-- ============================================================================
-- Este script configura el almacenamiento de imágenes en Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREAR BUCKET PARA IMÁGENES DE PRODUCTOS
-- ----------------------------------------------------------------------------
-- Nota: También puedes crear el bucket desde el Dashboard UI
-- Storage > Create a new bucket > product-images

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true, -- Bucket público para que las URLs sean accesibles
  5242880, -- 5MB en bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. POLÍTICAS DE SEGURIDAD (RLS) PARA STORAGE
-- ----------------------------------------------------------------------------

-- Habilitar RLS en storage.objects (si no está habilitado)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2.1 POLÍTICA: Subir imágenes (INSERT)
-- ----------------------------------------------------------------------------
-- Los dueños de restaurantes pueden subir imágenes solo a su carpeta
CREATE POLICY "Owners can upload to their business folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND (storage.foldername(name))[1] IN (
    SELECT b.id::text 
    FROM businesses b 
    WHERE b.owner_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- 2.2 POLÍTICA: Ver imágenes (SELECT)
-- ----------------------------------------------------------------------------
-- Todos pueden ver las imágenes (bucket público)
CREATE POLICY "Public images are viewable by everyone"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- ----------------------------------------------------------------------------
-- 2.3 POLÍTICA: Actualizar imágenes (UPDATE)
-- ----------------------------------------------------------------------------
-- Los dueños pueden actualizar imágenes de su restaurante
CREATE POLICY "Owners can update their business images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN (
    SELECT b.id::text 
    FROM businesses b 
    WHERE b.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN (
    SELECT b.id::text 
    FROM businesses b 
    WHERE b.owner_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- 2.4 POLÍTICA: Eliminar imágenes (DELETE)
-- ----------------------------------------------------------------------------
-- Los dueños pueden eliminar imágenes de su restaurante
CREATE POLICY "Owners can delete their business images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN (
    SELECT b.id::text 
    FROM businesses b 
    WHERE b.owner_id = auth.uid()
  )
);

-- ----------------------------------------------------------------------------
-- 3. FUNCIONES AUXILIARES
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 3.1 FUNCIÓN: Obtener tamaño total de almacenamiento por restaurante
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_business_storage_size(business_uuid UUID)
RETURNS BIGINT AS $$
DECLARE
  total_size BIGINT;
BEGIN
  SELECT COALESCE(SUM((metadata->>'size')::BIGINT), 0)
  INTO total_size
  FROM storage.objects
  WHERE bucket_id = 'product-images'
  AND name LIKE business_uuid::text || '/%';
  
  RETURN total_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario de la función
COMMENT ON FUNCTION get_business_storage_size IS 
'Calcula el tamaño total en bytes de todas las imágenes de un restaurante';

-- ----------------------------------------------------------------------------
-- 3.2 FUNCIÓN: Limpiar imágenes huérfanas (sin producto asociado)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_orphan_images()
RETURNS TABLE(deleted_count INTEGER, freed_bytes BIGINT) AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_freed_bytes BIGINT := 0;
  v_image RECORD;
BEGIN
  -- Buscar imágenes que no están referenciadas en la tabla products
  FOR v_image IN
    SELECT o.name, (o.metadata->>'size')::BIGINT as size
    FROM storage.objects o
    WHERE o.bucket_id = 'product-images'
    AND o.name NOT LIKE '%/temp_%' -- Excluir imágenes temporales recientes
    AND NOT EXISTS (
      SELECT 1 
      FROM products p 
      WHERE p.image_url LIKE '%' || o.name || '%'
    )
    AND o.created_at < NOW() - INTERVAL '1 day' -- Solo imágenes de más de 1 día
  LOOP
    -- Eliminar la imagen
    DELETE FROM storage.objects
    WHERE bucket_id = 'product-images'
    AND name = v_image.name;
    
    v_deleted_count := v_deleted_count + 1;
    v_freed_bytes := v_freed_bytes + COALESCE(v_image.size, 0);
  END LOOP;
  
  RETURN QUERY SELECT v_deleted_count, v_freed_bytes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario de la función
COMMENT ON FUNCTION cleanup_orphan_images IS 
'Elimina imágenes que no están asociadas a ningún producto (más de 1 día de antigüedad)';

-- ----------------------------------------------------------------------------
-- 3.3 FUNCIÓN: Obtener estadísticas de almacenamiento
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_storage_stats()
RETURNS TABLE(
  total_images INTEGER,
  total_size_bytes BIGINT,
  total_size_mb NUMERIC,
  businesses_count INTEGER,
  avg_size_per_business_mb NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_images,
    COALESCE(SUM((metadata->>'size')::BIGINT), 0) as total_size_bytes,
    ROUND(COALESCE(SUM((metadata->>'size')::BIGINT), 0) / 1024.0 / 1024.0, 2) as total_size_mb,
    COUNT(DISTINCT (storage.foldername(name))[1])::INTEGER as businesses_count,
    ROUND(
      COALESCE(SUM((metadata->>'size')::BIGINT), 0) / 1024.0 / 1024.0 / 
      NULLIF(COUNT(DISTINCT (storage.foldername(name))[1]), 0),
      2
    ) as avg_size_per_business_mb
  FROM storage.objects
  WHERE bucket_id = 'product-images';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario de la función
COMMENT ON FUNCTION get_storage_stats IS 
'Obtiene estadísticas generales del almacenamiento de imágenes';

-- ----------------------------------------------------------------------------
-- 4. TRIGGERS PARA LIMPIEZA AUTOMÁTICA
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 4.1 TRIGGER: Eliminar imagen cuando se elimina un producto
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_product_image_on_product_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_image_path TEXT;
BEGIN
  -- Extraer el path de la imagen de la URL
  IF OLD.image_url IS NOT NULL THEN
    -- Extraer el path después de 'product-images/'
    v_image_path := substring(OLD.image_url from 'product-images/(.+)$');
    
    IF v_image_path IS NOT NULL THEN
      -- Eliminar la imagen del storage
      DELETE FROM storage.objects
      WHERE bucket_id = 'product-images'
      AND name = v_image_path;
      
      RAISE NOTICE 'Imagen eliminada: %', v_image_path;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_delete_product_image ON products;
CREATE TRIGGER trigger_delete_product_image
  BEFORE DELETE ON products
  FOR EACH ROW
  EXECUTE FUNCTION delete_product_image_on_product_delete();

-- Comentario del trigger
COMMENT ON TRIGGER trigger_delete_product_image ON products IS 
'Elimina automáticamente la imagen del storage cuando se elimina un producto';

-- ----------------------------------------------------------------------------
-- 4.2 TRIGGER: Eliminar imagen antigua cuando se actualiza
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_old_product_image_on_update()
RETURNS TRIGGER AS $$
DECLARE
  v_old_image_path TEXT;
BEGIN
  -- Solo si la URL de la imagen cambió
  IF OLD.image_url IS NOT NULL 
     AND NEW.image_url IS DISTINCT FROM OLD.image_url THEN
    
    -- Extraer el path de la imagen antigua
    v_old_image_path := substring(OLD.image_url from 'product-images/(.+)$');
    
    IF v_old_image_path IS NOT NULL THEN
      -- Eliminar la imagen antigua del storage
      DELETE FROM storage.objects
      WHERE bucket_id = 'product-images'
      AND name = v_old_image_path;
      
      RAISE NOTICE 'Imagen antigua eliminada: %', v_old_image_path;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_delete_old_product_image ON products;
CREATE TRIGGER trigger_delete_old_product_image
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION delete_old_product_image_on_update();

-- Comentario del trigger
COMMENT ON TRIGGER trigger_delete_old_product_image ON products IS 
'Elimina automáticamente la imagen antigua del storage cuando se actualiza la URL de la imagen';

-- ----------------------------------------------------------------------------
-- 5. VISTAS ÚTILES
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 5.1 VISTA: Imágenes por restaurante
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_business_images AS
SELECT 
  (storage.foldername(o.name))[1]::UUID as business_id,
  b.name as business_name,
  COUNT(*) as image_count,
  SUM((o.metadata->>'size')::BIGINT) as total_size_bytes,
  ROUND(SUM((o.metadata->>'size')::BIGINT) / 1024.0 / 1024.0, 2) as total_size_mb,
  MAX(o.created_at) as last_upload
FROM storage.objects o
LEFT JOIN businesses b ON b.id = (storage.foldername(o.name))[1]::UUID
WHERE o.bucket_id = 'product-images'
GROUP BY (storage.foldername(o.name))[1], b.name
ORDER BY total_size_bytes DESC;

-- Comentario de la vista
COMMENT ON VIEW v_business_images IS 
'Vista con estadísticas de imágenes agrupadas por restaurante';

-- ----------------------------------------------------------------------------
-- 5.2 VISTA: Imágenes huérfanas
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_orphan_images AS
SELECT 
  o.name,
  o.created_at,
  (o.metadata->>'size')::BIGINT as size_bytes,
  ROUND((o.metadata->>'size')::BIGINT / 1024.0 / 1024.0, 2) as size_mb,
  AGE(NOW(), o.created_at) as age
FROM storage.objects o
WHERE o.bucket_id = 'product-images'
AND o.name NOT LIKE '%/temp_%'
AND NOT EXISTS (
  SELECT 1 
  FROM products p 
  WHERE p.image_url LIKE '%' || o.name || '%'
)
ORDER BY o.created_at DESC;

-- Comentario de la vista
COMMENT ON VIEW v_orphan_images IS 
'Vista de imágenes que no están asociadas a ningún producto';

-- ----------------------------------------------------------------------------
-- 6. ÍNDICES PARA MEJOR RENDIMIENTO
-- ----------------------------------------------------------------------------

-- Índice en products.image_url para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_products_image_url 
ON products(image_url) 
WHERE image_url IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 7. VERIFICACIÓN DE LA CONFIGURACIÓN
-- ----------------------------------------------------------------------------

-- Verificar que el bucket existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'product-images') THEN
    RAISE NOTICE '✅ Bucket "product-images" creado correctamente';
  ELSE
    RAISE WARNING '❌ Bucket "product-images" NO existe';
  END IF;
END $$;

-- Verificar políticas
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%product-images%' OR policyname LIKE '%business%';
  
  RAISE NOTICE '✅ Políticas de seguridad creadas: %', policy_count;
END $$;

-- Mostrar estadísticas iniciales
SELECT * FROM get_storage_stats();

-- ============================================================================
-- FIN DE LA CONFIGURACIÓN
-- ============================================================================

-- Para ejecutar limpieza manual de imágenes huérfanas:
-- SELECT * FROM cleanup_orphan_images();

-- Para ver estadísticas de almacenamiento:
-- SELECT * FROM get_storage_stats();

-- Para ver imágenes por restaurante:
-- SELECT * FROM v_business_images;

-- Para ver imágenes huérfanas:
-- SELECT * FROM v_orphan_images;
