# Guía de Implementación: Sistema de Caché con localStorage

Basada en `LOCAL_STORAGE_CACHING_STRATEGY.md`. Este documento explica exactamente
cómo implementar cada paso, en qué archivos y en qué orden.

---

## Estado actual (pre-implementación)

| Condición requerida | Estado |
|---|---|
| `cacheService.ts` con manejo de errores de cuota | ❌ No existe |
| Limpieza de caché al hacer logout | ❌ `signOut` solo llama a `supabase.auth.signOut()` |
| Versionado para invalidación por cambio de esquema | ❌ No implementado |

Las tres condiciones deben cumplirse **antes** de que cualquier componente use el caché,
de lo contrario se producirán datos corruptos entre sesiones.

---

## Paso 1 — Crear `src/core/services/cacheService.ts`

Este es el único archivo nuevo que requiere la estrategia. Todos los demás pasos
son modificaciones a archivos existentes.

```typescript
// src/core/services/cacheService.ts

/**
 * Servicio de caché genérico sobre localStorage.
 *
 * Garantías:
 * - Nunca lanza excepciones hacia los consumidores (falla en silencio).
 * - Soporta entornos sin localStorage (modo incógnito, cuota llena, SSR).
 * - Versión global: al incrementar CACHE_VERSION todos los datos viejos
 *   se descartan automáticamente en la primera lectura.
 */

/** Incrementar este número cada vez que cambie la estructura de datos cacheados. */
const CACHE_VERSION = 1;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;       // milisegundos
  version: number;
}

/** Prefijo común para identificar y limpiar todas las claves del sistema. */
const KEY_PREFIX = 'dlizza_cache_';

export const CACHE_KEYS = {
  CATEGORIES:     `${KEY_PREFIX}categories`,
  BUSINESS_META:  `${KEY_PREFIX}business_meta`,
  BUSINESS_HOURS: `${KEY_PREFIX}business_hours`,
  PRODUCTS:       `${KEY_PREFIX}products`,
  ADDRESSES:      `${KEY_PREFIX}addresses`,
} as const;

export type CacheKey = typeof CACHE_KEYS[keyof typeof CACHE_KEYS];

// TTLs en milisegundos
export const CACHE_TTL = {
  CATEGORIES:     24 * 60 * 60 * 1000,  // 24 horas
  BUSINESS_META:  24 * 60 * 60 * 1000,  // 24 horas
  BUSINESS_HOURS: 24 * 60 * 60 * 1000,  // 24 horas
  PRODUCTS:       15 * 60 * 1000,        // 15 minutos
  ADDRESSES:      30 * 60 * 1000,        // 30 minutos
} as const;

/** Comprueba si localStorage está disponible (falla en SSR y modo incógnito lleno). */
function isStorageAvailable(): boolean {
  try {
    const test = '__dlizza_test__';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lee una entrada del caché. Devuelve `null` si:
 * - La clave no existe.
 * - Los datos están vencidos (TTL expirado).
 * - La versión del esquema no coincide.
 * - localStorage no está disponible.
 * - Los datos están corruptos (JSON inválido).
 */
export function cacheGet<T>(key: CacheKey): T | null {
  if (!isStorageAvailable()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);

    // Invalidar si la versión no coincide
    if (entry.version !== CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }

    // Invalidar si el TTL expiró
    if (Date.now() - entry.timestamp > entry.ttl) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    // JSON corrupto u otro error inesperado
    try { localStorage.removeItem(key); } catch { /* ignorar */ }
    return null;
  }
}

/**
 * Escribe una entrada en el caché.
 * Si localStorage está lleno (`QuotaExceededError`), falla en silencio
 * y el sistema continúa sin caché para esa operación.
 */
export function cacheSet<T>(key: CacheKey, data: T, ttl: number): void {
  if (!isStorageAvailable()) return;
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      version: CACHE_VERSION,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    // QuotaExceededError u otro — ignorar, el sistema funciona sin caché
    console.warn('[cacheService] No se pudo guardar en localStorage:', error);
  }
}

/**
 * Invalida una clave específica.
 * Usar cuando los datos de esa clave cambian de forma proactiva
 * (ej. el admin modifica las categorías).
 */
export function cacheInvalidate(key: CacheKey): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.removeItem(key);
  } catch { /* ignorar */ }
}

/**
 * Elimina TODAS las claves del sistema de caché.
 * Llamar obligatoriamente al hacer logout.
 */
export function cacheClearAll(): void {
  if (!isStorageAvailable()) return;
  try {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch { /* ignorar */ }
}

/**
 * Comprueba si una clave tiene datos válidos y no vencidos.
 * Útil para decidir si mostrar datos del caché mientras se recarga en background.
 */
export function cacheIsValid(key: CacheKey): boolean {
  return cacheGet(key) !== null;
}
```

---

## Paso 2 — Agregar limpieza de caché en `signOut`

**Archivo:** `src/core/context/AuthContext.tsx`

Localizar la función `signOut` (actualmente en la línea ~322) y modificarla:

```typescript
// ANTES
const signOut = async () => {
  await supabase.auth.signOut();
};

// DESPUÉS
import { cacheClearAll } from '@core/services/cacheService';

const signOut = async () => {
  cacheClearAll();          // limpiar caché antes de cerrar sesión
  await supabase.auth.signOut();
};
```

> **Por qué antes y no después:** `supabase.auth.signOut()` dispara `onAuthStateChange`
> de forma asíncrona. Si se limpia el caché después, hay una ventana donde el evento
> de cambio de sesión puede intentar leer datos del caché del usuario anterior.

---

## Paso 3 — Migrar categorías de caché en memoria a localStorage

**Archivo:** `src/core/services/productCategoryService.ts`

Reemplazar las variables de módulo `_categoriesCache` y `_cacheTimestamp` por
las funciones del nuevo `cacheService`:

```typescript
// ANTES
let _categoriesCache: ProductCategory[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function invalidateCategoriesCache() {
  _categoriesCache = null;
  _cacheTimestamp = 0;
}

export async function getActiveProductCategories(): Promise<ProductCategory[]> {
  const now = Date.now();
  if (_categoriesCache && now - _cacheTimestamp < CACHE_TTL_MS) {
    return _categoriesCache;
  }
  // ... fetch de Supabase
  _categoriesCache = data || [];
  _cacheTimestamp = now;
  return _categoriesCache;
}

// DESPUÉS
import { cacheGet, cacheSet, cacheInvalidate, CACHE_KEYS, CACHE_TTL } from './cacheService';

export function invalidateCategoriesCache() {
  cacheInvalidate(CACHE_KEYS.CATEGORIES);
}

export async function getActiveProductCategories(): Promise<ProductCategory[]> {
  const cached = cacheGet<ProductCategory[]>(CACHE_KEYS.CATEGORIES);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error obteniendo categorías de productos:', error);
      return [];
    }

    const result = data || [];
    cacheSet(CACHE_KEYS.CATEGORIES, result, CACHE_TTL.CATEGORIES);
    return result;
  } catch (error) {
    console.error('Error en getActiveProductCategories:', error);
    return [];
  }
}
```

> **Nota:** Se elimina el fallback a caché vencida en caso de error de red
> (`return _categoriesCache ?? []`). Con localStorage, los datos vencidos ya
> fueron eliminados por `cacheGet`. Si se quiere mantener ese comportamiento
> (mostrar datos viejos cuando Supabase falla), habría que guardar una copia
> de emergencia separada — complejidad que no justifica el beneficio para categorías.

---

## Paso 4 — Implementar caché en Home.tsx

**Archivo:** `src/presentation/pages/Home.tsx`

La lógica stale-while-revalidate se implementa en el `useEffect` de `fetchData`.
El patrón es:

1. Leer del caché → renderizar inmediatamente (sin spinner para esos datos).
2. Ejecutar el fetch normal en background.
3. Actualizar el estado y el caché con los datos frescos.
4. `active` e `is_paused` **siempre** del fetch, nunca del caché.

```typescript
import {
  cacheGet, cacheSet,
  CACHE_KEYS, CACHE_TTL
} from '@core/services/cacheService';

// Dentro del useEffect fetchData:

const fetchData = async () => {
  try {
    setError(null);

    // ── 1. Cargar desde caché (instantáneo) ──────────────────────────
    const cachedCategories = cacheGet<ProductCategory[]>(CACHE_KEYS.CATEGORIES);
    const cachedProducts   = cacheGet<any[]>(CACHE_KEYS.PRODUCTS);
    const cachedBizMeta    = cacheGet<any[]>(CACHE_KEYS.BUSINESS_META);
    const cachedHours      = cacheGet<any[]>(CACHE_KEYS.BUSINESS_HOURS);

    if (cachedCategories) setCategories(cachedCategories);
    if (cachedProducts)   setAllProducts(cachedProducts);

    // Si tenemos metadatos y horas en caché, podemos pre-renderizar
    // los restaurantes en gris (sin estado open/closed aún)
    // El estado real llega con el fetch en background (ver paso 3)

    // Ocultar spinners solo para los datos ya disponibles
    setLoading(prev => ({
      ...prev,
      categories:  cachedCategories ? false : true,
      allProducts: cachedProducts   ? false : true,
      restaurants: false, // el grid se muestra vacío hasta el fetch
    }));

    // ── 2. Fetch en background (siempre se ejecuta) ──────────────────
    setLoading({ restaurants: true, categories: !cachedCategories, allProducts: !cachedProducts });

    const [categoriesData, allProductsResult, restaurantsResult] = await Promise.all([
      getActiveProductCategories(),   // ya usa su propio caché
      supabase
        .from('products')
        .select('id, name, price, description, image_url, active, business_id, category_id')
        .eq('active', true)
        .limit(PRODUCTS_CAROUSEL_LIMIT),
      supabase
        .from('businesses')
        // CRÍTICO: active e is_paused SIEMPRE se obtienen frescos
        .select('id, name, address, logo_url, active, is_paused')
        .eq('active', true),
    ]);

    // business_hours: usar caché si existe, si no hacer fetch
    let hoursData: any[] = cachedHours ?? [];
    if (!cachedHours && !restaurantsResult.error && restaurantsResult.data?.length) {
      const ids = restaurantsResult.data.map((b: any) => b.id);
      const { data: freshHours } = await supabase
        .from('business_hours')
        .select('business_id, day_of_week, open_time, close_time, active')
        .in('business_id', ids);
      hoursData = freshHours ?? [];
      cacheSet(CACHE_KEYS.BUSINESS_HOURS, hoursData, CACHE_TTL.BUSINESS_HOURS);
    }

    // ── 3. Procesar y actualizar estado ──────────────────────────────
    if (!restaurantsResult.error && restaurantsResult.data) {
      // Cachear solo metadatos (sin active ni is_paused)
      const bizMeta = restaurantsResult.data.map((b: any) => ({
        id: b.id, name: b.name, logo_url: b.logo_url, address: b.address,
      }));
      cacheSet(CACHE_KEYS.BUSINESS_META, bizMeta, CACHE_TTL.BUSINESS_META);

      // Estado del restaurante: computed con datos frescos de active e is_paused
      const hoursMap = new Map<string, BusinessHour[]>();
      for (const hour of hoursData) {
        const existing = hoursMap.get(hour.business_id) ?? [];
        existing.push(hour as BusinessHour);
        hoursMap.set(hour.business_id, existing);
      }

      setRestaurants(restaurantsResult.data.map((b: any) => {
        const hours = hoursMap.get(b.id) ?? [];
        const status = computeRestaurantStatus(b.active, b.is_paused, hours);
        return {
          id: b.id,
          name: b.name,
          address: b.address || 'Dirección no disponible',
          status,
          logo: b.logo_url || 'https://via.placeholder.com/200',
        };
      }));
    }

    if (!allProductsResult.error && allProductsResult.data) {
      // Construir businessNameMap desde el resultado fresco
      const businessNameMap = new Map(
        (restaurantsResult.data ?? []).map((b: any) => [b.id, b.name])
      );
      const products = allProductsResult.data
        .filter((p: any) => businessNameMap.has(p.business_id))
        .map((p: any) => ({
          id: p.id, name: p.name, price: p.price,
          restaurant: businessNameMap.get(p.business_id) || 'Unknown',
          restaurantId: p.business_id,
          description: p.description || '',
          image: p.image_url || 'https://via.placeholder.com/200',
          category_id: p.category_id,
          rating: '4.5', delivery: '$30', time: '30 min',
        }));
      setAllProducts(products);
      cacheSet(CACHE_KEYS.PRODUCTS, products, CACHE_TTL.PRODUCTS);
    }

    setLoading({ restaurants: false, categories: false, allProducts: false });
  } catch (error) {
    console.error('Error general al cargar datos:', error);
    setError('Error al cargar los datos. Por favor, intenta de nuevo.');
    setLoading({ restaurants: false, categories: false, allProducts: false });
  }
};
```

---

## Paso 5 — Caché de direcciones en AddressContext

**Archivo:** `src/core/context/AddressContext.tsx`

Las direcciones se cargan en `loadAddresses` y se refrescan con `refreshAddresses`.
Ambos puntos deben usar y actualizar el caché. La clave incluye el `profileId`
para que cada usuario tenga su propio caché.

```typescript
import { cacheGet, cacheSet, cacheInvalidate, CACHE_TTL } from '@core/services/cacheService';
import type { CacheKey } from '@core/services/cacheService';

// La clave de direcciones es dinámica (por usuario)
// Se construye con el profileId para aislar datos entre cuentas
function addressCacheKey(profileId: string): CacheKey {
  return `dlizza_cache_addresses_${profileId}` as CacheKey;
}

// En loadAddresses — leer caché antes del fetch:
const cacheKey = addressCacheKey(profileId);
const cached = cacheGet<Address[]>(cacheKey);
if (cached) {
  setAddresses(cached);
  const defaultAddr = cached.find(a => a.is_default) ?? cached[0] ?? null;
  setSelectedAddress(defaultAddr);
  setLoading(false);
  // Continuar igual para refrescar en background si se desea,
  // o hacer return aquí si 30 min de TTL es suficiente.
  return;
}

// Después del fetch exitoso — guardar en caché:
cacheSet(cacheKey, userAddresses, CACHE_TTL.ADDRESSES);

// En refreshAddresses — invalidar para forzar fetch fresco:
export const refreshAddresses = async () => {
  if (profileId) cacheInvalidate(addressCacheKey(profileId));
  // ... lógica existente de reload
};
```

> **Importante:** Llamar también a `cacheInvalidate(addressCacheKey(profileId))`
> en las funciones de alta y baja de direcciones dentro de `addressService.ts`.

---

## Paso 6 — Imágenes via Workbox (sin instalaciones)

**Archivo:** `vite.config.ts`

`vite-plugin-pwa` ya está configurado. Solo agregar `runtimeCaching` dentro del
objeto `workbox` existente:

```typescript
workbox: {
  globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
  navigateFallback: 'index.html',
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,

  // AGREGAR ESTO:
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
},
```

---

## Cuándo incrementar `CACHE_VERSION`

Editar la constante en `cacheService.ts`:

```typescript
const CACHE_VERSION = 2; // era 1
```

Hacer esto cuando:
- Se agrega o elimina un campo en los datos cacheados (ej. se agrega `rating` a los restaurantes)
- Se cambia el tipo de un campo existente
- Se cambia la estructura del objeto almacenado

**No es necesario** para cambios de TTL o lógica que no afectan la forma del dato.

Al incrementar la versión, todos los usuarios descartan sus datos viejos en la
próxima visita y hacen un fetch fresco automáticamente.

---

## Orden de implementación recomendado

```
Paso 1  →  Paso 2  →  Paso 3  →  Paso 4  →  Paso 5  →  Paso 6
  ↑            ↑
Obligatorio  Obligatorio
antes de     antes de
cualquier    cualquier
otro paso    deploy
```

Los pasos 1 y 2 son prerrequisitos bloqueantes. Los pasos 3–6 pueden hacerse
en cualquier orden una vez que 1 y 2 estén listos.
