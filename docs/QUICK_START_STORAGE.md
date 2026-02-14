# 🚀 Guía Rápida: Configurar Supabase Storage en 5 Minutos

## ⏱️ Tiempo estimado: 5 minutos

Esta guía te llevará paso a paso para configurar el almacenamiento de imágenes de productos en Supabase.

---

## 📋 Prerrequisitos

- ✅ Cuenta de Supabase activa
- ✅ Proyecto de Supabase creado
- ✅ Acceso al Dashboard de Supabase

---

## 🎯 Opción 1: Configuración Automática (Recomendada)

### Paso 1: Acceder al SQL Editor

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. En el menú lateral, haz clic en **"SQL Editor"**
3. Haz clic en **"New query"**

### Paso 2: Ejecutar el Script

1. Abre el archivo `sql/storage_setup.sql` de este proyecto
2. **Copia TODO el contenido** del archivo
3. **Pega** en el SQL Editor de Supabase
4. Haz clic en **"Run"** (o presiona `Ctrl + Enter`)

### Paso 3: Verificar

Deberías ver mensajes como:
```
✅ Bucket "product-images" creado correctamente
✅ Políticas de seguridad creadas: 4
```

### ✅ ¡Listo! Ya puedes subir imágenes

---

## 🎯 Opción 2: Configuración Manual (Paso a Paso)

Si prefieres hacerlo manualmente o el script automático falla:

### Paso 1: Crear el Bucket

1. En Supabase Dashboard, ve a **"Storage"** en el menú lateral
2. Haz clic en **"Create a new bucket"**
3. Configura así:
   ```
   Nombre: product-images
   Public bucket: ✅ SÍ (marcar checkbox)
   File size limit: 5242880 (5MB en bytes)
   Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
   ```
4. Haz clic en **"Create bucket"**

### Paso 2: Configurar Políticas de Seguridad

1. En Storage, haz clic en el bucket **"product-images"**
2. Ve a la pestaña **"Policies"**
3. Haz clic en **"New Policy"**

#### Política 1: Ver imágenes (SELECT)
```sql
-- Nombre: Public images are viewable by everyone
-- Operación: SELECT
-- Target roles: public

CREATE POLICY "Public images are viewable by everyone"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');
```

#### Política 2: Subir imágenes (INSERT)
```sql
-- Nombre: Owners can upload to their business folder
-- Operación: INSERT
-- Target roles: authenticated

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
```

#### Política 3: Actualizar imágenes (UPDATE)
```sql
-- Nombre: Owners can update their business images
-- Operación: UPDATE
-- Target roles: authenticated

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
);
```

#### Política 4: Eliminar imágenes (DELETE)
```sql
-- Nombre: Owners can delete their business images
-- Operación: DELETE
-- Target roles: authenticated

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
```

### ✅ ¡Configuración manual completada!

---

## 🧪 Probar la Configuración

### Test 1: Verificar el Bucket

1. Ve a **Storage > product-images**
2. Deberías ver el bucket vacío (sin errores)

### Test 2: Probar desde la Aplicación

1. Inicia sesión como dueño de restaurante
2. Ve a **Productos > Agregar Producto**
3. Llena el formulario
4. Selecciona una imagen
5. Haz clic en **"Guardar producto"**

**Resultado esperado:**
- ✅ Producto creado exitosamente
- ✅ Imagen visible en la lista de productos
- ✅ En Supabase Storage > product-images verás la imagen subida

### Test 3: Verificar en Supabase

1. Ve a **Storage > product-images**
2. Deberías ver una carpeta con el ID de tu restaurante
3. Dentro, la imagen subida

---

## ❌ Solución de Problemas

### Error: "Bucket not found"

**Causa:** El bucket no existe o el nombre es incorrecto

**Solución:**
1. Ve a Storage en Supabase
2. Verifica que existe un bucket llamado exactamente `product-images`
3. Si no existe, créalo siguiendo el Paso 1

### Error: "Permission denied" o "403 Forbidden"

**Causa:** Las políticas RLS no están configuradas correctamente

**Solución:**
1. Ve a Storage > product-images > Policies
2. Verifica que existen las 4 políticas (SELECT, INSERT, UPDATE, DELETE)
3. Si faltan, créalas siguiendo el Paso 2

### Error: "File too large"

**Causa:** La imagen es mayor a 5MB

**Solución:**
1. Comprime la imagen antes de subirla
2. O aumenta el límite en la configuración del bucket

### La imagen no se muestra

**Causa:** El bucket no es público

**Solución:**
1. Ve a Storage > product-images > Configuration
2. Marca la opción **"Public bucket"**
3. Guarda los cambios

---

## 📊 Verificar Estadísticas

Después de subir algunas imágenes, puedes ver estadísticas:

```sql
-- En SQL Editor, ejecuta:
SELECT * FROM get_storage_stats();
```

Resultado:
```
total_images | total_size_bytes | total_size_mb | businesses_count | avg_size_per_business_mb
-------------|------------------|---------------|------------------|-------------------------
     5       |    2,458,624     |     2.34      |        2         |          1.17
```

---

## 🧹 Limpieza de Imágenes Huérfanas

Si tienes imágenes que no están asociadas a productos:

```sql
-- Ver imágenes huérfanas
SELECT * FROM v_orphan_images;

-- Eliminar imágenes huérfanas (más de 1 día)
SELECT * FROM cleanup_orphan_images();
```

---

## 📚 Recursos Adicionales

- [Guía Completa de Storage](./SUPABASE_IMAGE_STORAGE_GUIDE.md)
- [Análisis del Flujo de Productos](./PRODUCT_ADD_ANALYSIS.md)
- [Documentación de Supabase Storage](https://supabase.com/docs/guides/storage)

---

## ✅ Checklist Final

Antes de considerar la configuración completa:

- [ ] Bucket `product-images` creado
- [ ] Bucket configurado como público
- [ ] 4 políticas RLS creadas (SELECT, INSERT, UPDATE, DELETE)
- [ ] Probado subir una imagen desde la app
- [ ] Imagen visible en la lista de productos
- [ ] Imagen visible en Supabase Storage

---

## 🎉 ¡Felicidades!

Tu sistema de almacenamiento de imágenes está configurado y listo para producción.

**Próximos pasos:**
1. Agregar productos con imágenes
2. Monitorear el uso de almacenamiento
3. Configurar limpieza automática (opcional)

---

**Última actualización:** 2024
**Tiempo de configuración:** ~5 minutos
