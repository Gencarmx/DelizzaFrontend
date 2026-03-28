# Reporte de Optimizaciones de Carga en Supabase

## Hallazgos por impacto

---

### 🔴 ALTO IMPACTO

#### 1. `profiles` se consulta de forma redundante en múltiples lugares al iniciar sesión

**Archivos afectados:** 
- [AuthContext.tsx](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/context/AuthContext.tsx)
- [AddressContext.tsx](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/context/AddressContext.tsx)
- [businessService.ts](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/businessService.ts) - [getBusinessByOwner](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/businessService.ts#23-63)
- [orderService.ts](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/orderService.ts) - [canUserManageOrder](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/orderService.ts#518-562)
- [businessService.ts](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/businessService.ts) - [canUserManageBusiness](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/businessService.ts#441-484)

**Problema:** Cada uno de estos lugares hace su propio `SELECT id FROM profiles WHERE user_id = auth.uid()` de forma independiente. Al iniciar sesión, se disparan 3+ consultas a `profiles` en cascada.

```
Login:
  AuthContext    → SELECT id, user_role FROM profiles   ← produce profileId
  AuthContext    → SELECT id FROM profiles (fetchBusinessStatus) ← DUPLICADO
  AddressContext → SELECT id FROM profiles              ← DUPLICADO
  businessService (getBusinessByOwner) → SELECT id FROM profiles ← DUPLICADO
  canUserManageOrder/canUserManageBusiness → SELECT id profiles  ← DUPLICADO en cada UPDATE
```

**Solución:** [AuthContext](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/context/AuthContext.tsx#5-40) ya expone `profileId`. Pasar `profileId` como parámetro a los servicios en lugar de re-consultarlo.

---

#### 2. [fetchBusinessStatus](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/context/AuthContext.tsx#99-172) en [AuthContext](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/context/AuthContext.tsx#5-40) hace 2 queries secuenciales con 5 reintentos cada una

**Archivo:** [AuthContext.tsx](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/context/AuthContext.tsx) líneas 99–171

**Problema:** Al hacer login como owner, se ejecuta:
1. `SELECT id FROM profiles` (hasta 5 veces con reintentos)
2. `SELECT active FROM businesses` (hasta 5 veces con reintentos)

Ambas son **secuenciales** (una espera a la otra). Con timeouts de 8 segundos cada una y 5 reintentos, esto puede bloquear `isAuthReady` hasta **80 segundos** en el peor caso.

Además, la primera query a `profiles` en [fetchBusinessStatus](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/context/AuthContext.tsx#99-172) **duplica exactamente** la que hace [fetchRole](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/context/AuthContext.tsx#65-98) milisegundos antes — la respuesta está en `profileId` pero no se reutiliza.

**Solución detallada:**

```ts
// ==== AUTHCONTEXT.TSX - CAMBIOS REQUERIDOS ====

// 1. Modificar fetchRole para devolver profileId como segundo valor
const fetchRole = async (
  userId: string,
): Promise<{ role: "owner" | "client" | "admin"; profileId: string | null }> => {
  // ... código existente ...
  return { role: userRole, profileId: fetchedProfileId };
};

// 2. Modificar fetchBusinessStatus para aceptar profileId directamente
// EN LUGAR DE userId
const fetchBusinessStatus = async (profileId: string): Promise<boolean> => {
  const MAX_ATTEMPTS = 5;
  const RETRY_DELAY_MS = 1500;
  const QUERY_TIMEOUT_MS = 8000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      // Ya no necesita consultar profiles - solo businesses
      const businessPromise = supabase
        .from("businesses")
        .select("active")
        .eq("owner_id", profileId)
        .maybeSingle();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`TIMEOUT businesses intento ${attempt}`)), QUERY_TIMEOUT_MS)
      );

      const { data: business, error } = await Promise.race([businessPromise, timeoutPromise]);

      if (error || !business) {
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
          continue;
        }
        return false;
      }

      return business.active ?? false;
    } catch {
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
      }
    }
  }

  return false;
};

// 3. En applySession, pasar profileId a fetchBusinessStatus
if (userRole === "owner") {
  // ANTES: await fetchBusinessStatus(currentSession.user.id)
  // DESPUÉS: usar el profileId ya resuelto
  const active = fetchedProfileId 
    ? await fetchBusinessStatus(fetchedProfileId)
    : false;
  // ...
}
```

**Impacto:** Elimina 1 query por cada login de owner (la query redundante a profiles).

---

#### 3. Falta de paginación en consultas de productos

**Archivos afectados:**
- [productService.ts](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/productService.ts) - [getProductsByBusiness](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/productService.ts#34-62)
- [productService.ts](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/productService.ts) - [getProductsByBusiness](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/productService.ts#34-62)

**Problema:** `getProductsByBusiness` carga **TODOS** los productos sin límite ni paginación. Con catálogos grandes (100+ productos), esto:
- Aumenta significativamente el tiempo de carga inicial
- Consume más ancho de banda
- Incrementa el uso de memoria en el cliente

**Solución:**

```ts
// productService.ts
export interface ProductFilters {
  business_id?: string;
  active?: boolean;
  category?: string;
  search?: string;
  // Nuevos filtros de paginación
  limit?: number;
  offset?: number;
}

export async function getProductsByBusiness(
  businessId: string,
  filters?: ProductFilters
): Promise<{ products: Product[]; total: number }> {
  try {
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    // Query principal con paginación
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Aplicar filtros existentes...
    if (filters?.active !== undefined) {
      query = query.eq('active', filters.active);
    }
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }
    if (filters?.category) {
      query = query.eq('category_id', filters.category);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { products: data || [], total: count ?? 0 };
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    throw new Error('No se pudieron obtener los productos');
  }
}

// Función helper adicional para infinite scroll
export async function getMoreProducts(
  businessId: string,
  currentCount: number,
  pageSize: number = 20
): Promise<{ products: Product[]; hasMore: boolean }> {
  const { products, total } = await getProductsByBusiness(businessId, {
    offset: currentCount,
    limit: pageSize,
  });
  
  return {
    products,
    hasMore: currentCount + products.length < total,
  };
}
```

---

### 🟡 MEDIO IMPACTO

#### 4. `SELECT *` en múltiples servicios

**Archivos:**
- [businessService.ts](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/businessService.ts) líneas 47–49 y 100–101
- [productService.ts](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/productService.ts) líneas 39–41

**Problema:** Trae todas las columnas incluyendo campos pesados como `description`, `banner_url`, `logo_url`, etc. que muchos contextos no necesitan.

**Solución detallada para businessService:**

```ts
// getBusinessByOwner - especificar solo columnas necesarias
const { data, error } = await supabase
  .from('businesses')
  .select('id, name, address, logo_url, active, is_paused, has_delivery, has_pickup, delivery_fee, min_order_amount')
  .eq('owner_id', profile.id)
  .single();

// getBusinesses - según contexto de uso
// Para lista pública:
let query = supabase
  .from('businesses')
  .select('id, name, address, logo_url, active')
  .order('created_at', { ascending: false });

// Para panel admin:
let query = supabase
  .from('businesses')
  .select('*')  // Todas las columnas necesarias para gestión
  .order('created_at', { ascending: false });
```

**Solución detallada para productService:**

```ts
// getProductsByBusiness - especificar columnas esenciales
const { data, error } = await supabase
  .from('products')
  .select('id, name, price, image_url, active, category_id, stock')
  .eq('business_id', businessId)
  .order('created_at', { ascending: false });
```

---

#### 5. [AddressContext](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/context/AddressContext.tsx#6-13) re-consulta `profiles` aunque `profileId` ya está en [AuthContext](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/context/AuthContext.tsx#5-40)

**Archivo:** [AddressContext.tsx](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/context/AddressContext.tsx) líneas 38–42 y 79–83

**Problema:** Al montar el contexto de direcciones, hace `SELECT id FROM profiles WHERE user_id = ?` aunque [AuthContext](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/context/AuthContext.tsx#5-40) ya tiene ese dato disponible como `profileId`.

**Solución:**

```tsx
// AddressContext.tsx
export function AddressProvider({ children }: { children: ReactNode }) {
  // ANTES: const { user } = useAuth();
  const { user, profileId } = useAuth();  // ← Agregar profileId
  
  // En loadAddresses:
  const loadAddresses = async () => {
    if (!user) {
      // ...
    }

    try {
      setLoading(true);
      
      // ANTES:
      // const { data: profile } = await supabase
      //   .from('profiles')
      //   .select('id')
      //   .eq('user_id', user.id)
      //   .single();
      // if (profile) { ... }
      
      // DESPUÉS: Usar profileId directamente
      if (profileId) {
        const userAddresses = await addressService.getAddressesByProfileId(profileId);
        // ...
      }
    } catch (error) {
      // ...
    }
  };

  // En refreshAddresses (mismo cambio):
  const refreshAddresses = async () => {
    if (!user || !profileId) return;
    // Eliminar la query a profiles
    const userAddresses = await addressService.getAddressesByProfileId(profileId);
    // ...
  };
}
```

---

#### 6. [analyticsService-fixed.ts](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/analyticsService-fixed.ts) duplicado (Dead Code)

**Archivo:** [src/core/services/analyticsService-fixed.ts](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/analyticsService-fixed.ts) (12 KB)

**Problema:** 
- Existe un archivo `analyticsService-fixed.ts` además del `analyticsService.ts` original (ambos de ~12KB)
- **Verificación:** No se encuentra ninguna importación de estos archivos en el codebase actual
- Ambos son **dead code** que confunde y aumenta el tamaño del bundle

**Solución:** Eliminar ambos archivos si no se usan, o mantener solo uno y documentar su propósito.

```bash
# Verificar uso antes de eliminar
grep -r "analyticsService" src/ --include="*.ts" --include="*.tsx"
```

---

#### 7. Funciones de autorización re-consultan `profileId` redundantemente

**Archivos:** 
- [orderService.ts](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/orderService.ts) líneas 529–533
- [businessService.ts](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/businessService.ts) líneas 457–461

**Problema:** `canUserManageOrder` y `canUserManageBusiness` hacen `SELECT id FROM profiles WHERE user_id = ?` en cada llamada. Estas funciones son invocadas en operaciones de UPDATE/DELETE de pedidos.

**Solución detallada:**

```ts
// ==== ORDER SERVICE ====

// ANTES:
export async function canUserManageOrder(
  userId: string,  // ← auth.users.id
  orderId: string,
): Promise<boolean> {
  // Query a profiles...
}

// DESPUÉS:
export async function canUserManageOrder(
  profileId: string,  // ← profiles.id directamente
  orderId: string,
): Promise<boolean> {
  try {
    // Ya no necesita consultar profiles
    const { data, error } = await supabase
      .from("orders")
      .select(`
        business_id,
        businesses!inner(owner_id)
      `)
      .eq("id", orderId)
      .eq("businesses.owner_id", profileId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return false;
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error("Error verificando permisos del pedido:", error);
    return false;
  }
}

// ==== BUSINESS SERVICE ====

// ANTES:
export async function canUserManageBusiness(
  authUserId: string,  // ← auth.users.id
  businessId: string,
): Promise<boolean> {
  // Query a profiles...
}

// DESPUÉS:
export async function canUserManageBusiness(
  profileId: string,  // ← profiles.id directamente
  businessId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("businesses")
      .select('owner_id')
      .eq('id', businessId)
      .eq('owner_id', profileId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return false;
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error verificando permisos:', error);
    return false;
  }
}

// ==== CALLSITES - ACTUALIZAR LLAMADAS ====

// En orderService.ts (líneas 179, 275, 330):
// ANTES:
const authorized = await canUserManageOrder(user.id, orderId);
// DESPUÉS:
const authorized = await canUserManageOrder(profileId, orderId);

// Necesitas pasar profileId desde el contexto donde se llama
```

---

### 🟢 BAJO IMPACTO / BUENAS PRÁCTICAS

#### 8. [toggleBusinessStatus](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/businessService.ts#270-301) hace 2 queries innecesariamente

**Archivo:** [businessService.ts](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/businessService.ts) líneas 273–300

**Problema:** Primero llama `getBusinessById()` (que hace JOIN con profiles) solo para leer `active`, luego hace el UPDATE.

**Solución:**

```ts
// ANTES:
export async function toggleBusinessStatus(businessId: string): Promise<Business> {
  const business = await getBusinessById(businessId);  // Query 1
  if (!business) throw new Error('...');
  
  const newStatus = !business.active;
  
  const { data, error } = await supabase  // Query 2
    .from('businesses')
    .update({ active: newStatus, updated_at: new Date().toISOString() })
    .eq('id', businessId)
    .select()
    .single();
  // ...
}

// DESPUÉS:
export async function toggleBusinessStatus(
  businessId: string, 
  newStatus: boolean  // ← El UI envía el nuevo estado directamente
): Promise<Business> {
  const { data, error } = await supabase
    .from('businesses')
    .update({ 
      active: newStatus, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', businessId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

#### 9. [getBusinessStats](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/businessService.ts#415-440) trae todas las filas para contar en el cliente

**Archivo:** [businessService.ts](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/businessService.ts) líneas 424–426

**Problema:** `SELECT active FROM businesses` trae todas las filas y cuenta en JS. Con 10 restaurantes es trivial, pero la práctica correcta es usar `count` de PostgREST.

**Solución:**

```ts
export async function getBusinessStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}> {
  try {
    // Total
    const { count: total } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true });

    // Activos
    const { count: active } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    return {
      total: total ?? 0,
      active: active ?? 0,
      inactive: (total ?? 0) - (active ?? 0),
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas de restaurantes:', error);
    throw new Error('No se pudieron obtener las estadísticas');
  }
}
```

---

### 🟣 INFRAESTRUCTURA (MEJORAS ARQUITECTÓNICAS)

#### 10. Sistema de cacheo para consultas frecuentes

**Problema:** Cada cambio de ruta vuelve a cargar los mismos datos (productos, negocios) sin cacheo. No existe capa de caché a nivel de aplicación.

**Solución sugerida (React Query / TanStack Query):**

```ts
// 安装: bun add @tanstack/react-query
// Configuración en main.tsx:

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000,    // 10 minutos en cache
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Uso en componentes:
import { useQuery } from '@tanstack/react-query';
import { getProductsByBusiness } from '@core/services/productService';

function ProductList({ businessId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['products', businessId],
    queryFn: () => getProductsByBusiness(businessId),
  });
  
  // ...
}
```

**Alternativa simple sin librería adicional (React Context Cache):**

```ts
// core/context/QueryCacheContext.tsx
const queryCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>
): { data: T | null; isLoading: boolean } {
  const cached = queryCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { data: cached.data as T, isLoading: false };
  }
  
  const data = fetcher(); // ejecutar fetcher
  queryCache.set(key, { data, timestamp: Date.now() });
  
  return { data, isLoading: false };
}
```

---

## Resumen de cambios propuestos

| # | Cambio | Queries Ahorradas | Payload Ahorrado | Riesgo |
|---|--------|-------------------|-----------------|--------|
| **1+2** | Pasar `profileId` de `fetchRole` a `fetchBusinessStatus` | 1 por login owner | - | Bajo |
| **1+7** | Pasar `profileId` a funciones de autorización | 1 por UPDATE/DELETE | - | Medio |
| **4** | Usar `profileId` del AuthContext en AddressContext | 1-2 por login | - | Bajo |
| **3** | Implementar paginación en `getProductsByBusiness` | - | 50-90% por carga | Medio |
| **5** | Reemplazar `SELECT *` con columnas específicas | 0 | 30-70% por query | Muy bajo |
| **6** | Eliminar archivos analyticsService duplicados | - | ~12KB bundle | Muy bajo |
| **8** | Fusionar GET+UPDATE en `toggleBusinessStatus` | 1 por toggle | - | Muy bajo |
| **9** | Usar COUNT en servidor para stats | 0 | 90%+ | Muy bajo |
| **10** | Implementar cacheo de queries | Varias por navegación | 50-100% | Medio |

---

## Impacto Estimado

### Flujo de Login (Owner)
```
ANTES:
  fetchRole          → 1 query (profiles)
  fetchBusinessStatus → 2 queries (profiles + businesses) × 5 reintentos máx
  AddressContext     → 1 query (profiles)
  Total: 4+ queries mínimo, hasta 12 en worst case

DESPUÉS:
  fetchRole          → 1 query (profiles)
  fetchBusinessStatus → 1 query (businesses) × 5 reintentos máx
  AddressContext     → 0 queries (usa profileId)
  Total: 2+ queries mínimo, hasta 6 en worst case

MEJORA: ~50% reducción en queries de login
```

### Carga de Productos (Cliente)
```
ANTES:
  getProductsByBusiness → SELECT * FROM products (todos los campos, todas las filas)
  Payload: ~500KB para 100 productos

DESPUÉS:
  getProductsByBusiness → SELECT id, name, price, image_url... LIMIT 50
  Payload: ~50KB para 50 productos

MEJORA: ~90% reducción en payload
```

### Operaciones de Pedido (Owner)
```
ANTES:
  canUserManageOrder → SELECT id FROM profiles + JOIN orders
  Por cada UPDATE/DELETE de pedido

DESPUÉS:
  canUserManageOrder → Solo JOIN orders (recibe profileId como parámetro)

MEJORA: 1 query menos por operación
```

---

## Priorización Recomendada

| Sprint | Cambios | Impacto |
|--------|---------|---------|
| **Sprint 1** | #1, #2, #4 (Auth + Address) | Alto - Login 50% más rápido |
| **Sprint 2** | #7 (Funciones autorización) | Medio - Mejora operaciones |
| **Sprint 3** | #3 (Paginación productos) | Alto - Carga productos 90% más ligera |
| **Sprint 4** | #5, #8, #9 (SELECT *, toggles, COUNT) | Bajo - Optimización incremental |
| **Sprint 5** | #6 (Dead code), #10 (Cache) | Bajo/Medio - Mantenimiento + arquitectura |

---

*Documento generado: Análisis de código fuente verificado contra Supabase client patterns*
*Archivos analizados: AuthContext.tsx, AddressContext.tsx, businessService.ts, orderService.ts, productService.ts*
