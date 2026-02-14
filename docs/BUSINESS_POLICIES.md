# 🏪 Políticas RLS y Guía de Uso - Tabla `businesses`

## 📋 Información General

Este documento describe las políticas de Row Level Security (RLS) y el uso correcto de la tabla `businesses` en Supabase.

## 🗂️ Estructura de la Tabla

### Campos de la Tabla `businesses`

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  address TEXT,
  logo_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Relaciones

- `owner_id` → `profiles.id` (Foreign Key)
- `profiles.user_id` → `auth.uid()` (Relación indirecta)

## 🔒 Políticas RLS (Row Level Security)

### 1. Política: "Allow insert businesses"

**Propósito:** Permite a usuarios con rol 'owner' crear nuevos restaurantes.

```sql
ALTER POLICY "Allow insert businesses"
ON "public"."businesses"
TO public
WITH CHECK (
  (EXISTS ( SELECT 1
     FROM profiles
    WHERE ((profiles.user_id = auth.uid()) AND (profiles.user_role = 'owner'::text))))
);
```

**Condición:** Solo usuarios autenticados con `user_role = 'owner'` pueden insertar.

### 2. Política: "Owners can view businesses"

**Propósito:** Permite a los propietarios ver únicamente sus propios restaurantes.

```sql
ALTER POLICY "Owners can view businesses"
ON "public"."businesses"
TO authenticated
USING (
  (EXISTS ( SELECT 1
     FROM profiles
    WHERE ((profiles.id = businesses.owner_id) AND (profiles.user_id = auth.uid()))))
);
```

**Condición:** El usuario autenticado debe ser el propietario del restaurante.

### 3. Política: "Owners can update businesses"

**Propósito:** Permite a los propietarios actualizar únicamente sus propios restaurantes.

```sql
ALTER POLICY "Owners can update businesses"
ON "public"."businesses"
TO public
USING (
  (owner_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ))
)
WITH CHECK (
  (owner_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ))
);
```

**Condición:** El usuario debe ser el propietario del restaurante.

### 4. Política: "Owners can delete businesses"

**Propósito:** Permite a los propietarios eliminar únicamente sus propios restaurantes.

```sql
ALTER POLICY "Owners can delete businesses"
ON "public"."businesses"
TO public
USING (
  (owner_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ))
);
```

**Condición:** El usuario debe ser el propietario del restaurante.

## 🔧 Uso Correcto en el Código

### Función `getBusinessByOwner(userId: string)`

**Propósito:** Obtener el restaurante de un propietario específico.

```typescript
export async function getBusinessByOwner(userId: string): Promise<Business | null> {
  try {
    // 1. Obtener el perfil del usuario usando auth.uid()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId) // userId = auth.uid()
      .single();

    if (profileError || !profile) return null;

    // 2. Buscar el business usando profile.id
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', profile.id) // profile.id = businesses.owner_id
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error obteniendo restaurante por owner:', error);
    throw new Error('No se pudo obtener el restaurante');
  }
}
```

**Flujo correcto:**
1. `user.id` (auth.uid) → Buscar en `profiles.user_id`
2. Obtener `profiles.id`
3. Usar `profiles.id` para buscar en `businesses.owner_id`

### Función `createBusiness(businessData)`

**Propósito:** Crear un nuevo restaurante.

```typescript
export async function createBusiness(businessData: {
  name: string;
  owner_id: string; // Debe ser profiles.id, NO auth.uid()
  address?: string;
  logo_url?: string;
}): Promise<Business> {
  // Validar que owner_id existe en profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_role')
    .eq('id', businessData.owner_id)
    .eq('user_role', 'owner')
    .single();

  if (!profile) {
    throw new Error('Perfil de propietario no válido');
  }

  // Crear el business
  const { data, error } = await supabase
    .from('businesses')
    .insert({
      name: businessData.name,
      owner_id: businessData.owner_id, // profiles.id
      address: businessData.address,
      logo_url: businessData.logo_url,
      active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

## ⚠️ Consideraciones Importantes

### 1. **Relaciones de Claves**

```
auth.users (Supabase Auth)
    ↓
profiles.user_id (UUID)
    ↓
profiles.id (UUID) ← businesses.owner_id (Foreign Key)
```

### 2. **Errores Comunes**

#### ❌ Error 406 (Not Acceptable)
**Causa:** Consulta incorrecta que no cumple con RLS.
```typescript
// INCORRECTO - Causará error 406
.eq('owner_id', user.id) // user.id = auth.uid()
```

#### ✅ Solución Correcta
```typescript
// CORRECTO - Compatible con RLS
const profile = await supabase
  .from('profiles')
  .select('id')
  .eq('user_id', user.id) // auth.uid()
  .single();

.eq('owner_id', profile.id) // profiles.id
```

### 3. **Validaciones Requeridas**

- ✅ Verificar que el usuario esté autenticado
- ✅ Verificar que el perfil existe en `profiles`
- ✅ Verificar que `user_role = 'owner'` para crear negocios
- ✅ Usar `profiles.id` para consultas, no `auth.uid()`

## 📊 Consultas de Ejemplo

### Obtener todos los negocios de un usuario

```typescript
const { data: businesses } = await supabase
  .from('businesses')
  .select('*')
  .eq('owner_id', profileId); // profileId = profiles.id
```

### Obtener negocio con información del perfil

```typescript
const { data: business } = await supabase
  .from('businesses')
  .select(`
    *,
    profiles:owner_id (
      full_name,
      phone_number
    )
  `)
  .eq('id', businessId)
  .single();
```

## 🔍 Debugging

### Verificar perfil del usuario

```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', auth.uid());

console.log('Perfil del usuario:', profile);
```

### Verificar permisos

```typescript
const { data: businesses } = await supabase
  .from('businesses')
  .select('*');

console.log('Negocios accesibles:', businesses);
```

## 📝 Notas para Desarrolladores

1. **Siempre usar `profiles.id`** para consultas a `businesses.owner_id`
2. **Nunca usar `auth.uid()`** directamente en consultas a businesses
3. **Validar existencia del perfil** antes de crear negocios
4. **Verificar rol 'owner'** para operaciones de creación
5. **Manejar errores 406** revisando las políticas RLS

## 🏗️ Migraciones Futuras

Si se modifican las políticas RLS, actualizar:
- Este documento
- Las funciones en `businessService.ts`
- Los tipos en `types.ts`
- Las pruebas unitarias

---

**Última actualización:** Diciembre 2024
**Versión:** 1.0
**Autor:** Sistema de Documentación Delizza
