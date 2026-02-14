-- =====================================================
-- CONSULTAR POLÍTICAS RLS DEL BUCKET business-logos
-- =====================================================

-- 1. Verificar si el bucket existe
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets
WHERE name = 'business-logos';

-- 2. Consultar políticas de storage.objects (forma correcta)
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname ILIKE '%business-logos%'
ORDER BY policyname;

-- 3. Ver TODAS las políticas de storage.objects
SELECT
    policyname AS "Nombre de Política",
    cmd AS "Operación",
    roles AS "Roles",
    CASE
        WHEN cmd = 'SELECT' THEN 'Lectura'
        WHEN cmd = 'INSERT' THEN 'Inserción'
        WHEN cmd = 'UPDATE' THEN 'Actualización'
        WHEN cmd = 'DELETE' THEN 'Eliminación'
        ELSE cmd
    END AS "Tipo"
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY cmd, policyname;

-- =====================================================
-- CREAR POLÍTICAS RLS PARA business-logos
-- =====================================================

-- POLÍTICA 1: Permitir lectura pública de logos (SELECT)
CREATE POLICY "Public read access to business logos"
ON storage.objects
FOR SELECT
TO public, authenticated
USING (
    bucket_id = 'business-logos'
);

-- POLÍTICA 2: Permitir a los dueños subir logos (INSERT)
CREATE POLICY "Owners can upload business logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'business-logos'
    AND auth.uid() IN (
        SELECT p.user_id 
        FROM profiles p
        INNER JOIN businesses b ON b.owner_id = p.id
        WHERE b.id::text = (storage.foldername(name))[1]
    )
);

-- POLÍTICA 3: Permitir a los dueños actualizar logos (UPDATE)
CREATE POLICY "Owners can update business logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'business-logos'
    AND auth.uid() IN (
        SELECT p.user_id 
        FROM profiles p
        INNER JOIN businesses b ON b.owner_id = p.id
        WHERE b.id::text = (storage.foldername(name))[1]
    )
);

-- POLÍTICA 4: Permitir a los dueños eliminar logos (DELETE)
CREATE POLICY "Owners can delete business logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'business-logos'
    AND auth.uid() IN (
        SELECT p.user_id 
        FROM profiles p
        INNER JOIN businesses b ON b.owner_id = p.id
        WHERE b.id::text = (storage.foldername(name))[1]
    )
);

-- =====================================================
-- ELIMINAR POLÍTICAS (si necesitas recrearlas)
-- =====================================================

-- DROP POLICY IF EXISTS "Public read access to business logos" ON storage.objects;
-- DROP POLICY IF EXISTS "Owners can upload business logos" ON storage.objects;
-- DROP POLICY IF EXISTS "Owners can update business logos" ON storage.objects;
-- DROP POLICY IF EXISTS "Owners can delete business logos" ON storage.objects;

-- =====================================================
-- VERIFICAR QUE LAS POLÍTICAS SE CREARON CORRECTAMENTE
-- =====================================================

SELECT
    policyname AS "Política",
    cmd AS "Operación",
    roles AS "Roles",
    CASE
        WHEN cmd = 'SELECT' THEN 'Permite leer/descargar logos'
        WHEN cmd = 'INSERT' THEN 'Permite subir nuevos logos'
        WHEN cmd = 'UPDATE' THEN 'Permite actualizar logos existentes'
        WHEN cmd = 'DELETE' THEN 'Permite eliminar logos'
    END AS "Descripción",
    qual AS "Condición USING",
    with_check AS "Condición WITH CHECK"
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname ILIKE '%business%logo%'
ORDER BY
    CASE cmd
        WHEN 'SELECT' THEN 1
        WHEN 'INSERT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
    END;

-- =====================================================
-- PROBAR ACCESO (ejecutar como usuario autenticado)
-- =====================================================

-- Ver el user_id actual
SELECT auth.uid() AS "Mi User ID";

-- Ver mi perfil
SELECT id, user_id, full_name
FROM profiles
WHERE user_id = auth.uid();

-- Ver mis negocios
SELECT b.id, b.name, b.owner_id
FROM businesses b
INNER JOIN profiles p ON p.id = b.owner_id
WHERE p.user_id = auth.uid();

-- Verificar si puedo subir a una carpeta específica
-- Reemplaza 'TU_BUSINESS_ID' con el ID real de tu negocio
SELECT
    auth.uid() IN (
        SELECT p.user_id
        FROM profiles p
        INNER JOIN businesses b ON b.owner_id = p.id
        WHERE b.id::text = 'TU_BUSINESS_ID'
    ) AS "Puedo subir logo";

-- =====================================================
-- CONSULTAS ADICIONALES DE DIAGNÓSTICO
-- =====================================================

-- Ver estructura de la tabla storage.objects
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'storage'
  AND table_name = 'objects'
ORDER BY ordinal_position;

-- Ver todos los buckets disponibles
SELECT id, name, public, created_at
FROM storage.buckets
ORDER BY created_at DESC;

-- Contar archivos en el bucket business-logos
SELECT COUNT(*) as total_archivos
FROM storage.objects
WHERE bucket_id = 'business-logos';

-- Ver archivos en el bucket (si existen)
SELECT
    name,
    bucket_id,
    owner,
    created_at,
    updated_at,
    last_accessed_at,
    metadata
FROM storage.objects
WHERE bucket_id = 'business-logos'
ORDER BY created_at DESC
LIMIT 10;
