# Solución al Error RLS en business_hours

## 🔴 Problema Identificado

El error `new row violates row-level security policy for table "business_hours"` ocurre porque:

1. **Política actual obsoleta**: La política "Business members can manage hours" depende de la tabla `collaborators`
2. **Tabla descontinuada**: La tabla `collaborators` ya no se utiliza en el proyecto
3. **Bloqueo de inserción**: Sin una política válida, Supabase bloquea todas las operaciones de INSERT

### Política Problemática Actual
```sql
-- Esta política NO FUNCIONA porque busca en collaborators
CREATE POLICY "Business members can manage hours"
ON business_hours
FOR ALL
USING (
  business_id IN (
    SELECT collaborators.business_id
    FROM collaborators
    WHERE collaborators.user_id IN (
      SELECT profiles.id
      FROM profiles
      WHERE profiles.user_id = auth.uid()
    )
    AND collaborators.role = ANY (ARRAY['owner'::text, 'seller'::text])
    AND collaborators.status = 'active'::text
  )
);
```

## ✅ Solución Implementada

He creado dos archivos SQL con las nuevas políticas:

### 1. `supabase_rls_quick_fix.sql` (RECOMENDADO - Solución Rápida)
- Políticas simplificadas y directas
- Fácil de implementar
- Cubre todos los casos de uso actuales

### 2. `supabase_rls_policies_business_hours.sql` (Completo)
- Políticas detalladas por operación (SELECT, INSERT, UPDATE, DELETE)
- Mayor granularidad
- Mejor para proyectos complejos

## 📋 Pasos para Implementar

### Opción A: Solución Rápida (Recomendada)

1. **Abre Supabase Dashboard**
   - Ve a tu proyecto en https://supabase.com
   - Navega a: SQL Editor

2. **Ejecuta el script**
   - Copia el contenido de `supabase_rls_quick_fix.sql`
   - Pégalo en el SQL Editor
   - Haz clic en "Run"

3. **Verifica la implementación**
   ```sql
   SELECT policyname, cmd, qual 
   FROM pg_policies 
   WHERE tablename = 'business_hours';
   ```

### Opción B: Solución Completa

1. Ejecuta `supabase_rls_policies_business_hours.sql` en el SQL Editor
2. Verifica con la misma query de arriba

## 🔍 Cómo Funcionan las Nuevas Políticas

### Política 1: Gestión por Dueños
```sql
-- Permite a los dueños hacer TODO (SELECT, INSERT, UPDATE, DELETE)
-- Verifica que el usuario autenticado sea el dueño del negocio
EXISTS (
  SELECT 1
  FROM businesses b
  JOIN profiles p ON b.owner_id = p.id
  WHERE b.id = business_hours.business_id
    AND p.user_id = auth.uid()
)
```

**Flujo de verificación:**
1. Usuario autenticado → `auth.uid()`
2. Busca su perfil → `profiles.user_id = auth.uid()`
3. Verifica que sea dueño → `businesses.owner_id = profiles.id`
4. Permite operación si coincide el `business_id`

### Política 2: Lectura Pública
```sql
-- Permite a cualquiera ver horarios activos de negocios activos
active = true 
AND EXISTS (
  SELECT 1 
  FROM businesses 
  WHERE id = business_hours.business_id 
    AND active = true
)
```

## 🧪 Pruebas Post-Implementación

Después de ejecutar el script, prueba lo siguiente:

### 1. Verificar políticas activas
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'business_hours'
ORDER BY policyname;
```

### 2. Probar inserción manual
```sql
-- Reemplaza los UUIDs con valores reales de tu base de datos
INSERT INTO business_hours (
  business_id,
  day_of_week,
  open_time,
  close_time,
  active
) VALUES (
  'tu-business-id-aqui',
  1,
  '09:00',
  '21:00',
  true
);
```

### 3. Probar desde la aplicación
- Inicia sesión como dueño de un restaurante
- Ve a Configuración → Horarios de atención
- Intenta guardar los horarios
- Debería funcionar sin errores

## 🔧 Troubleshooting

### Error: "permission denied for table businesses"
**Solución**: Verifica que RLS esté habilitado en la tabla `businesses` y que tengas políticas de lectura:
```sql
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their businesses"
ON businesses FOR SELECT
TO authenticated
USING (
  owner_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);
```

### Error: "null value in column business_id"
**Solución**: Verifica que `businessId` se esté pasando correctamente desde el contexto:
```typescript
// En BusinessHours.tsx
const { businessId } = useRestaurantNotifications();
console.log('Business ID:', businessId); // Debe tener un valor UUID
```

### Error: "user_id does not exist in profiles"
**Solución**: Asegúrate de que el usuario tenga un perfil creado:
```sql
-- Verificar perfil del usuario actual
SELECT * FROM profiles WHERE user_id = auth.uid();

-- Si no existe, crear uno
INSERT INTO profiles (user_id, phone_number, full_name, user_role)
VALUES (auth.uid(), '+1234567890', 'Nombre Usuario', 'owner');
```

## 📊 Estructura de Datos Requerida

Para que las políticas funcionen, necesitas:

```
auth.users (Supabase Auth)
    ↓ user_id
profiles
    ↓ id (owner_id)
businesses
    ↓ id (business_id)
business_hours
```

### Verificar relaciones
```sql
-- Verificar que tu usuario tiene perfil
SELECT 
  u.id as auth_user_id,
  p.id as profile_id,
  p.full_name,
  p.user_role
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.id = auth.uid();

-- Verificar que el perfil tiene negocios
SELECT 
  b.id as business_id,
  b.name,
  b.owner_id,
  p.full_name as owner_name
FROM businesses b
JOIN profiles p ON b.owner_id = p.id
WHERE p.user_id = auth.uid();
```

## 🎯 Resumen

**Antes:**
- ❌ Política dependía de tabla `collaborators` (descontinuada)
- ❌ Inserciones bloqueadas por RLS
- ❌ Error 42501 en consola

**Después:**
- ✅ Políticas basadas en relación directa `businesses.owner_id`
- ✅ Dueños pueden gestionar horarios de sus negocios
- ✅ Público puede ver horarios activos
- ✅ Sin dependencias de tablas obsoletas

## 📞 Soporte Adicional

Si después de implementar las políticas sigues teniendo problemas:

1. Verifica los logs de Supabase en el Dashboard
2. Revisa que el usuario esté autenticado correctamente
3. Confirma que el `businessId` sea válido
4. Verifica que el usuario sea el dueño del negocio en la tabla `businesses`
