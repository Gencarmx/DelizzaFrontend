# Auditoría de Optimización Supabase
**Fecha:** 2026-03-26 | **Métricas que motivaron el análisis:** 7,861 DB Requests · 7,329 Storage Requests (últimas 24h)

---

## 🔴 CRÍTICO — Causas raíz de los picos

### C-1. `SearchBar` duplica todas las queries de `Home.tsx`

**Archivos:** [`Home.tsx`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/presentation/pages/Home.tsx) · [`SearchBar.tsx`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/presentation/components/layout/SearchBar.tsx)

`SearchBar` está montado dentro de `Home.tsx` y hace sus propias queries en `useEffect`, duplicando exactamente
las que ya lanzó `Home.tsx` en el mismo render:

```
Home.tsx lanza:
  SELECT products (activos)           → query 1
  SELECT businesses (activos)         → query 2
  SELECT businesses IN (ids)          → query 3 (innecesaria, ver C-3)
  SELECT business_hours IN (ids)      → query 4

SearchBar.tsx lanza EN PARALELO:
  SELECT products (activos)           → query 5  ⚠️ duplicada
  SELECT businesses (activos)         → query 6  ⚠️ duplicada
```

**Cada visita a Home genera 6 queries cuando deberían ser 3.**

**Solución:** Pasar los datos como props al `SearchBar`.

```tsx
// Home.tsx
<SearchBar
  initialProducts={allProducts}
  initialRestaurants={restaurants}
  onProductSelect={handleProductClick}
  onRestaurantSelect={(r) => navigate(`/restaurant-detail/${r.id}`)}
/>

// SearchBar.tsx — eliminar el useEffect de loadData(), usar props
interface SearchBarProps {
  initialProducts?: ProductResult[];
  initialRestaurants?: RestaurantResult[];
  onProductSelect?: (p: ProductResult) => void;
  onRestaurantSelect?: (r: RestaurantResult) => void;
}
export function SearchBar({ initialProducts = [], initialRestaurants = [] }: SearchBarProps) {
  // La búsqueda queda 100% local (fuzzyScore), cero queries a Supabase
}
```

---

### C-2. Todas las imágenes cargan sin `loading="lazy"` → 7,329 Storage Requests

**Archivos:** [`Home.tsx`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/presentation/pages/Home.tsx) · [`RestaurantDetail.tsx`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/presentation/pages/RestaurantDetail.tsx) · [`SearchBar.tsx`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/presentation/components/layout/SearchBar.tsx)

Sin `loading="lazy"`, el navegador descarga **todas** las imágenes de la lista al montar la página, aunque la
mayoría ni sean visibles. Con 30+ productos y varios restaurantes, cada visita dispara decenas de requests al
CDN de Supabase Storage.

**Solución:** Agregar `loading="lazy"` en imágenes de listas; `loading="eager"` en imágenes hero (ya visibles).

```tsx
// Imágenes en grids y listas — lazy
<img src={item.image} loading="lazy" className="w-full h-full object-cover" alt={item.name} />

// Logo principal del restaurante (primer elemento en viewport) — eager
<img src={restaurant.logo} loading="eager" className="w-full h-full object-cover" alt={restaurant.name} />
```

**Impacto esperado: reducción de 60–80% en Storage Requests.**

---

### C-3. `Home.tsx` hace una query extra a `businesses` para resolver nombres de productos

**Archivo:** [`Home.tsx`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/presentation/pages/Home.tsx) líneas 120–124

Después de cargar restaurantes (que ya incluyen `id` y `name`), hace una tercera query independiente a
`businesses` solo para construir un mapa `id → name`.

```ts
// ACTUAL — query innecesaria
const allBusinessIds = [...new Set(allProductsData.map(p => p.business_id))];
const { data: allBusinessesData } = await supabase   // ← redundante
  .from('businesses').select('id, name').in('id', allBusinessIds);
```

**Solución:** Reutilizar `restaurantsResult.data` (ya cargado).

```ts
// PROPUESTO — cero queries adicionales
const allBusinessMap = new Map(
  (restaurantsResult.data ?? []).map(b => [b.id, b.name])
);
```

---

## 🔴 ALTO IMPACTO

### A-1. `profiles` se consulta 3–5 veces en cada inicio de sesión

**Archivos:** [`AuthContext.tsx`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/context/AuthContext.tsx) · [`AddressContext.tsx`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/context/AddressContext.tsx) · [`businessService.ts`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/businessService.ts) · [`orderService.ts`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/orderService.ts)

Cada módulo resuelve `profileId` de forma independiente haciendo `SELECT id FROM profiles WHERE user_id = ?`:

```
Login (owner):
  AuthContext.fetchRole()            → SELECT id, user_role FROM profiles ← produce profileId
  AuthContext.fetchBusinessStatus()  → SELECT id FROM profiles             ← ⚠️ DUPLICADO
  AddressContext.loadAddresses()     → SELECT id FROM profiles             ← ⚠️ DUPLICADO
  Activity.tsx.fetchOrders()         → SELECT id FROM profiles             ← ⚠️ DUPLICADO
  canUserManageOrder() por UPDATE    → SELECT id FROM profiles             ← ⚠️ DUPLICADO
```

**Solución:** `AuthContext` ya expone `profileId`. Usarlo directamente en lugar de re-consultarlo.

---

### A-2. `fetchBusinessStatus` hace 2 queries secuenciales con hasta 5 reintentos cada una

**Archivo:** [`AuthContext.tsx`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/context/AuthContext.tsx) líneas 99–171

Flujo actual al login de owner: `SELECT profiles` (×5 reintentos, 8s timeout) → `SELECT businesses` (×5
reintentos, 8s timeout). **Peor caso: 80 segundos bloqueando `isAuthReady`.**

La query a `profiles` dentro de `fetchBusinessStatus` duplica exactamente la de `fetchRole`, ejecutada
milisegundos antes.

**Solución:** Recibir el `profileId` ya resuelto por `fetchRole` y eliminar la primera query.

```ts
// PROPUESTO
const fetchBusinessStatus = async (profileId: string): Promise<boolean> => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { data: business, error } = await supabase
        .from('businesses')
        .select('active')
        .eq('owner_id', profileId)   // ← recibe profileId, no userId
        .maybeSingle();
      if (!error && business) return business.active ?? false;
    } catch { /* retry */ }
    if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
  }
  return false;
};

// En applySession:
const { role: userRole, profileId: fetchedProfileId } = await fetchRole(userId);
if (userRole === 'owner' && fetchedProfileId) {
  const active = await fetchBusinessStatus(fetchedProfileId);
}
```

---

## 🟡 MEDIO IMPACTO

### M-1. `AddressContext` re-consulta `profiles` en cada login

**Archivo:** [`AddressContext.tsx`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/context/AddressContext.tsx) líneas 38–42, 79–83

**Solución:** Destrurar `profileId` de `useAuth()` y usarlo directamente.

```tsx
// ANTES
const { user } = useAuth();
const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
const userAddresses = await addressService.getAddressesByProfileId(profile.id);

// DESPUÉS
const { user, profileId } = useAuth();
if (profileId) {
  const userAddresses = await addressService.getAddressesByProfileId(profileId);
}
```

---

### M-2. `Activity.tsx` re-consulta `profiles` en cada visita a la pestaña

**Archivo:** [`Activity.tsx`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/presentation/pages/Activity.tsx) líneas 44–48

**Solución:** Igual que M-1 — usar `profileId` de `useAuth()`.

```tsx
// ANTES
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
const ordersData = await getOrdersByCustomer(profile.id, 20);

// DESPUÉS
const { profileId } = useAuth();
useEffect(() => {
  if (!profileId) return;
  getOrdersByCustomer(profileId, 20).then(setOrders).finally(() => setLoading(false));
}, [profileId]);
```

---

### M-3. `canUserManageOrder` / `canUserManageBusiness` resuelven `profileId` en cada UPDATE

**Archivos:** [`orderService.ts`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/orderService.ts) líneas 529–533 · [`businessService.ts`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/businessService.ts) líneas 457–461

Cada cambio de estado de un pedido ejecuta `SELECT id FROM profiles` antes de verificar permisos.

**Solución:** Cambiar la firma para recibir `profileId` en lugar de `userId`.

```ts
// ANTES: canUserManageOrder(userId, orderId) — 2 queries
// DESPUÉS: canUserManageOrder(profileId, orderId) — 1 query
export async function canUserManageOrder(profileId: string, orderId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('orders')
    .select('business_id, businesses!inner(owner_id)')
    .eq('id', orderId)
    .eq('businesses.owner_id', profileId)
    .single();
  return !error && !!data;
}
```

---

### M-4. `SELECT *` en servicios críticos trae columnas innecesarias

**Archivos:** [`businessService.ts`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/businessService.ts) líneas 47–49, 100–101 · [`productService.ts`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/productService.ts) líneas 39–41

**Solución:** Especificar solo las columnas requeridas.

```ts
// businessService — lista pública
.select('id, name, address, logo_url, active, is_paused, has_delivery, has_pickup, delivery_fee')

// productService — catálogo cliente
.select('id, name, price, description, image_url, active, category_id')

// RestaurantDetail — business_hours (eliminar id, created_at, updated_at)
.select('day_of_week, open_time, close_time, active')
```

---

## 🟢 BAJO IMPACTO

### B-1. `toggleBusinessStatus` hace GET + UPDATE en lugar de solo UPDATE

**Archivo:** [`businessService.ts`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/businessService.ts) líneas 273–300

Llama `getBusinessById()` solo para leer `active`, luego hace el UPDATE. **Solución:** enviar el nuevo estado desde el UI.

```ts
// PROPUESTO
export async function setBusinessStatus(businessId: string, newActive: boolean): Promise<Business> {
  const { data, error } = await supabase
    .from('businesses')
    .update({ active: newActive, updated_at: new Date().toISOString() })
    .eq('id', businessId).select().single();
  if (error) throw error;
  return data;
}
```

---

### B-2. `getBusinessStats` cuenta filas en el cliente en lugar de en el servidor

**Archivo:** [`businessService.ts`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/businessService.ts) líneas 424–426

```ts
// PROPUESTO — COUNT en servidor
const [{ count: total }, { count: active }] = await Promise.all([
  supabase.from('businesses').select('*', { count: 'exact', head: true }),
  supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('active', true),
]);
return { total: total ?? 0, active: active ?? 0, inactive: (total ?? 0) - (active ?? 0) };
```

---

### B-3. `analyticsService-fixed.ts` es dead code

Existe [`analyticsService-fixed.ts`](file:///c:/laragon/www/GENCAR/New%20folder/DelizzaFrontend/src/core/services/analyticsService-fixed.ts) (12 KB) junto con `analyticsService.ts` sin ningún import. Verificar y eliminar.

```bash
grep -r "analyticsService" src/ --include="*.ts" --include="*.tsx"
```

---

## Tabla resumen

| ID | Archivo(s) | Problema | Impacto | Riesgo |
|----|-----------|----------|---------|--------|
| **C-1** | Home · SearchBar | Queries duplicadas en cada visita | −2 DB req / visita | Muy bajo |
| **C-2** | Home · RestaurantDetail · SearchBar | Sin `loading="lazy"` | −60–80% Storage | Muy bajo |
| **C-3** | Home | Query redundante de businesses | −1 DB req / visita | Muy bajo |
| **A-1** | AuthContext · AddressContext · Services | `profiles` consultado 3–5× | −3 DB req / login | Bajo |
| **A-2** | AuthContext | fetchBusinessStatus con query duplicada | −1 DB req / login owner | Bajo |
| **M-1** | AddressContext | Re-consulta profiles en cada login | −1 DB req / login | Muy bajo |
| **M-2** | Activity | Re-consulta profiles en cada visita | −1 DB req / visita | Muy bajo |
| **M-3** | orderService · businessService | Re-consulta profiles en cada UPDATE | −1 DB req / operación | Medio |
| **M-4** | businessService · productService | SELECT * innecesario | Menos payload | Muy bajo |
| **B-1** | businessService | GET+UPDATE en toggleStatus | −1 DB req / toggle | Muy bajo |
| **B-2** | businessService | COUNT en cliente | Menos payload | Muy bajo |
| **B-3** | analyticsService-fixed | Dead code duplicado | Bundle más limpio | Muy bajo |

**Impacto combinado esperado:** ~70% reducción en Storage Requests · ~35% reducción en Database Requests.

---

## Orden de implementación sugerido

| Prioridad | Cambios | Justificación |
|-----------|---------|---------------|
| **1 — Inmediato** | C-1, C-2, C-3 | Mayor impacto, riesgo mínimo, no modifican lógica |
| **2 — Esta semana** | A-1, A-2, M-1, M-2 | Login más rápido, sin refactor de firma |
| **3 — Próximo sprint** | M-3, M-4 | Requieren cambio de firma en servicios y callsites |
| **4 — Mantenimiento** | B-1, B-2, B-3 | Limpieza y buenas prácticas |
