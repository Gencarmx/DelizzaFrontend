# Optimizaciones Pendientes de Supabase

**Fecha:** 2026-03-27 | **Estado:** Pendiente de implementación

---

## 1. orderService.ts — Uso inconsistente de profileId

**Archivos:** `src/core/services/orderService.ts` líneas 281 y 336

Las funciones `markOrderAsPaid` y `cancelOrder` pasan `user.id` (auth.users.id) a `canUserManageOrder` en lugar de `profileId`, forzando una consulta adicional a `profiles` en cada operación.

```ts
// ACTUAL — orderService.ts:281
const authorized = await canUserManageOrder(user.id, orderId);

// ACTUAL — orderService.ts:336
const authorized = await canUserManageOrder(user.id, orderId);

// PROPUESTO — pasar profileId directamente (debe recibirse como parámetro o resolverse una sola vez)
const authorized = await canUserManageOrder(profileId, orderId);
```

**Solución:** Modificar las funciones para aceptar `profileId` como parámetro, o resolverlo una sola vez al inicio.

```ts
// Ejemplo de refactor para markOrderAsPaid
export async function markOrderAsPaid(
  orderId: string,
  profileId: string // Añadir como parámetro
): Promise<Order> {
  try {
    const authorized = await canUserManageOrder(profileId, orderId);
    // ...
  }
}
```

---

## 2. loading="lazy" faltante en imágenes

Varios componentes no tienen el atributo `loading="lazy"` en sus imágenes, lo que fuerza la carga inmediata de todas las imágenes al montar el componente.

### Archivos afectados:

**`src/presentation/pages/Cart.tsx`**
- Línea 130: Imagen del producto en el carrito

```tsx
// ACTUAL
<img src={item.image} alt={item.name} className="w-full h-full object-cover" />

// PROPUESTO
<img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
```

**`src/presentation/pages/Products.tsx`**
- Línea 77: Imagen del producto en el grid
- Línea 101: Logo del restaurante

```tsx
// Línea 77 — ACTUAL
<img src={product.image_url} ... />

// Línea 77 — PROPUESTO
<img src={product.image_url} ... loading="lazy" />

// Línea 101 — ACTUAL
<img src={product.businesses.logo_url} ... />

// Línea 101 — PROPUESTO
<img src={product.businesses.logo_url} ... loading="lazy" />
```

**`src/presentation/pages/Favorites.tsx`**
- Línea 47: Imagen del producto en favoritos

```tsx
// ACTUAL
<img src={...} ... />

// PROPUESTO
<img src={...} ... loading="lazy" />
```

**`src/presentation/pages/restaurantUI/ProductList.tsx`**
- Línea 209: Imagen del producto en la lista

```tsx
// ACTUAL
<img ... />

// PROPUESTO
<img ... loading="lazy" />
```

---

## 3. SELECT * innecesario en business_hours

**Archivo:** `src/presentation/pages/RestaurantDetail.tsx` línea 82

Trae todas las columnas de `business_hours` cuando solo necesita algunas.

```ts
// ACTUAL
supabase
  .from("business_hours")
  .select("*")
  .eq("business_id", restaurantId)

// PROPUESTO
supabase
  .from("business_hours")
  .select("day_of_week, open_time, close_time, active")
  .eq("business_id", restaurantId)
```

---

## Resumen de cambios

| # | Archivo | Problema | Impacto |
|---|---------|----------|---------|
| 1 | `orderService.ts:281,336` | Pasa `user.id` en lugar de `profileId` | ~1 query/operación |
| 2 | `Cart.tsx:130` | Sin lazy loading | Storage requests |
| 3 | `Products.tsx:77,101` | Sin lazy loading | Storage requests |
| 4 | `Favorites.tsx:47` | Sin lazy loading | Storage requests |
| 5 | `ProductList.tsx:209` | Sin lazy loading | Storage requests |
| 6 | `RestaurantDetail.tsx:82` | SELECT * en business_hours | Payload innecesario |

---

## Prioridad sugerida

1. **Alta:** #1 — Corrige consultas duplicadas en operaciones frecuentes
2. **Media:** #2-5 — Reduce Storage Requests en páginas con muchas imágenes
3. **Baja:** #6 — Optimización menor de payload
