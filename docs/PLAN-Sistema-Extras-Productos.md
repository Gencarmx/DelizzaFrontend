# Plan de Implementación: Sistema de Extras/Adiciones para Productos

**Fecha:** 31 de Marzo de 2026
**Proyecto:** Delizza Frontend
**Estado:** Revisado y Corregido

---

## 1. Resumen del Requerimiento

Los restaurantes necesitan la capacidad de configurar productos base (ej: "Pasta") que permitan al cliente agregar variaciones (ej: "Pollo frito", "Camarones") con costo adicional. El sistema debe:

- Permitir al restaurante configurar extras por producto
- Agrupar extras por categorías (proteínas, salsas, toppings)
- Definir límites de cantidad que el cliente puede seleccionar
- Calcular y mostrar el precio adicional en tiempo real
- Mostrar desglose completo en el carrito antes de confirmar el pedido

---

## 2. Decisiones de Diseño

| Aspecto | Decisión |
|---------|----------|
| **Agrupación de extras** | Por categorías (ej: Proteínas, Salsas, Toppings) |
| **Obligatoriedad** | Opcional — el restaurante puede marcar como requerido si lo desea |
| **Selección múltiple** | Sí — el cliente puede seleccionar el mismo extra múltiples veces (ej: 2x Queso) |
| **Precio adicional** | Se muestra claramente al seleccionar cada extra |
| **ID en carrito** | Composite key `${productId}_${addonSignature}` para diferenciar el mismo producto con distintos extras |

---

## 3. Estructura de Datos (Backend — Supabase)

### 3.1 Nueva Columna en `products`: `has_addons`

Agregar un flag en la tabla `products` para que el listado pueda mostrar el badge "personalizable" **sin queries extra**. Se mantiene sincronizado mediante trigger.

```sql
ALTER TABLE products ADD COLUMN has_addons BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX idx_products_has_addons ON products(business_id, has_addons) WHERE has_addons = true;
```

### 3.2 Nueva Tabla: `product_addons`

```sql
-- =============================================
-- Tabla: product_addons
-- Sistema de extras/adiciones para productos
-- =============================================

CREATE TABLE product_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  max_quantity INTEGER NOT NULL DEFAULT 1 CHECK (max_quantity >= 1),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_product_addons_product_id ON product_addons(product_id);
CREATE INDEX idx_product_addons_active ON product_addons(product_id, active, sort_order);
```

### 3.3 Políticas de Row Level Security (RLS)

> **IMPORTANTE:** La tabla `collaborators` usa `user_id` → `profiles.id` (NO directamente `auth.uid()`).
> Hay que hacer el join con `profiles` para obtener el `user_id` de auth.

```sql
ALTER TABLE product_addons ENABLE ROW LEVEL SECURITY;

-- ─── Política pública: clientes y usuarios anónimos leen addons activos ───
-- Los addons de productos activos deben ser visibles para todos los clientes.
CREATE POLICY "Public can view active product addons"
ON product_addons FOR SELECT
USING (
  active = true
  AND product_id IN (
    SELECT id FROM products WHERE active = true
  )
);

-- ─── Política de restaurante: ver todos sus addons (activos e inactivos) ───
CREATE POLICY "Restaurants can view own product addons"
ON product_addons FOR SELECT
USING (
  product_id IN (
    SELECT p.id FROM products p
    JOIN businesses b ON p.business_id = b.id
    WHERE b.owner_user_id = auth.uid()
    UNION
    SELECT p.id FROM products p
    JOIN collaborators c ON p.business_id = c.business_id
    JOIN profiles pr ON c.user_id = pr.id
    WHERE pr.user_id = auth.uid() AND c.active = true
  )
);

-- ─── INSERT ───────────────────────────────────────────────────────────────
CREATE POLICY "Restaurants can insert own product addons"
ON product_addons FOR INSERT
WITH CHECK (
  product_id IN (
    SELECT p.id FROM products p
    JOIN businesses b ON p.business_id = b.id
    WHERE b.owner_user_id = auth.uid()
    UNION
    SELECT p.id FROM products p
    JOIN collaborators c ON p.business_id = c.business_id
    JOIN profiles pr ON c.user_id = pr.id
    WHERE pr.user_id = auth.uid() AND c.active = true
  )
);

-- ─── UPDATE ───────────────────────────────────────────────────────────────
CREATE POLICY "Restaurants can update own product addons"
ON product_addons FOR UPDATE
USING (
  product_id IN (
    SELECT p.id FROM products p
    JOIN businesses b ON p.business_id = b.id
    WHERE b.owner_user_id = auth.uid()
    UNION
    SELECT p.id FROM products p
    JOIN collaborators c ON p.business_id = c.business_id
    JOIN profiles pr ON c.user_id = pr.id
    WHERE pr.user_id = auth.uid() AND c.active = true
  )
);

-- ─── DELETE ───────────────────────────────────────────────────────────────
CREATE POLICY "Restaurants can delete own product addons"
ON product_addons FOR DELETE
USING (
  product_id IN (
    SELECT p.id FROM products p
    JOIN businesses b ON p.business_id = b.id
    WHERE b.owner_user_id = auth.uid()
    UNION
    SELECT p.id FROM products p
    JOIN collaborators c ON p.business_id = c.business_id
    JOIN profiles pr ON c.user_id = pr.id
    WHERE pr.user_id = auth.uid() AND c.active = true
  )
);
```

### 3.4 Funciones de Base de Datos

#### Trigger: actualizar `updated_at` en `product_addons`

```sql
CREATE OR REPLACE FUNCTION update_product_addons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_product_addons_updated_at
  BEFORE UPDATE ON product_addons
  FOR EACH ROW
  EXECUTE FUNCTION update_product_addons_updated_at();
```

#### Trigger: sincronizar `products.has_addons`

Mantiene el flag `has_addons` en la tabla `products` automáticamente al insertar, actualizar o eliminar addons.

```sql
CREATE OR REPLACE FUNCTION sync_product_has_addons()
RETURNS TRIGGER AS $$
DECLARE
  target_product_id UUID;
BEGIN
  -- Determinar el product_id afectado
  IF TG_OP = 'DELETE' THEN
    target_product_id := OLD.product_id;
  ELSE
    target_product_id := NEW.product_id;
  END IF;

  UPDATE products
  SET has_addons = EXISTS(
    SELECT 1 FROM product_addons
    WHERE product_id = target_product_id AND active = true
    LIMIT 1
  )
  WHERE id = target_product_id;

  RETURN NULL; -- AFTER trigger, valor ignorado para ROW triggers
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_product_has_addons
  AFTER INSERT OR UPDATE OR DELETE ON product_addons
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_has_addons();
```

#### Función: obtener addons agrupados por categoría (lazy load en modal)

> **Corrección:** la versión original tenía un bug de `jsonb_agg` doble anidado dentro del mismo `GROUP BY`. Se corrige usando una subconsulta.

```sql
CREATE OR REPLACE FUNCTION get_product_addons_grouped(p_product_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category', category_name,
        'addons', addons
      )
      ORDER BY min_sort
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT
      category_name,
      MIN(sort_order) AS min_sort,
      jsonb_agg(
        jsonb_build_object(
          'id',           id,
          'name',         name,
          'price',        price,
          'max_quantity', max_quantity,
          'sort_order',   sort_order
        )
        ORDER BY sort_order
      ) AS addons
    FROM product_addons
    WHERE product_id = p_product_id
      AND active = true
    GROUP BY category_name
  ) grouped;
$$;
```

#### Función: obtener addons activos de múltiples productos (batch)

Usada cuando se necesitan addons de varios productos al mismo tiempo (ej: admin que muestra la lista de productos con badge de extras).

```sql
CREATE OR REPLACE FUNCTION get_products_addons(p_product_ids UUID[])
RETURNS TABLE (product_id UUID, addons JSONB)
LANGUAGE sql
STABLE
AS $$
  SELECT
    pa.product_id,
    jsonb_agg(
      jsonb_build_object(
        'id',            pa.id,
        'category_name', pa.category_name,
        'name',          pa.name,
        'price',         pa.price,
        'max_quantity',  pa.max_quantity,
        'sort_order',    pa.sort_order
      )
      ORDER BY pa.sort_order
    ) AS addons
  FROM product_addons pa
  WHERE pa.product_id = ANY(p_product_ids)
    AND pa.active = true
  GROUP BY pa.product_id;
$$;
```

### 3.5 Agregar columna `addons` a `order_items`

Los detalles de los extras seleccionados deben persistirse en el pedido para que la cocina pueda verlos en el ticket.

```sql
ALTER TABLE order_items ADD COLUMN addons JSONB;

-- Ejemplo de valor almacenado:
-- [{"name": "Camarones", "price": 45.00, "quantity": 1},
--  {"name": "Bolognesa", "price": 10.00, "quantity": 1}]
```

---

## 4. Tipos TypeScript

### 4.1 Tipos de dominio (nuevo archivo recomendado o agregar a `types.ts`)

```typescript
// src/core/supabase/types.ts — agregar al final del archivo

export interface ProductAddon {
  id: string;
  product_id: string;
  category_name: string;
  name: string;
  price: number;
  max_quantity: number;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddonGroup {
  category: string;
  addons: Omit<ProductAddon, 'product_id' | 'active' | 'created_at' | 'updated_at'>[];
}

export interface SelectedAddon {
  addon_id: string;
  name: string;
  price: number;
  quantity: number;
}
```

### 4.2 Extensión de `Product` para uso en UI

> **IMPORTANTE:** `Product` (en `types.ts`) es el tipo auto-generado por Supabase y no debe modificarse. Usar un tipo extendido para la capa de presentación.

```typescript
// src/core/supabase/types.ts — agregar junto a los tipos de arriba

import type { Database } from './types';

export type Product = Database['public']['Tables']['products']['Row'];

// Tipo extendido para uso en UI (no modifica el tipo generado)
export type ProductWithAddons = Product & {
  addons?: ProductAddon[];        // Extras cargados lazy al abrir el modal
  addon_groups?: AddonGroup[];    // Agrupados por categoría (resultado de get_product_addons_grouped)
};
```

### 4.3 Extensión de `CartItem` — `src/core/context/CartContext.tsx`

El campo `price` pasa a representar el **precio unitario total** (base + extras), manteniendo compatibilidad con `getSubtotal()` que ya calcula `item.price * item.quantity`.

```typescript
// Reemplaza la interfaz CartItem actual

export interface CartItem {
  id: string;           // Composite key: `${productId}_${addonSignature}` si tiene addons, o productId si no
  productId: string;    // ID real del producto en Supabase (para referencias)
  name: string;
  basePrice: number;    // Precio base del producto sin extras
  price: number;        // Precio unitario total = basePrice + sum(addon.price * addon.quantity)
  quantity: number;
  image: string;
  restaurant?: {
    id: string;
    name: string;
  };
  selectedAddons?: SelectedAddon[];
}
```

> **Estrategia de ID compuesto:**
> ```typescript
> function buildCartItemId(productId: string, addons: SelectedAddon[]): string {
>   if (!addons || addons.length === 0) return productId;
>   const sig = addons
>     .map(a => `${a.addon_id}:${a.quantity}`)
>     .sort()
>     .join('|');
>   return `${productId}_${sig}`;
> }
> ```
> Esto permite tener el mismo producto en el carrito con diferentes combinaciones de extras como ítems separados.

---

## 5. Servicios (Capa de Datos)

### 5.1 Nuevo archivo: `src/core/services/addonService.ts`

```typescript
import { supabase } from "@core/supabase/client";
import type { ProductAddon, AddonGroup, SelectedAddon } from "@core/supabase/types";

// ─── Lectura (clientes y admins) ─────────────────────────────────────────────

/**
 * Obtiene addons agrupados por categoría para el modal del cliente.
 * Usa la función RPC para una sola roundtrip a Supabase.
 */
export async function getAddonsGrouped(productId: string): Promise<AddonGroup[]> {
  const { data, error } = await supabase
    .rpc('get_product_addons_grouped', { p_product_id: productId });

  if (error) throw error;
  return (data as AddonGroup[]) ?? [];
}

/**
 * Obtiene addons planos de un producto (para el formulario de admin).
 */
export async function getAddonsByProductId(productId: string): Promise<ProductAddon[]> {
  const { data, error } = await supabase
    .from('product_addons')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Batch: addons activos de múltiples productos.
 * Usa la función RPC para una sola roundtrip.
 */
export async function getAddonsByProductIds(
  productIds: string[]
): Promise<Record<string, ProductAddon[]>> {
  if (productIds.length === 0) return {};

  const { data, error } = await supabase
    .rpc('get_products_addons', { p_product_ids: productIds });

  if (error) throw error;

  return (data ?? []).reduce((acc: Record<string, ProductAddon[]>, row: { product_id: string; addons: ProductAddon[] }) => {
    acc[row.product_id] = row.addons;
    return acc;
  }, {});
}

// ─── Escritura (solo restaurante) ────────────────────────────────────────────

export async function createAddon(
  addon: Omit<ProductAddon, 'id' | 'created_at' | 'updated_at'>
): Promise<ProductAddon> {
  const { data, error } = await supabase
    .from('product_addons')
    .insert(addon)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * NOTA: No pasar `updated_at` manualmente — el trigger lo gestiona automáticamente.
 */
export async function updateAddon(
  id: string,
  updates: Partial<Omit<ProductAddon, 'id' | 'product_id' | 'created_at' | 'updated_at'>>
): Promise<ProductAddon> {
  const { data, error } = await supabase
    .from('product_addons')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAddon(id: string): Promise<void> {
  const { error } = await supabase
    .from('product_addons')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Reemplaza todos los addons de un producto en una sola transacción.
 * Útil al guardar el formulario completo de un producto.
 */
export async function upsertProductAddons(
  productId: string,
  addons: Omit<ProductAddon, 'id' | 'product_id' | 'created_at' | 'updated_at'>[]
): Promise<void> {
  // Eliminar los existentes y reinsertar — simple y sin conflictos de IDs
  const { error: deleteError } = await supabase
    .from('product_addons')
    .delete()
    .eq('product_id', productId);

  if (deleteError) throw deleteError;

  if (addons.length === 0) return;

  const { error: insertError } = await supabase
    .from('product_addons')
    .insert(addons.map(a => ({ ...a, product_id: productId })));

  if (insertError) throw insertError;
}

// ─── Helpers de carrito ───────────────────────────────────────────────────────

export function calculateAddonsTotal(addons: SelectedAddon[]): number {
  return addons.reduce((sum, a) => sum + a.price * a.quantity, 0);
}

export function buildCartItemId(productId: string, addons: SelectedAddon[]): string {
  if (!addons || addons.length === 0) return productId;
  const sig = [...addons]
    .map(a => `${a.addon_id}:${a.quantity}`)
    .sort()
    .join('|');
  return `${productId}_${sig}`;
}

export function formatAddonsForOrder(addons: SelectedAddon[]): object[] {
  return addons.map(a => ({
    name: a.name,
    price: a.price,
    quantity: a.quantity,
  }));
}
```

---

## 6. Interfaz de Administración (Restaurante)

### 6.1 Archivos a modificar

> **Rutas reales del proyecto:**
> - `src/presentation/pages/restaurantUI/ProductAdd.tsx` — formulario de creación
> - `src/presentation/pages/restaurantUI/ProductEdit.tsx` — formulario de edición

**Cambios requeridos en ambos:**

1. **Sección colapsable "Extras del producto"** — solo visible en `ProductEdit` inicialmente (en `ProductAdd` se puede agregar después de crear).
2. **Lista de categorías** con extras por categoría.
3. **Validaciones inline** — nombre requerido, precio >= 0, max_quantity >= 1.
4. **Guardar con `upsertProductAddons()`** al hacer submit del formulario.

**Componente de UI sugerido:**

```tsx
// src/presentation/pages/restaurantUI/ProductEdit.tsx

<ProductAddonsSection
  productId={productId!}
  onSaved={() => setSuccessToast("Extras guardados correctamente")}
/>
```

### 6.2 Nuevo componente: `ProductAddonsSection`

**Ubicación:** `src/presentation/components/common/ProductAddonsSection/ProductAddonsSection.tsx`

Responsabilidades:
- Carga los addons existentes con `getAddonsByProductId()`
- Permite agregar/editar/eliminar categorías y extras
- Guarda con `upsertProductAddons()` al hacer clic en "Guardar extras"
- Usa los componentes existentes: `Input`, `Button`, `Select` de `@components/restaurant-ui`

---

## 7. Interfaz Cliente (Usuario Final)

### 7.1 Actualizar ProductModal

**Archivo:** `src/presentation/components/common/ProductModal/ProductModal.tsx`

**Flujo:**

1. El prop `product` recibe `has_addons: boolean` (ya disponible en `products` tras el ALTER).
2. Si `has_addons = true`, al abrir el modal se llama `getAddonsGrouped(product.id)` (lazy, UNA sola roundtrip).
3. Mostrar grupos de categorías con controles de cantidad.
4. Actualizar precio total en tiempo real.
5. Al agregar al carrito, calcular `price = basePrice + calculateAddonsTotal(selected)` y construir el ID compuesto con `buildCartItemId()`.

**Diseño:**

```
┌─────────────────────────────────────┐
│ [Imagen del producto]               │
│                                     │
│ Pasta Carbonara          $120.00    │
│ Descripción del plato...            │
│                                     │
│ ┌─ Proteínas ────────────────────┐  │
│ │ ☐ Pollo frito       +$25.00   │  │
│ │ ☑ Camarones         +$45.00   │  │
│ └───────────────────────────────┘  │
│                                     │
│ ┌─ Salsas ──────────────────────┐   │
│ │ ☐ Alfredo           +$10.00  │   │
│ │ ☑ Bolognesa         +$10.00  │   │
│ └───────────────────────────────┘   │
│                                     │
│ Cantidad: [-] 1 [+]                 │
│                                     │
│ Total: $200.00                      │
│ [  Agregar  ]  [  Pedir ahora  ]    │
└─────────────────────────────────────┘
```

**Cambios en `ProductModalProps`:**

```typescript
export interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    has_addons?: boolean;   // <— nuevo campo
    restaurant?: { id: string; name: string };
    description?: string;
  };
  restaurantStatus?: 'open' | 'paused' | 'closed';
}
```

### 7.2 Actualizar Carrito

**Archivos relevantes en el proyecto actual:**
- `src/core/context/CartContext.tsx` — tipos y lógica
- `src/core/hooks/useCartSync.ts` — sincronización con Supabase (no requiere cambios)

**El carrito ya persiste en localStorage y Supabase via `useCartSync`** — los nuevos campos (`selectedAddons`, `basePrice`, `productId`) serán serializados automáticamente.

---

## 8. Carrito de Compras (CartContext)

### 8.1 Actualizar `addToCart`

```typescript
// Firma actualizada — compatible con el uso actual si selectedAddons es undefined
const addToCart = (
  item: Omit<CartItem, 'quantity'> & { quantity?: number }
) => {
  setItems((prevItems) => {
    // El ID ya viene calculado (productId simple o composite con addons)
    const existingItem = prevItems.find((i) => i.id === item.id);

    if (existingItem) {
      return prevItems.map((i) =>
        i.id === item.id
          ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
          : i
      );
    }

    return [...prevItems, { ...item, quantity: item.quantity ?? 1 }];
  });
};
```

### 8.2 `getSubtotal` — sin cambios

`item.price` ya incluye extras, por lo que `item.price * item.quantity` sigue siendo correcto.

### 8.3 Persistencia de addons en pedidos (`checkoutService.ts`)

Al crear `order_items`, incluir el campo `addons` con el detalle formateado:

```typescript
// En processMultiRestaurantCheckout — al insertar order_items
const orderItemsPayload = order.items.map(item => ({
  order_id: orderId,
  product_id: item.productId,   // usar productId real, no el composite id
  product_name: item.name,
  price: item.price,            // precio unitario total (base + extras)
  quantity: item.quantity,
  addons: item.selectedAddons   // JSONB con detalles para cocina
    ? formatAddonsForOrder(item.selectedAddons)
    : null,
}));
```

---

## 9. Consideraciones de Rendimiento y Optimización

| Escenario | Estrategia |
|-----------|-----------|
| **Listado de productos** | `has_addons` en `products` evita queries extra — sin costo adicional |
| **Modal del cliente** | Carga lazy con `get_product_addons_grouped()` — 1 RPC call al abrir |
| **Admin: lista de productos** | `has_addons` ya disponible en la query de `getProductsByBusiness()` |
| **Admin: formulario de edición** | `getAddonsByProductId()` — 1 query directa al montar la sección |
| **Caché en sesión** | Guardar el resultado de `getAddonsGrouped()` en `Map<productId, AddonGroup[]>` en el componente o en un `useRef` compartido para no re-consultar en la misma sesión |
| **Escribir addons** | `upsertProductAddons()` usa delete+insert — atómico dentro de RLS, sin conflictos de IDs |
| **Carrito sincronizado** | `useCartSync` ya tiene debounce de 800ms — los addons se serializan junto con los items, sin overhead adicional |

---

## 10. Validaciones y Edge Cases

| Escenario | Manejo |
|-----------|--------|
| Producto con addons pero todos inactivos | `has_addons` = false (trigger) — no se muestra sección |
| Precio extra = 0 | Mostrar "Incluido" en lugar de "+$0.00" |
| Límite `max_quantity` alcanzado | Deshabilitar botón `+` del addon, mostrar indicador visual |
| Carrito sin addons seleccionados | Permitido — `selectedAddons` es `undefined` |
| Mismo producto, diferentes addons | Tratados como items separados via ID compuesto |
| Editar addons de un producto activo | `upsertProductAddons()` reemplaza todo — el trigger actualiza `has_addons` |
| Eliminar producto con addons | `ON DELETE CASCADE` en la FK — se eliminan automáticamente |
| Addon eliminado mientras está en carrito | El carrito conserva el snapshot (nombre + precio al momento de agregar) |
| `order_items.addons` en tickets | Usar el campo JSONB para mostrar desglose en la impresión del ticket |

---

## 11. Actualización de `types.ts` (Database type)

Tras ejecutar el SQL, agregar la tabla al tipo `Database` en `src/core/supabase/types.ts` para mantener el cliente tipado:

```typescript
product_addons: {
  Row: {
    id: string
    product_id: string
    category_name: string
    name: string
    price: number
    max_quantity: number
    sort_order: number
    active: boolean
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    product_id: string
    category_name: string
    name: string
    price?: number
    max_quantity?: number
    sort_order?: number
    active?: boolean
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    product_id?: string
    category_name?: string
    name?: string
    price?: number
    max_quantity?: number
    sort_order?: number
    active?: boolean
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "product_addons_product_id_fkey"
      columns: ["product_id"]
      isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
  ]
}
```

También agregar las nuevas funciones RPC al tipo `Functions`:

```typescript
get_product_addons_grouped: {
  Args: { p_product_id: string }
  Returns: Json
}
get_products_addons: {
  Args: { p_product_ids: string[] }
  Returns: { product_id: string; addons: Json }[]
}
```

---

## 12. Tasks de Implementación

- [ ] **T1:** Ejecutar SQL — `ALTER TABLE products ADD COLUMN has_addons`, crear tabla `product_addons`, índices, RLS, triggers y funciones
- [ ] **T2:** Actualizar `src/core/supabase/types.ts` con `product_addons`, `ProductAddon`, `AddonGroup`, `SelectedAddon`
- [ ] **T3:** Crear `src/core/services/addonService.ts`
- [ ] **T4:** Actualizar `CartItem` en `CartContext.tsx` (agregar `productId`, `basePrice`, `selectedAddons`)
- [ ] **T5:** Actualizar `addToCart` para aceptar los nuevos campos
- [ ] **T6:** Actualizar `checkoutService.ts` para incluir `addons` en `order_items`
- [ ] **T7:** Crear componente `ProductAddonsSection` para el admin
- [ ] **T8:** Actualizar `ProductEdit.tsx` para incluir la sección de extras
- [ ] **T9:** Actualizar `ProductModal.tsx` para mostrar selector de extras y calcular precio
- [ ] **T10:** Testing — flujo completo: configurar extras → cliente selecciona → pedido incluye detalles

---

## 13. Dependencias y Pre-requisitos

- Acceso a Supabase Dashboard para ejecutar las migraciones SQL
- Las tablas `products`, `businesses`, `collaborators` y `profiles` ya existen con la estructura actual
- Componentes de UI existentes (`Input`, `Button`, `Select`, `Textarea` de `@components/restaurant-ui`) — sin cambios requeridos

---

## 14. Notas Finales

- Los extras son **opcionales** — el cliente puede pedir solo el producto base.
- Los extras **no multiplican por la cantidad del producto base**; cada extra tiene su propia `quantity` (ej: 2x Queso Extra en 1 plato).
- El campo `product_name` en `order_items` sigue siendo solo el nombre del producto — el desglose de extras va en el campo `addons` (JSONB).
- El **trigger** `sync_product_has_addons` elimina la necesidad de gestionar `has_addons` manualmente desde el frontend.
- El campo `updated_at` en `product_addons` lo gestiona el **trigger** — NO pasar `updated_at` desde el servicio al hacer updates.

---

**Documento revisado — listo para implementación.**
