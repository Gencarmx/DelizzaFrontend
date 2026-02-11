# 🛒 Políticas de Seguridad para Productos (RLS) - Sistema de Colaboradores

## Resumen
Este documento describe las políticas de Row Level Security (RLS) **reales** implementadas para la tabla `products` en Supabase, basadas en el sistema de colaboradores que permite roles 'owner' y 'seller' en múltiples restaurantes.

## Estructura del Sistema de Colaboradores

### Tabla `collaborators`
```sql
CREATE TABLE collaborators (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  business_id UUID REFERENCES businesses(id),
  role TEXT CHECK (role IN ('owner', 'seller')),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabla `products`
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Políticas RLS Implementadas (Reales)

### 1. Habilitar RLS
```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

### 2. Política SELECT - Colaboradores ven productos de sus negocios
```sql
CREATE POLICY "Anyone can view active products" ON products
FOR SELECT USING (
  business_id IN (
    SELECT collaborators.business_id
    FROM collaborators
    WHERE (
      collaborators.user_id IN (
        SELECT profiles.id
        FROM profiles
        WHERE (profiles.user_id = auth.uid())
      )
    )
    AND (collaborators.role = ANY (ARRAY['owner'::text, 'seller'::text]))
    AND (collaborators.status = 'active'::text)
  )
);
```

### 3. Política INSERT/UPDATE/DELETE - Colaboradores gestionan productos
```sql
CREATE POLICY "Business members can manage products" ON products
FOR ALL USING (
  business_id IN (
    SELECT collaborators.business_id
    FROM collaborators
    WHERE (
      collaborators.user_id IN (
        SELECT profiles.id
        FROM profiles
        WHERE (profiles.user_id = auth.uid())
      )
    )
    AND (collaborators.role = ANY (ARRAY['owner'::text, 'seller'::text]))
    AND (collaborators.status = 'active'::text)
  )
);
```

## Comportamiento por Rol

### 👨‍🍳 Owners (Propietarios)
- ✅ Pueden ver TODOS los productos de SUS restaurantes (activos e inactivos)
- ✅ Pueden gestionar productos en múltiples restaurantes donde son colaboradores
- ✅ Pueden crear, editar y eliminar productos
- ❌ NO pueden ver productos de restaurantes donde NO son colaboradores

### 🛍️ Sellers (Vendedores)
- ✅ Pueden ver TODOS los productos de SUS restaurantes asignados (activos e inactivos)
- ✅ Pueden gestionar productos en los restaurantes donde están asignados
- ✅ Pueden crear, editar y eliminar productos en sus restaurantes
- ❌ NO pueden ver productos de restaurantes donde NO están asignados

### 👥 Clientes (Clients)
- ❌ NO pueden ver productos (las políticas RLS no permiten acceso público)
- ❌ NO pueden crear, editar o eliminar productos

### 👤 Usuarios No Autenticados
- ❌ NO pueden ver productos (requieren autenticación)
- ❌ NO pueden gestionar productos

## Implementación en el Código

### Loader de Productos (`productsLoader.ts`)
```typescript
// 1. Obtener sesión del usuario
const { data: { session } } = await supabase.auth.getSession();

// 2. Si no hay usuario, mostrar productos activos públicos
if (!session?.user) {
  return await getAllActiveProducts();
}

// 3. Obtener business_ids donde el usuario es colaborador
const businessIds = await getUserBusinessIds(session.user.id);

// 4. Si es colaborador, mostrar productos de sus negocios
if (businessIds.length > 0) {
  return await getCollaboratorProducts(businessIds);
}

// 5. Si no es colaborador, mostrar productos activos públicos
return await getAllActiveProducts();
```

### Función `getUserBusinessIds()`
```typescript
async function getUserBusinessIds(userId: string): Promise<string[]> {
  // 1. Obtener profile.id del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single();

  // 2. Obtener business_ids donde es colaborador activo con rol owner/seller
  const { data: collaborators } = await supabase
    .from('collaborators')
    .select('business_id')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .in('role', ['owner', 'seller']);

  return collaborators?.map(c => c.business_id).filter(Boolean) || [];
}
```

## Consideraciones de Seguridad

### 🔒 Protección de Datos
- Los colaboradores solo acceden a productos de restaurantes donde están asignados
- Sistema multi-tenancy robusto basado en `business_id`
- No hay filtración de datos entre restaurantes

### 👥 Sistema de Roles
- **Owner**: Control total sobre sus restaurantes
- **Seller**: Gestión de productos en restaurantes asignados
- **Cliente**: Sin acceso a gestión de productos

### 🚀 Optimización de Consultas
- Las políticas utilizan índices eficientes
- Consultas optimizadas para evitar N+1 queries
- Sistema escalable para múltiples colaboradores por restaurante

## Testing de Políticas

### Verificar como Owner
```sql
-- Usuario autenticado como owner
SELECT * FROM products;
-- Debería ver productos de todos los restaurantes donde es colaborador
```

### Verificar como Seller
```sql
-- Usuario autenticado como seller
SELECT * FROM products;
-- Debería ver productos solo de restaurantes asignados
```

### Verificar como Cliente
```sql
-- Usuario autenticado sin rol de colaborador
SELECT * FROM products;
-- Debería ver 0 resultados (no hay política pública)
```

## Troubleshooting

### Problema: Colaborador no ve productos
**Solución:**
1. Verificar que existe registro en `collaborators` con `status = 'active'`
2. Verificar que el `user_id` en `collaborators` corresponde al `profiles.id`
3. Verificar que el `role` es 'owner' o 'seller'

### Problema: Error al insertar producto
**Solución:**
1. Verificar que el usuario es colaborador activo del `business_id`
2. Verificar que el `business_id` existe y está activo

### Problema: Rendimiento lento
**Solución:**
- Crear índices en `collaborators(user_id, status, role)`
- Crear índices en `products(business_id, active)`

## Migración y Mantenimiento

### Políticas Existentes
Las políticas mostradas arriba **ya están implementadas** en la base de datos. No es necesario ejecutar scripts adicionales.

### Verificación
```sql
-- Ver políticas activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'products'
ORDER BY policyname;
```

### Backup
Se recomienda hacer backup antes de cualquier cambio en políticas RLS.
