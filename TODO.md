# TODO - Sistema de Autenticación y Roles Completo

## ✅ Completado

### 1. Fix PendingApproval Business Query Issue
- [x] Cambiar `.single()` a `.maybeSingle()` para evitar errores con 0 filas
- [x] Agregar polling mechanism (cada 2 segundos, máx 30 segundos)
- [x] Mejorar manejo de errores
- [x] Agregar botón de logout en PendingApproval

### 2. Mensajes de Error Mejorados
- [x] RegisterOwner: Errores específicos con email y teléfono duplicados
- [x] Register: Errores específicos con email duplicado
- [x] Login: Errores específicos (credenciales incorrectas, usuario no encontrado, etc.)
- [x] Todos los errores con emoji ❌ para mejor visibilidad

### 3. Sistema de Redirección por Roles
- [x] Login redirige según rol:
  - Owners → `/restaurant/dashboard`
  - Clients → `/`
- [x] ProtectedRoute bloquea acceso cruzado entre roles
- [x] Rutas organizadas por rol en routes.tsx

### 4. Verificación de Estado del Negocio (businessActive)
- [x] AuthContext obtiene `businessActive` de la tabla `businesses`
- [x] ProtectedRoute verifica si `businessActive === false`
- [x] Owners con negocio inactivo solo pueden acceder a `/pending-approval`
- [x] Login redirige a `/pending-approval` si negocio está inactivo

## 📋 Archivos Modificados

### src/core/context/AuthContext.tsx
- ✅ Agregado `businessActive: boolean | null` al contexto
- ✅ Función `fetchBusinessStatus()` para obtener estado del negocio
- ✅ Se ejecuta solo para usuarios con rol "owner"
- ✅ Actualiza `businessActive` en cada cambio de sesión

### src/core/router/ProtectedRoute.tsx
- ✅ Importa `businessActive` y `useLocation`
- ✅ Verifica si owner tiene `businessActive === false`
- ✅ Redirige a `/pending-approval` si negocio inactivo
- ✅ Permite acceso a `/pending-approval` incluso con negocio inactivo

### src/presentation/pages/auth/Login.tsx
- ✅ Usa `businessActive` del contexto
- ✅ Redirige a `/pending-approval` si owner con negocio inactivo
- ✅ Redirige a `/restaurant/dashboard` si owner con negocio activo
- ✅ Mensajes de error mejorados

### src/presentation/pages/auth/PendingApproval.tsx
- ✅ Polling mechanism para detectar creación de negocio
- ✅ Botón de logout con ícono
- ✅ Manejo de errores mejorado

### src/presentation/pages/auth/RegisterOwner.tsx
- ✅ Mensajes de error específicos con datos del usuario

### src/presentation/pages/auth/Register.tsx
- ✅ Mensajes de error específicos con datos del usuario

### src/core/router/routes.tsx
- ✅ Agregado `index: true` en `/restaurant` para redirigir a Dashboard

## 🔒 Flujo de Seguridad Implementado

### Para Owners:
1. **Registro** → `/register-owner`
2. **Creación de cuenta** → Redirige a `/pending-approval`
3. **Login con `active = false`** → Redirige a `/pending-approval`
4. **Login con `active = true`** → Redirige a `/restaurant/dashboard`
5. **Intento de acceder a rutas de restaurant con `active = false`** → Redirige a `/pending-approval`
6. **Intento de acceder a rutas de client** → Redirige a `/restaurant/dashboard`

### Para Clients:
1. **Registro** → `/register`
2. **Login** → Redirige a `/` (Home)
3. **Intento de acceder a rutas de owner** → Redirige a `/`

## 🧪 Testing Pendiente

### Escenarios Críticos:
- [ ] Owner con `active = false` intenta acceder a `/restaurant/dashboard`
  - Esperado: Redirige a `/pending-approval`
  
- [ ] Owner con `active = false` intenta acceder a `/restaurant/products`
  - Esperado: Redirige a `/pending-approval`
  
- [ ] Owner con `active = true` accede a `/restaurant/dashboard`
  - Esperado: Acceso permitido
  
- [ ] Owner con `active = false` accede a `/pending-approval`
  - Esperado: Acceso permitido
  
- [ ] Client intenta acceder a `/restaurant/dashboard`
  - Esperado: Redirige a `/`
  
- [ ] Owner intenta acceder a `/` (rutas de client)
  - Esperado: Redirige a `/restaurant/dashboard` o `/pending-approval`

### Flujo de Aprobación:
- [ ] Admin cambia `active` de `false` a `true` en Supabase
- [ ] Owner refresca la página
- [ ] Esperado: Redirige automáticamente a `/restaurant/dashboard`

## 📝 Notas Importantes

### SQL Requerido en Supabase:
```sql
-- Política RLS para que owners puedan ver sus negocios
DROP POLICY IF EXISTS "Owners can view businesses" ON businesses;

CREATE POLICY "Owners can view businesses"
ON businesses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = businesses.owner_id 
    AND profiles.user_id = auth.uid()
  )
);
```

### Estructura de la Tabla `businesses`:
- `id` (uuid, primary key)
- `owner_id` (uuid, references profiles.id)
- `name` (text)
- `address` (text)
- `phone` (text)
- `active` (boolean) ← **Campo crítico para el sistema**
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### Valores de `active`:
- `true` → Negocio aprobado, owner puede acceder a todas las rutas
- `false` → Negocio pendiente, owner solo puede acceder a `/pending-approval`
- `null` → Tratado como `false` (pendiente)

## 🎯 Próximos Pasos

1. **Testing completo** del flujo de aprobación
2. **Verificar** que el SQL RLS esté ejecutado en Supabase
3. **Probar** cambio de `active` de `false` a `true` en tiempo real
4. **Documentar** proceso de aprobación para administradores
