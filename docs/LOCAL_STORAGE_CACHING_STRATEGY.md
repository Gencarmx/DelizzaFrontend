# Estrategia de Almacenamiento Local para Optimización de Supabase

## Objetivo

Reducir las llamadas a Supabase y mejorar la experiencia del usuario mediante el almacenamiento estratégico de datos en el navegador (localStorage, Service Workers).

---

## Estado Actual

### Análisis del Código Existente

**Home.tsx** (páginas principales):
- 4 queries a Supabase en cada carga:
  - `product_categories` - categorías activas
  - `products` - productos recientes (límite 40)
  - `businesses` - restaurantes activos (incluye `active`, `is_paused`, metadatos)
  - `business_hours` - horarios de todos los restaurantes

**Servicios existentes con caché en memoria:**
- `productCategoryService.ts`: Caché de módulo con TTL de 5 minutos (se pierde al recargar)

**localStorage ya implementado:**
- `CartContext.tsx`: Carrito de compras (clave: `cart`)
- `CartContext.tsx`: Opción de entrega (clave: `deliveryOption`)
- `ThemeContext.tsx`: Tema oscuro/claro

**Service Worker ya configurado:**
- `vite.config.ts`: Workbox activo con `VitePWA`, cachea assets estáticos del bundle.
  Las imágenes de Supabase Storage (URLs externas) NO están cubiertas aún — solo
  requiere agregar `runtimeCaching`, no instalar nada nuevo.

---

## Problema Identificado

Cada visita a la Home genera:
- 1 query a `product_categories`
- 1 query a `products` (hasta 40 registros)
- 1 query a `businesses`
- 1 query a `business_hours` (con `.in()` para todos los IDs)

Total: **~4 requests mínimos** por carga de página, más latencia de red.

---

## Solución Propuesta (revisada)

### 1. Separación crítica: metadatos vs. estado dinámico

El mayor riesgo de la estrategia de caché en este sistema es confundir datos
**estáticos** (nombre, logo, horario semanal) con datos **dinámicos** (si el
restaurante está abierto, pausado o inactivo ahora mismo).

> **Regla de oro**: los campos `businesses.active` y `businesses.is_paused` cambian
> en cualquier momento por acción del owner. Si se cachean, un restaurante cerrado
> seguirá apareciendo abierto hasta que expire el TTL, y los clientes podrían
> intentar hacer pedidos a un restaurante que ya no los acepta.
>
> Estos dos campos **NO se cachean**. Se obtienen frescos en cada carga.

### 2. Caché Persistente con localStorage

#### Datos seguros para cachear y TTL:

| Datos | TTL | Justificación |
|-------|-----|---------------|
| Categorías de productos | 24 horas | Cambian muy raramente; invalidar manualmente si el admin las modifica |
| Metadatos de restaurantes¹ | 24 horas | Solo nombre, logo, dirección — sin `active` ni `is_paused` |
| Horarios (`business_hours`) | 24 horas | El *horario configurado* es semanal; el estado "abierto ahora" se computa siempre en tiempo real |
| Productos recientes (carrusel Home) | 15 minutos | Equilibrio entre frescura y reducción de queries |
| Direcciones guardadas del usuario | 30 minutos | Invalidar proactivamente en cada alta/baja de dirección |

¹ El metadato de restaurante cacheable es: `id`, `name`, `logo_url`, `address`.

#### Datos que NO se deben cachear:

| Datos | Razón |
|-------|-------|
| `businesses.active` / `businesses.is_paused` | Cambian en tiempo real; cachear rompería la validación de pedidos |
| Estado computado "abierto/cerrado/pausado" | Depende de la hora actual; puede cambiar minuto a minuto |
| Rol y perfil del usuario | `AuthContext` lo prohíbe explícitamente por seguridad: el rol solo es válido desde la DB; cachear permite auto-asignación de roles elevados si la DB no responde |
| Pedidos del restaurante (owner) | Ya gestionados por Supabase Realtime; cachear crearía conflicto con la suscripción en tiempo real de `Orders.tsx` |
| Productos propios del owner | Alta frecuencia de modificación; `ProductList.tsx` ya tiene `refreshKey`; la invalidación sería más costosa que el ahorro |

### 3. Estrategia "Stale-While-Revalidate" (solo para datos seguros)

Para la página Home, con los datos que sí son seguros para cachear:

1. **Carga inmediata**: Mostrar categorías, metadatos de restaurantes y productos
   desde localStorage al instante (sin spinner).
2. **Fetch en background**: Consultar Supabase sin bloquear la UI.
3. **Siempre fresh**: `active`, `is_paused` y el cálculo del estado del restaurante
   se obtienen en el mismo fetch en background y nunca desde caché.
4. **Actualización condicional**: Solo actualizar la UI si hay cambios.
5. **Persistencia**: Guardar los datos cacheables actualizados en localStorage.

```
┌─────────────────────────────────────────────────────────────────┐
│                       Flujo de Carga (Home)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  localStorage         UI                   Supabase             │
│  ┌──────────────┐    ┌──────────────┐      ┌──────────────┐     │
│  │ categorías   │───▶│ render       │      │              │     │
│  │ metadatos    │    │ inmediato    │      │ fetch en     │     │
│  │ productos    │    │ (sin spinner)│◀─────│ background   │     │
│  └──────────────┘    └──────────────┘      │              │     │
│                             │              │ active +     │     │
│                             │              │ is_paused    │     │
│                             ▼              │ (siempre     │     │
│                      ┌──────────────┐      │  frescos)    │     │
│                      │ estado del   │◀─────│              │     │
│                      │ restaurante  │      └──────────────┘     │
│                      │ (SIEMPRE     │                           │
│                      │  del fetch)  │                           │
│                      └──────────────┘                           │
│                             │                                   │
│                             ▼                                   │
│                      ┌──────────────┐                           │
│                      │ localStorage │ ── actualizar solo datos  │
│                      │ (actualizar) │    cacheables si cambiaron│
│                      └──────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Service Worker para Imágenes (ya disponible)

Workbox ya está activo (`vite.config.ts`). Solo se requiere agregar `runtimeCaching`
para las URLs de Supabase Storage. No hay dependencias nuevas que instalar.

**Estrategia:** `StaleWhileRevalidate` para imágenes de restaurantes y productos.

```typescript
// Agregar dentro de workbox: {} en vite.config.ts
runtimeCaching: [
  {
    urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'supabase-images',
      expiration: {
        maxEntries: 200,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 días
      },
    },
  },
],
```

---

## Estructura de Claves

```typescript
const CACHE_KEYS = {
  CATEGORIES:      'dlizza_cache_categories',
  BUSINESS_META:   'dlizza_cache_business_meta',   // solo nombre/logo/dirección
  BUSINESS_HOURS:  'dlizza_cache_business_hours',
  PRODUCTS:        'dlizza_cache_products',
  ADDRESSES:       'dlizza_cache_addresses',
  // NO incluir: perfil, rol, pedidos, productos del owner, estado open/paused
};

interface CacheMetadata {
  timestamp: number;
  ttl: number;       // milliseconds
  version: number;   // incrementar para forzar invalidación global
}

interface CachedData<T> {
  data: T;
  metadata: CacheMetadata;
}
```

**Versión actual del esquema:** `1`
Incrementar `version` en cualquier cambio de estructura para que los navegadores
con datos viejos invaliden automáticamente sin necesidad de limpiar manualmente.

---

## Plan de Implementación por Fases

### Fase 1: Utilidad de Caché + Categorías + Productos (Alta Prioridad)

1. **Crear `src/core/services/cacheService.ts`**
   - Métodos: `get<T>`, `set<T>`, `invalidate`, `isStale`, `clearAll`
   - Manejo de errores de cuota (`QuotaExceededError`) con fallback silencioso
   - Soporte de versión para invalidación global

2. **Migrar categorías** de caché en memoria a localStorage
   - TTL: 24h
   - Llamar a `invalidate(CACHE_KEYS.CATEGORIES)` cuando el admin cree/modifique categorías

3. **Cachear productos del carrusel** (Home)
   - TTL: 15 minutos
   - Stale-while-revalidate

4. **Cachear metadatos de restaurantes** (solo `id`, `name`, `logo_url`, `address`)
   - TTL: 24h
   - Stale-while-revalidate para la presentación visual
   - `active` e `is_paused` siempre del fetch en background

5. **Cachear `business_hours`** (el horario configurado, no el estado calculado)
   - TTL: 24h

**Impacto esperado:** Reduce 2–3 queries por visita a Home tras la primera carga

### Fase 2: Imágenes via Workbox (Media Prioridad)

1. Agregar `runtimeCaching` al `workbox` existente en `vite.config.ts`
2. Sin instalaciones adicionales — `vite-plugin-pwa` ya está presente

**Impacto esperado:** Elimina la re-descarga de logos e imágenes de productos

### Fase 3: Direcciones del usuario (Media Prioridad)

1. Cachear en localStorage con TTL de 30 minutos
2. Invalidar proactivamente desde `AddressContext` en cada `refreshAddresses()`,
   alta y baja de dirección
3. Limpiar al hacer logout

### Fase 4: Optimización Avanzada (Baja Prioridad)

1. **IndexedDB** si los datos en localStorage superan 1 MB consistentemente
2. **Prefetching** de restaurantes al hacer hover

---

## Consideraciones de Seguridad

- **NO cachear**: passwords, tokens de sesión, rol del usuario, datos de pago
- **NO cachear** `businesses.active` ni `businesses.is_paused` — riesgo operacional directo
- **NO cachear** pedidos del restaurante — Realtime ya los gestiona
- **Limpiar caché al hacer logout**: llamar a `cacheService.clearAll()` dentro del
  `signOut` de `AuthContext`
- **Sanitización implícita**: los datos provienen de Supabase (fuente confiable),
  pero nunca almacenar input directo del usuario sin sanitizar

---

## Métricas de Éxito

- Reducir llamadas a Supabase en Home: **>50%** (tras primera visita)
- Tiempo de carga First Contentful Paint: **<1.5s**
- Tiempo de carga bajo red lenta (3G): **<3s**
- Porcentaje de requests servidos desde caché: **>70%**

---

## Referencias Técnicas

- **localStorage**: Limitado a ~5MB, sincrónico, solo strings
- **IndexedDB**: Mayor capacidad, asíncrono, más complejo — reservar para Fase 4
- **Service Workers / Workbox**: Ya activos; solo añadir `runtimeCaching`

---

## Documentación Relacionada

- `src/core/services/productCategoryService.ts` — Ejemplo de caché en memoria (migrar en Fase 1)
- `src/core/context/CartContext.tsx` — Ejemplo de persistencia localStorage existente
- `src/core/context/AuthContext.tsx` — Razón por la que el rol/perfil NO se cachea
- `src/presentation/pages/restaurantUI/Orders.tsx` — Razón por la que los pedidos NO se cachean
- `src/presentation/pages/Home.tsx` — Punto de implementación principal
- `vite.config.ts` — Configuración de Workbox existente (agregar `runtimeCaching` en Fase 2)
