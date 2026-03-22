# Plan de Corrección: Filtrado de Productos de Restaurantes Deshabilitados

**Fecha:** 20 de Marzo de 2026  
**Estado:** Propuesto - Pendiente de Implementación  
**Prioridad:** Alta  

---

## Resumen Ejecutivo

Los productos de restaurantes deshabilitados (`business.active = false`) se siguen mostrando en la aplicación porque las consultas de productos **solo filtran por `product.active = true`** sin verificar el estado del restaurante asociado.

---

## Causa Raíz

### Problema Identificado

Todas las consultas de productos activos solo verifican el estado del producto:

```typescript
// ❌ ACTUAL - Solo filtra por producto activo
.eq('active', true)
```

**Falta:** `.eq('businesses.active', true)`

Esto permite que productos activos de restaurantes deshabilitados aparezcan en:
- Lista de productos en Home
- Búsqueda en SearchBar
- Loader de productos

---

## Archivos que Requieren Corrección

| # | Archivo | Ubicación | Gravedad |
|---|---------|-----------|----------|
| 1 | `productsLoader.ts` | `src/core/router/loaders/` | Alta |
| 2 | `Home.tsx` | `src/presentation/pages/` | Alta |
| 3 | `SearchBar.tsx` | `src/presentation/components/layout/` | Alta |
| 4 | `checkoutService.ts` | `src/core/services/` | Media (TODO pendiente) |

---

## Detalle por Archivo

### 1. productsLoader.ts (Línea 115)

**Estado Actual:**
```typescript
const { data, error } = await supabase
  .from('products')
  .select(`
    *,
    businesses: business_id (
      name,
      address,
      logo_url
    )
  `)
  .eq('active', true)
  .order('created_at', { ascending: false })
  .limit(50);
```

**Propuesta de Corrección:**
```typescript
const { data, error } = await supabase
  .from('products')
  .select(`
    *,
    businesses: business_id (
      name,
      address,
      logo_url,
      active
    )
  `)
  .eq('active', true)
  .eq('businesses.active', true)
  .order('created_at', { ascending: false })
  .limit(50);
```

**Riesgo:** Bajo - Ya tiene JOIN con businesses, solo se agrega filtro

---

### 2. Home.tsx (Líneas 101-104)

**Estado Actual:**
```typescript
supabase
  .from('products')
  .select('id, name, price, description, image_url, active, business_id, category_id')
  .eq('active', true),
```

**Propuesta de Corrección (Opción A - JOIN directo):**
```typescript
supabase
  .from('products')
  .select('id, name, price, description, image_url, active, business_id, category_id, businesses:business_id(id, active)')
  .eq('active', true)
  .eq('businesses.active', true),
```

**Nota:** Es necesario incluir `businesses:business_id(id, active)` en el select para que el filtro `.eq('businesses.active', true)` funcione correctamente en PostgREST.

**Riesgo:** Medio-Bajo - Requiere modificar estructura del select

---

### 3. SearchBar.tsx (Líneas 72-81)

**Estado Actual:**
```typescript
const [{ data: productsData }, { data: businessesData }] = await Promise.all([
  supabase
    .from("products")
    .select("id, name, price, description, image_url, active, business_id")
    .eq("active", true),
  supabase
    .from("businesses")
    .select("id, name, address, active, logo_url")
    .eq("active", true),
]);
```

**Propuesta de Corrección:**
```typescript
const [{ data: productsData }, { data: businessesData }] = await Promise.all([
  supabase
    .from("products")
    .select("id, name, price, description, image_url, active, business_id, businesses:business_id(id, active)")
    .eq("active", true)
    .eq("businesses.active", true),
  supabase
    .from("businesses")
    .select("id, name, address, active, logo_url")
    .eq("active", true),
]);
```

**Riesgo:** Medio-Bajo - Mismo requerimiento de incluir businesses en select

---

### 4. checkoutService.ts (Línea 268-282)

**Estado Actual:**
```typescript
export async function validateOrderItems(_order: CartOrder): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // TODO: Verificar stock disponible
  // TODO: Verificar precios no hayan cambiado
  // TODO: Verificar restaurante esté activo  <-- PENDIENTE

  return {
    valid: errors.length === 0,
    errors
  };
}
```

**Propuesta de Corrección:**
```typescript
export async function validateOrderItems(order: CartOrder): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Verificar que los restaurantes estén activos
  for (const item of order.items) {
    const { data: business } = await supabase
      .from('businesses')
      .select('active, is_paused')
      .eq('id', item.business_id)
      .single();

    if (!business) {
      errors.push(`No se encontró el restaurante para "${item.name}"`);
      continue;
    }

    if (!business.active) {
      errors.push(`El restaurante de "${item.name}" está desactivado`);
    } else if (business.is_paused) {
      errors.push(`El restaurante de "${item.name}" no está recibiendo pedidos`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

**Riesgo:** Bajo - Agrega validación defensiva

---

## Funcionalidad Existente Relacionada

### ProductModal.tsx (Línea 39)
Ya existe validación para prevenir pedidos de restaurantes pausados:

```typescript
const canOrder = hasValidRestaurant && restaurantStatus === 'open';
```

Esto maneja el estado `is_paused` pero **no maneja restaurantes deshabilitados** (`active = false`), lo cual es la causa del bug.

### computeRestaurantStatus()
En `Home.tsx` y `RestaurantDetail.tsx`:
- `active = false` → `type: 'closed'`
- `is_paused = true` → `type: 'paused'`

---

## Plan de Implementación Recomendado

### Orden de Implementación:

1. **Fase 1 - Filtrado de Datos (Alta Prioridad)**
   - [ ] `productsLoader.ts` - Filtro de restaurante activo
   - [ ] `Home.tsx` - Filtro de restaurante activo
   - [ ] `SearchBar.tsx` - Filtro de restaurante activo

2. **Fase 2 - Validación de Checkout (Media Prioridad)**
   - [ ] `checkoutService.ts` - Implementar validación de restaurante activo

### Verificación Post-Implementación:

1. Verificar que productos de restaurantes deshabilitados NO aparezcan en:
   - Página principal (Home)
   - Búsqueda (SearchBar)
   - Lista de productos

2. Verificar que el checkout rechace productos de restaurantes deshabilitados

3. Verificar que colaboradores/owners PUEDAN ver productos de sus propios restaurantes aunque estén deshabilitados (gestión interna)

---

## Impacto del Cambio

### Positivo:
- ✅ Mejora experiencia de usuario (no ve restaurantes muertos)
- ✅ Previene confusión al intentar pedir de restaurantes inactivos
- ✅ Alineación con la lógica de `ProductModal`

### Riesgos Mitigados:
- ⚠️ El JOIN requiere incluir `businesses:business_id(id, active)` en select
- ⚠️ Verificar políticas RLS no bloqueen el JOIN

---

## Notas Técnicas Adicionales

### Supabase/PostgREST
El filtro `.eq('businesses.active', true)` funciona gracias a la sintaxis de PostgREST para referenciar columnas de tablas relacionadas en JOINs.

### Políticas RLS
Las políticas de Row Level Security podrían necesitar ajuste si es que filtran por `active` en la tabla `products` sin considerar el estado del negocio.

---

## Métricas de Éxito

| Métrica | Antes | Después |
|---------|-------|---------|
| Productos visibles de restaurantes deshabilitados | > 0 | 0 |
| Órdenes exitosas de restaurantes deshabilitados | > 0 | 0 |
| Conflictos de UX por restaurantes no operativos | Presente | Eliminado |

---

*Documento generado para revisión y seguimiento del bug*
