# 📸 Guía Completa: Implementación de Almacenamiento de Imágenes en Supabase

## 📋 Índice
1. [Análisis del Estado Actual](#análisis-del-estado-actual)
2. [Configuración de Supabase Storage](#configuración-de-supabase-storage)
3. [Políticas de Seguridad (RLS)](#políticas-de-seguridad-rls)
4. [Implementación Paso a Paso](#implementación-paso-a-paso)
5. [Testing y Validación](#testing-y-validación)
6. [Troubleshooting](#troubleshooting)

---

## 📊 Análisis del Estado Actual

### ✅ Lo que YA está implementado:

1. **Frontend (ProductAdd.tsx)**
   - ✅ Selector de archivos de imagen
   - ✅ Vista previa de imagen
   - ✅ Validación de tipo de archivo
   - ✅ Manejo de estado de imagen seleccionada
   - ✅ Llamada a `uploadProductImage()` antes de crear producto

2. **Backend (productService.ts)**
   - ✅ Función `uploadProductImage()` completa
   - ✅ Validación de tipo de archivo (solo imágenes)
   - ✅ Validación de tamaño (máx 5MB)
   - ✅ Generación de nombres únicos
   - ✅ Obtención de URL pública
   - ✅ Función `deleteProductImage()` para limpieza

### ⚠️ Lo que FALTA configurar:

1. **En Supabase Dashboard:**
   - ❌ Crear el bucket `product-images`
   - ❌ Configurar políticas de acceso (RLS)
   - ❌ Configurar CORS si es necesario

2. **Validaciones adicionales:**
   - ⚠️ Límite de almacenamiento por restaurante
   - ⚠️ Optimización de imágenes (resize automático)
   - ⚠️ Limpieza de imágenes huérfanas

---

## 🔧 Configuración de Supabase Storage

### Paso 1: Crear el Bucket de Almacenamiento

1. **Accede a tu proyecto de Supabase:**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Navega a Storage:**
   - En el menú lateral, haz clic en "Storage"
   - Haz clic en "Create a new bucket"

3. **Configurar el bucket:**
   ```
   Nombre del bucket: product-images
   Public bucket: ✅ SÍ (para que las URLs sean públicas)
   File size limit: 5242880 (5MB en bytes)
   Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
   ```

4. **Haz clic en "Create bucket"**

### Paso 2: Verificar la Estructura del Bucket

El bucket debe permitir esta estructura de carpetas:
```
product-images/
├── {business_id_1}/
│   ├── {product_id}_timestamp.jpg
│   ├── {product_id}_timestamp.png
│   └── temp_timestamp.jpg (imágenes temporales)
├── {business_id_2}/
│   └── ...
```

---

## 🔒 Políticas de Seguridad (RLS)

### Paso 3: Configurar Row Level Security

1. **En Supabase Dashboard, ve a Storage > product-images > Policies**

2. **Crear política para UPLOAD (Subir imágenes):**

```sql
-- Política: Los dueños de restaurantes pueden subir imágenes a su carpeta
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

3. **Crear política para SELECT (Ver imágenes):**

```sql
-- Política: Todos pueden ver las imágenes (bucket público)
CREATE POLICY "Public images are viewable by everyone"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');
```

4. **Crear política para UPDATE (Actualizar imágenes):**

```sql
-- Política: Los dueños pueden actualizar imágenes de su restaurante
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
```

5. **Crear política para DELETE (Eliminar imágenes):**

```sql
-- Política: Los dueños pueden eliminar imágenes de su restaurante
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

---

## 🚀 Implementación Paso a Paso

### Paso 4: Verificar el Código Actual

El código ya está implementado correctamente. Aquí está el flujo:

#### 1. **Usuario selecciona imagen** (ProductAdd.tsx)
```typescript
const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setSelectedImageFile(file);
    // Mostrar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }
};
```

#### 2. **Al enviar formulario, se sube la imagen** (ProductAdd.tsx)
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  // ... validaciones ...
  
  let imageUrl: string | undefined;
  
  // Subir imagen si se seleccionó una
  if (selectedImageFile) {
    imageUrl = await uploadProductImage(selectedImageFile, businessId);
  }
  
  // Crear producto con la URL de la imagen
  const productData = {
    name: formData.name.trim(),
    description: formData.description.trim(),
    price: parseFloat(formData.price),
    business_id: businessId,
    image_url: imageUrl, // ← URL de Supabase Storage
    active: formData.status === "active",
  };
  
  await createProduct(productData);
};
```

#### 3. **Función de subida** (productService.ts)
```typescript
export async function uploadProductImage(
  file: File,
  businessId: string,
  productId?: string
): Promise<string> {
  // Validaciones
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen');
  }
  
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('La imagen no puede ser mayor a 5MB');
  }
  
  // Generar nombre único
  const fileExt = file.name.split('.').pop();
  const fileName = `${businessId}/${productId || 'temp'}_${Date.now()}.${fileExt}`;
  
  // Subir a Supabase Storage
  const { error } = await supabase.storage
    .from('product-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) throw error;
  
  // Obtener URL pública
  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);
  
  return urlData.publicUrl;
}
```

### Paso 5: Configuración Adicional (Opcional pero Recomendado)

#### A. Limitar tamaño de almacenamiento por restaurante

Crear una función en Supabase para verificar el uso de almacenamiento:

```sql
-- Función para obtener el tamaño total de imágenes de un restaurante
CREATE OR REPLACE FUNCTION get_business_storage_size(business_uuid UUID)
RETURNS BIGINT AS $$
DECLARE
  total_size BIGINT;
BEGIN
  SELECT COALESCE(SUM(metadata->>'size')::BIGINT, 0)
  INTO total_size
  FROM storage.objects
  WHERE bucket_id = 'product-images'
  AND name LIKE business_uuid::text || '/%';
  
  RETURN total_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### B. Agregar validación en el frontend

Actualizar `productService.ts`:

```typescript
export async function uploadProductImage(
  file: File,
  businessId: string,
  productId?: string
): Promise<string> {
  // ... validaciones existentes ...
  
  // Verificar límite de almacenamiento (100MB por restaurante)
  const { data: sizeData } = await supabase
    .rpc('get_business_storage_size', { business_uuid: businessId });
  
  const currentSize = sizeData || 0;
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  if (currentSize + file.size > maxSize) {
    throw new Error('Has alcanzado el límite de almacenamiento (100MB)');
  }
  
  // ... resto del código ...
}
```

---

## ✅ Testing y Validación

### Paso 6: Probar la Funcionalidad

#### Test 1: Subir imagen exitosamente
1. Ir a `/restaurant/products/add`
2. Llenar el formulario
3. Seleccionar una imagen (JPG, PNG, WEBP)
4. Enviar formulario
5. **Verificar:**
   - ✅ Imagen se sube a Supabase Storage
   - ✅ URL se guarda en la base de datos
   - ✅ Imagen se muestra en la lista de productos

#### Test 2: Validación de tamaño
1. Intentar subir imagen > 5MB
2. **Verificar:**
   - ✅ Muestra error: "La imagen no puede ser mayor a 5MB"

#### Test 3: Validación de tipo
1. Intentar subir archivo PDF o TXT
2. **Verificar:**
   - ✅ Muestra error: "El archivo debe ser una imagen"

#### Test 4: Permisos de seguridad
1. Usuario A crea producto con imagen
2. Usuario B intenta eliminar imagen de Usuario A
3. **Verificar:**
   - ✅ Usuario B no puede eliminar (403 Forbidden)

### Paso 7: Verificar en Supabase Dashboard

1. **Storage > product-images:**
   - Verifica que las imágenes se están guardando
   - Verifica la estructura de carpetas por `business_id`

2. **Table Editor > products:**
   - Verifica que `image_url` contiene la URL correcta
   - Formato: `https://[project-ref].supabase.co/storage/v1/object/public/product-images/[business_id]/[filename]`

---

## 🔧 Troubleshooting

### Problema 1: Error "Bucket not found"
**Solución:**
- Verifica que el bucket `product-images` existe
- Verifica que el nombre es exactamente `product-images` (sin espacios)

### Problema 2: Error "Permission denied"
**Solución:**
- Verifica que las políticas RLS están creadas
- Verifica que el usuario está autenticado
- Verifica que el `business_id` pertenece al usuario

### Problema 3: Imagen no se muestra
**Solución:**
- Verifica que el bucket es público
- Verifica la URL en la base de datos
- Abre la URL directamente en el navegador

### Problema 4: Error CORS
**Solución:**
```sql
-- En Supabase SQL Editor
ALTER TABLE storage.buckets 
SET (allowed_origins = '["*"]') 
WHERE name = 'product-images';
```

### Problema 5: Imágenes muy grandes
**Solución:**
Implementar compresión en el frontend antes de subir:

```typescript
// Instalar: npm install browser-image-compression
import imageCompression from 'browser-image-compression';

async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  };
  
  return await imageCompression(file, options);
}

// Usar en handleImageChange
const compressedFile = await compressImage(file);
setSelectedImageFile(compressedFile);
```

---

## 📝 Checklist Final

Antes de considerar la implementación completa, verifica:

- [ ] Bucket `product-images` creado en Supabase
- [ ] Bucket configurado como público
- [ ] Políticas RLS creadas (INSERT, SELECT, UPDATE, DELETE)
- [ ] Código de subida funciona correctamente
- [ ] Validaciones de tamaño y tipo implementadas
- [ ] Preview de imagen funciona
- [ ] URL se guarda correctamente en la base de datos
- [ ] Imágenes se muestran en la lista de productos
- [ ] Función de eliminación de imágenes funciona
- [ ] Testing completo realizado

---

## 🎯 Próximos Pasos Recomendados

1. **Optimización de imágenes:**
   - Implementar compresión automática
   - Generar thumbnails para listados
   - Usar formato WebP para mejor compresión

2. **Mejoras de UX:**
   - Barra de progreso durante la subida
   - Drag & drop para imágenes
   - Editor de imágenes básico (crop, rotate)

3. **Gestión avanzada:**
   - Galería de imágenes por producto
   - Limpieza automática de imágenes huérfanas
   - Dashboard de uso de almacenamiento

---

## 📚 Recursos Adicionales

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)
- [Image Optimization Best Practices](https://web.dev/fast/#optimize-your-images)

---

**Última actualización:** 2024
**Versión:** 1.0
