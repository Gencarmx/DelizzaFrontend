# Reporte de Problemas — DelizzaFrontend

**Fecha de análisis:** 13 de marzo de 2026  
**Analizado por:** Claude Code  

---

## Índice

1. [Problemas Críticos](#1-problemas-críticos)
2. [Seguridad](#2-seguridad)
3. [Fugas de Recursos y Memoria](#3-fugas-de-recursos-y-memoria)
4. [Peticiones Supabase sin Caché](#4-peticiones-supabase-sin-caché)
5. [Doble Envío (Double Submission)](#5-doble-envío-double-submission)
6. [Condiciones de Carrera](#6-condiciones-de-carrera)
7. [Bugs de UI/UX](#7-bugs-de-uiux)
8. [Resumen Ejecutivo](#8-resumen-ejecutivo)

---

## 1. Problemas Críticos

### C1 — Cobro incorrecto en pedidos de recogida (Pickup)
- **Archivo:** `src/core/context/CartContext.tsx` línea 161
- **Severidad:** CRÍTICO
- **Descripción:** `getDeliveryFee()` retorna `10` para pedidos de tipo `pickup` en lugar de `0`. El comentario en el código dice `// pickup: $0` pero el código dice `return 10`. El usuario es cobrado $10 silenciosamente en pedidos de recogida. El campo de desglose de costo en `Cart.tsx` está comentado, por lo que el usuario no puede ver este cobro.
- **Solución:** Corregir el valor a `0` para pickup o mostrar explícitamente el costo al usuario y actualizar el comentario.

---

## 2. Seguridad

### S1 — Credenciales reales expuestas en `.env`
- **Archivo:** `.env` líneas 2-3
- **Severidad:** HIGH
- **Descripción:** El archivo `.env` contiene la URL real del proyecto Supabase (`czaiyunauxgfvdmvqxsw.supabase.co`) y una clave publicable real. Aunque `.gitignore` excluye el archivo, cualquier persona con acceso al sistema de archivos (CI runners, máquinas de desarrollo compartidas, exports zip filtrados) puede leerlas.
- **Solución:**
  1. Rotar la clave anon en el panel de Supabase inmediatamente.
  2. Verificar que el archivo no esté en el historial de git: `git log --all -- .env`
  3. Agregar `.env.example` con valores de placeholder para documentar las variables necesarias.

### S2 — Rol del usuario tomado de JWT `user_metadata` como fallback
- **Archivo:** `src/core/context/AuthContext.tsx` líneas 81-86
- **Severidad:** HIGH
- **Descripción:** `fetchRole()` usa `user_metadata.user_role` como fallback cuando la query a la DB falla. `user_metadata` es establecido del lado del cliente al momento del registro y puede ser manipulado por cualquier usuario antes de que el JWT sea firmado. Si la DB está temporalmente no disponible, un usuario malicioso podría auto-promoverse a `"owner"` o `"admin"` manipulando sus metadatos al registrarse.
- **Solución:** Eliminar el fallback de `user_metadata` completamente. Si la DB no responde, fallar con seguridad retornando `"client"` o lanzando un error. El rol debe provenir únicamente de la base de datos.

### S3 — Sin verificación de autorización en mutaciones de órdenes
- **Archivo:** `src/core/services/orderService.ts` líneas 153-273
- **Severidad:** HIGH
- **Descripción:** Las funciones `updateOrderStatus`, `cancelOrder` y `markOrderAsPaid` se ejecutan directamente desde el cliente usando la clave anon sin verificar que el caller sea dueño del negocio asociado a la orden. La función `canUserManageOrder()` existe (línea 471) pero nunca es llamada desde `updateOrderStatus`.
- **Solución:** Llamar `canUserManageOrder()` (o equivalente) antes de toda operación de mutación, o mover todas las mutaciones sensibles de órdenes a un Edge Function de Supabase que valide el JWT del lado del servidor.

### S4 — Confusión de IDs en `canUserManageBusiness` (profileId vs authUserId)
- **Archivo:** `src/core/services/businessService.ts` líneas 328-334
- **Severidad:** HIGH
- **Descripción:** La query `.eq("owner_id", userId)` compara contra `owner_id` que es un UUID de `profiles.id`, pero el parámetro de la función se llama `userId` (implicando un `auth.users.id`). Si un caller pasa un auth UID, este chequeo siempre retornará `false` silenciosamente, proporcionando una falsa sensación de autorización.
- **Solución:** Renombrar el parámetro a `profileId` y auditar todos los callers para asegurar que se pasa el ID correcto.

### S5 — Riesgo de inyección en filtro `or()` de Supabase
- **Archivo:** `src/core/services/businessService.ts` línea 110
- **Severidad:** MEDIUM
- **Descripción:** El código `query.or(\`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%\`)` interpola directamente el input del usuario en la cadena del filtro PostgREST. Si `filters.search` contiene caracteres especiales (comas, paréntesis, comillas), puede romper la sintaxis del filtro `or()`, causando comportamiento inesperado o fuga de información.
- **Solución:** Sanitizar/escapar el input antes de interpolar, o usar llamadas `.ilike()` separadas y encadenadas en lugar de construir la cadena `or()` manualmente.

### S6 — `AdminDashboard` llama `signOut` directamente sin pasar por `AuthContext`
- **Archivo:** `src/presentation/pages/adminProfileUI/AdminDashboard.tsx` línea 82
- **Severidad:** MEDIUM
- **Descripción:** `handleSignOut` llama `supabase.auth.signOut()` directamente en lugar del helper `signOut()` de `AuthContext`. Esto significa que el estado de `AuthContext` (usuario, rol, etc.) no se resetea síncronamente, y cualquier efecto secundario de `AuthContext.signOut` no se dispara. Esto puede dejar la app en un estado parcialmente autenticado.
- **Solución:** Importar y usar `useAuth().signOut()` en todos los componentes.

---

## 3. Fugas de Recursos y Memoria

### R1 — `AudioContext` creado por cada pedido, nunca se cierra
- **Archivo:** `src/presentation/logic/useRealtimeNotifications.ts` líneas 288-307
- **Severidad:** HIGH
- **Descripción:** `playNotificationSound()` crea un nuevo `AudioContext` cada vez que se llama (por cada pedido entrante) y nunca lo cierra. Los navegadores tienen un límite de ~6 instancias concurrentes. Después de varios pedidos, `new AudioContext()` fallará silenciosamente y el sonido de notificación dejará de funcionar. Cada contexto filtrado también mantiene recursos de audio del OS.
- **Solución:** Crear una única instancia de `AudioContext` compartida a nivel de módulo o con un `ref` y reutilizarla. Cerrarla al desmontar el componente.

### R2 — `AudioContext` leak en notificaciones de cliente
- **Archivo:** `src/presentation/logic/useCustomerNotifications.ts` líneas 45-75
- **Severidad:** HIGH
- **Descripción:** Mismo patrón que R1. `new AudioContext()` se crea por cada evento de notificación dentro de `playNotificationSound`, nunca se cierra ni reutiliza.
- **Solución:** Misma solución que R1 — `AudioContext` compartido/memoizado.

### R3 — Canales Realtime zombies en cada pedido/cambio de estado
- **Archivos:** `src/core/services/checkoutService.ts` líneas 227-257; `src/core/services/orderService.ts` líneas 197-223
- **Severidad:** HIGH
- **Descripción:** Ambas funciones abren un nuevo canal Realtime de Supabase y solo llaman `removeChannel()` dentro del callback `SUBSCRIBED`. Si el canal nunca alcanza el estado `SUBSCRIBED` (error de red, error del servidor), el canal queda huérfano y nunca se cierra. Un usuario que realiza múltiples pedidos acumulará canales huérfanos.
- **Solución:** Agregar un timeout de ~5s que elimine el canal independientemente de su estado, o refactorizar para usar una Edge Function para las notificaciones.

### R4 — Sin cancellation guard en `loadAddresses`
- **Archivo:** `src/core/context/AddressContext.tsx` líneas 22-53
- **Severidad:** MEDIUM
- **Descripción:** `loadAddresses` es una función `async` llamada dentro de `useEffect` sin flag de cancelación. Si el usuario de la dependencia cambia (cierre de sesión) mientras la llamada async está en vuelo, `setAddresses` y `setSelectedAddress` serán llamados en un contexto obsoleto, potencialmente mostrando datos de la sesión anterior.
- **Solución:** Agregar `let cancelled = false` con el patrón de cancelación en el `useEffect` cleanup.

### R5 — `isMounted` ref declarado pero nunca verificado en `Dashboard`
- **Archivo:** `src/presentation/pages/restaurantUI/Dashboard.tsx` líneas 56-78
- **Severidad:** MEDIUM
- **Descripción:** El ref `isMounted` se establece en `false` al desmontar pero `loadDashboardData` nunca verifica `isMounted.current` antes de llamar a `setMetrics`, `setSalesData`, `setProductsData`, `setRecentOrders` o `setHasData`. Todos estos setters se dispararán incluso después del desmontaje.
- **Solución:** Verificar `if (!isMounted.current) return` antes de cada setter dentro de `loadDashboardData`.

### R6 — Reconnect timer puede escapar al cleanup en `useCustomerNotifications`
- **Archivo:** `src/presentation/logic/useCustomerNotifications.ts` líneas 212-215
- **Severidad:** MEDIUM
- **Descripción:** Cuando `setupSubscription` programa un reconect con `setTimeout`, si es llamado después de que el componente se desmontó, el nuevo `reconnectTimeoutRef.current` no será limpiado porque el cleanup ya se ejecutó. Crea un timer huérfano que disparará después del desmontaje.
- **Solución:** Agregar un flag `unmounted` al hook completo y verificarlo al inicio de `setupSubscription`.

### R7 — Toast timeout leak en `AdminDashboard`
- **Archivo:** `src/presentation/pages/adminProfileUI/AdminDashboard.tsx` línea 88
- **Severidad:** LOW
- **Descripción:** `showToast` llama `setTimeout(() => setToast(null), 3500)` pero nunca guarda el ID del timer ni lo limpia al desmontar. Si el admin navega en menos de 3.5 segundos, `setToast` será llamado en el componente desmontado.
- **Solución:** Guardar el timer en un ref y limpiarlo en `useEffect` cleanup.

### R8 — Callbacks de `FileReader` llaman setters en componentes desmontados
- **Archivos:** `src/presentation/logic/EditProfileLogic.ts`, `src/presentation/pages/restaurantUI/ProductAdd.tsx`, `src/presentation/pages/restaurantUI/ProductEdit.tsx`, `src/presentation/pages/auth/RegisterOwner.tsx`, `src/presentation/pages/settings/BusinessInfo.tsx`
- **Severidad:** LOW
- **Descripción:** En todos estos archivos, `reader.onload = (e) => { setImagePreview(...) }` disparará el callback aunque el componente haya sido desmontado mientras el `FileReader` procesaba el archivo.
- **Solución:** Agregar un flag `mounted` y verificarlo en el callback de `FileReader`.

---

## 4. Peticiones Supabase sin Caché

### DB1 — Tabla `profiles` consultada desde 7+ ubicaciones para el mismo usuario
- **Archivos:** `AuthContext.tsx`, `AddressContext.tsx`, `SavedAddresses.tsx`, `Activity.tsx`, `EditProfileLogic.ts`, `useCustomerNotifications.ts`, `checkoutService.ts`
- **Severidad:** HIGH
- **Descripción:** La fila `profiles` del usuario logueado (obtenida por `user_id`) es re-consultada desde 7+ ubicaciones distintas del código. Cada navegación, cada pedido, cada operación de dirección dispara una query separada a Supabase para los mismos datos estáticos.
- **Solución:** Guardar `profile.id` y `profile.full_name` en `AuthContext` después del primer fetch y exponerlos como `profileId` desde `useAuth()`. Todos los consumidores leen del contexto — cero queries adicionales.

### DB2 — `getActiveProductCategories()` re-consultada en cada mount desde 3 componentes
- **Archivos:** `src/presentation/pages/Home.tsx` línea 73; `src/presentation/pages/restaurantUI/ProductAdd.tsx` línea 73; `src/presentation/pages/restaurantUI/ProductEdit.tsx` línea 63
- **Severidad:** MEDIUM
- **Descripción:** Las categorías de productos son datos esencialmente estáticos que casi nunca cambian. Se re-consultan en cada montaje de 3 componentes distintos, generando queries innecesarias.
- **Solución:** Cachear el resultado en una variable de módulo o con React Query/SWR con `staleTime` largo (ej. 5 minutos).

### DB3 — `getBusinessByOwner()` llamado en layout Y en páginas hijas
- **Archivos:** `src/presentation/layouts/RestaurantLayout.tsx` línea 38; `src/presentation/pages/restaurantUI/ProductAdd.tsx` línea 65; `src/presentation/pages/restaurantUI/ProductList.tsx` línea 60
- **Severidad:** MEDIUM
- **Descripción:** `getBusinessByOwner()` realiza 2 queries a Supabase (profiles → businesses). Se ejecuta en el layout Y en cada página hija. `ProductAdd` y `ProductList` ignoran el `businessId` ya disponible en el contexto y lo re-obtienen.
- **Solución:** Eliminar las llamadas redundantes de `ProductAdd` y `ProductList`; consumir `businessId` del contexto de `RestaurantNotificationsContext` que ya está disponible.

### DB4 — Queries de `Home.tsx` ejecutadas secuencialmente en lugar de en paralelo
- **Archivo:** `src/presentation/pages/Home.tsx` líneas 68-165
- **Severidad:** MEDIUM
- **Descripción:** 3 queries independientes (categorías, productos, negocios) se ejecutan con `await` secuenciales. El tiempo de carga es la suma de las 3 latencias.
- **Solución:** Usar `Promise.all([categoriesCall, productsCall, businessesCall])`.

### DB5 — Queries del Dashboard ejecutadas secuencialmente
- **Archivo:** `src/presentation/pages/restaurantUI/Dashboard.tsx` líneas 96-161
- **Severidad:** MEDIUM
- **Descripción:** 4 queries independientes (`metrics`, `salesChart`, `topProducts`, `recentOrders`) ejecutadas en secuencia. El tiempo total es la suma de las 4 latencias.
- **Solución:** `Promise.all([getBusinessMetrics(...), getSalesChartData(...), getTopProducts(...), getRecentOrders(...)])`.

### DB6 — `getBusinessById()` consultado en cada mount de `BusinessInfo` y `Orders`
- **Archivos:** `src/presentation/pages/settings/BusinessInfo.tsx` línea 74; `src/presentation/pages/restaurantUI/Orders.tsx` línea 88
- **Severidad:** LOW
- **Descripción:** La información del negocio (nombre, dirección, teléfono) se obtiene fresca cada vez que el componente se monta. Este dato cambia muy raramente.
- **Solución:** Cachear la info del negocio en contexto o en un mapa a nivel de módulo después del primer cargado.

---

## 5. Doble Envío (Double Submission)

### D1 — `handleDuplicate` sin loading state ni guard de debounce
- **Archivo:** `src/presentation/pages/restaurantUI/ProductList.tsx` líneas 109-131
- **Severidad:** MEDIUM
- **Descripción:** `handleDuplicate` llama `createProduct()` sin estado de loading, sin estado deshabilitado en el botón "Duplicar" y sin guard optimista. Un doble clic antes de que resuelva la primera request creará dos copias del producto.
- **Solución:** Agregar un set `duplicatingId`, deshabilitar la acción mientras el ID esté en el set.

### D2 — Ventana de race en submit de `RegisterOwner`
- **Archivo:** `src/presentation/pages/auth/RegisterOwner.tsx` líneas 65-148
- **Severidad:** MEDIUM
- **Descripción:** Existe una pequeña ventana entre el click y `setLoading(true)` donde un segundo click podría disparar un segundo submit antes de que el estado de loading sea establecido.
- **Solución:** Usar `formState.isSubmitting` de react-hook-form que se establece síncronamente antes de que el handler se ejecute.

### D3 — `confirmDelete` sin loading state en modal
- **Archivo:** `src/presentation/pages/restaurantUI/ProductList.tsx` líneas 96-107
- **Severidad:** LOW
- **Descripción:** `confirmDelete` llama `deleteProduct()` sin indicador de loading y sin deshabilitar el botón de confirmación en el `ConfirmModal`. Una red lenta podría permitir múltiples clicks en "Confirmar".
- **Solución:** Agregar estado `deleting` y pasarlo como `isLoading` al `ConfirmModal`.

### D4 — `updatingOrders` usa últimos 8 chars del UUID como clave
- **Archivo:** `src/presentation/pages/restaurantUI/Orders.tsx` líneas 115, 343, 388
- **Severidad:** LOW
- **Descripción:** `updatingOrders` es un `Set<string>` con clave por `displayId` (los últimos 8 chars del UUID). Dos órdenes con los mismos últimos 8 caracteres hexadecimales (estadísticamente raro pero posible) deshabilitarían mutuamente sus botones de acción.
- **Solución:** Usar el UUID completo como clave en `updatingOrders`.

### D5 — Botón de dirección no deshabilitado durante request en vuelo
- **Archivo:** `src/presentation/pages/settings/SavedAddresses.tsx` líneas 573-579
- **Severidad:** LOW
- **Descripción:** El botón "Guardar" solo se deshabilita cuando `saving === true`, pero hay una pequeña ventana entre el primer submit y `setSaving(true)` donde un segundo click podría disparar un segundo `onSubmit`, creando direcciones duplicadas.
- **Solución:** Usar `formState.isSubmitting` de react-hook-form.

---

## 6. Condiciones de Carrera

### RC1 — Creación de orden sin transacción de base de datos
- **Archivo:** `src/core/services/checkoutService.ts` líneas 119-158
- **Severidad:** HIGH
- **Descripción:** La orden se inserta primero en la DB, luego se insertan los `order_items`. Si la red cae entre ambas operaciones, el "rollback" manual (cambiar status a `'cancelled'`) también puede fallar, dejando un pedido `pending` permanentemente vacío. El restaurante verá un pedido vacío que no puede procesar.
- **Solución:** Mover esta lógica a una Edge Function de Supabase o a un stored procedure de PostgreSQL que envuelva ambas inserciones en una transacción real.

### RC2 — `clearCart()` llamado 100ms después de `navigate()`
- **Archivo:** `src/presentation/logic/CartLogic.ts` líneas 97-104
- **Severidad:** HIGH
- **Descripción:** Después de un checkout exitoso, `navigate("/")` se llama primero, luego `clearCart()` dentro de un `setTimeout(fn, 100)`. Durante esa ventana de 100ms el carrito persiste y `useCartSync` puede guardar el carrito lleno en Supabase. El listener Realtime puede entonces disparar `setItems` nuevamente con los datos no limpiados.
- **Solución:** Llamar `clearCart()` antes de `navigate()`.

### RC3 — Race condition entre actualización local y Realtime en `useCartSync`
- **Archivo:** `src/core/hooks/useCartSync.ts` líneas 107-129
- **Severidad:** MEDIUM
- **Descripción:** Si el usuario local agrega un item dentro de los 800ms posteriores a que llegue una actualización Realtime, el cambio local puede ser sobrescrito por el propio evento Realtime generado por la guardada local.
- **Solución:** Incluir un token generado por el cliente en la fila del carrito para ignorar eventos propios del Realtime.

### RC4 — `getSession()` y `onAuthStateChange` ambos ejecutan `applySession` al inicio
- **Archivo:** `src/core/context/AuthContext.tsx` líneas 207-223
- **Severidad:** MEDIUM
- **Descripción:** `supabase.auth.getSession()` y `supabase.auth.onAuthStateChange()` ambos disparan `applySession` al montar, causando que se consulte el rol y el estado del negocio dos veces para la misma sesión.
- **Solución:** Eliminar la llamada explícita a `getSession()` y confiar únicamente en `onAuthStateChange` (que incluye el evento `INITIAL_SESSION`) como recomienda la documentación de Supabase.

### RC5 — Checkout identifica órdenes exitosas por nombre de restaurante (no por ID)
- **Archivo:** `src/presentation/logic/CartLogic.ts` líneas 116-123
- **Severidad:** MEDIUM
- **Descripción:** `orders.find(o => o.restaurant.name === r.restaurantName)` hace matching por string de nombre. Si dos restaurantes tienen el mismo nombre, solo el primero será encontrado y limpiado del carrito, dejando datos de carrito duplicados después de un checkout parcial.
- **Solución:** Retornar y usar `restaurantId` en `OrderResult` en lugar de `restaurantName`, y hacer match por ID.

---

## 7. Bugs de UI/UX

### U1 — Botón "Eliminar mi cuenta" dispara submit del formulario
- **Archivo:** `src/presentation/pages/profile/EditProfile.tsx` línea 230
- **Severidad:** HIGH
- **Descripción:** El botón "Eliminar mi cuenta" no tiene `type="button"` ni `onClick` handler. Dentro de un `<form>`, un `<button>` sin tipo explícito tiene por defecto `type="submit"`, lo que dispara el submit del formulario y guarda el perfil en lugar de eliminar la cuenta.
- **Solución:** Agregar `type="button"` e implementar o eliminar el handler apropiadamente.

### U2 — Fecha de nacimiento hardcodeada `"1990-05-15"` se guarda en todos los perfiles
- **Archivo:** `src/presentation/logic/EditProfileLogic.ts` líneas 80-81, 90-91
- **Severidad:** HIGH
- **Descripción:** La fecha de nacimiento se inicializa en `"1990-05-15"` tanto en el path de éxito como en el de error. Esta fecha falsa se muestra al usuario y se envía a la DB si guarda sin tocar el campo. Usuarios que nunca configuraron su fecha de nacimiento tendrán `1990-05-15` insertado en su perfil.
- **Solución:** Usar `""` (vacío) como default y tratar la fecha de nacimiento como opcional en el schema.

### U3 — Productos y restaurantes usan índice del array como `key` de React
- **Archivo:** `src/presentation/pages/Home.tsx` líneas 369, 424
- **Severidad:** MEDIUM
- **Descripción:** Las listas de productos y restaurantes usan el índice del array como `key`. Los filtros de categoría (que cambian `filteredProducts`) causarán reconciliación incorrecta del DOM, pudiendo reciclar componentes sin re-renderizarlos correctamente.
- **Solución:** Usar `item.id` como key (tanto productos como restaurantes tienen campos `id` únicos).

### U4 — Items de orden parseados desde string con split por coma
- **Archivo:** `src/presentation/pages/restaurantUI/Orders.tsx` líneas 473-487
- **Severidad:** MEDIUM
- **Descripción:** Los items del pedido se almacenan como un string unido por comas y luego se re-separan por `", "`. Nombres de productos que contengan una coma (ej: `"Mac & Cheese, Crispy"`) romperán el regex match, causando que los items se muestren incorrectamente.
- **Solución:** Usar el array `order_items` directamente desde Supabase en lugar del string.

### U5 — Imagen eliminada en `ProductEdit` no se actualiza en la DB
- **Archivo:** `src/presentation/pages/restaurantUI/ProductEdit.tsx` líneas 177-179
- **Severidad:** MEDIUM
- **Descripción:** Cuando el usuario elimina la imagen (`removeImage()`), `imagePreview` queda `null` e `imageUrl` también es `null`. La condición `imageUrl !== imagePreview` evalúa a `null !== null` → `false`, por lo que `image_url` nunca se incluye en el payload de actualización y la imagen antigua permanece en la DB.
- **Solución:** Siempre incluir `image_url` en el payload cuando el estado de imagen cambió respecto al valor original cargado.

### U6 — Permiso de notificaciones solicitado fuera de gesto del usuario
- **Archivo:** `src/presentation/logic/useRealtimeNotifications.ts` líneas 325-326
- **Severidad:** LOW
- **Descripción:** `Notification.requestPermission()` se llama dentro de un callback de Realtime (sin gesto del usuario). Los navegadores modernos requieren un gesto del usuario para esta llamada. La llamada será ignorada silenciosamente y el valor de retorno (Promise) se descarta.
- **Solución:** Eliminar esta llamada del callback Realtime. El permiso debe solicitarse desde una acción iniciada por el usuario (el botón en `NotificationPermissionBanner`).

---

## 8. Resumen Ejecutivo

### Tabla de todos los problemas

| ID | Archivo | Línea | Tipo | Severidad | Estado |
|----|---------|-------|------|-----------|--------|
| C1 | `CartContext.tsx` | 161 | Lógica/Facturación | **CRÍTICO** | Pendiente |
| S1 | `.env` | 2-3 | Seguridad — Credenciales | HIGH | Verificado (no está en git history; rotar clave manualmente) |
| S2 | `AuthContext.tsx` | 81-86 | Seguridad — Rol JWT | HIGH | **CORREGIDO** |
| S3 | `orderService.ts` | 153-273 | Seguridad — Sin Auth Check | HIGH | **CORREGIDO** |
| S4 | `businessService.ts` | 328-334 | Seguridad — ID Mismatch | HIGH | **CORREGIDO** |
| S5 | `businessService.ts` | 110 | Seguridad — Inyección | MEDIUM | **CORREGIDO** |
| S6 | `AdminDashboard.tsx` | 82 | Seguridad — Auth Bypass | MEDIUM | **CORREGIDO** |
| R1 | `useRealtimeNotifications.ts` | 288-307 | Memory Leak — AudioContext | HIGH | **CORREGIDO** |
| R2 | `useCustomerNotifications.ts` | 45-75 | Memory Leak — AudioContext | HIGH | **CORREGIDO** |
| R3 | `checkoutService.ts` / `orderService.ts` | 227-257 / 197-223 | Resource Leak — Canales | HIGH | **CORREGIDO** |
| R4 | `AddressContext.tsx` | 22-53 | Memory Leak — Stale State | MEDIUM | **CORREGIDO** |
| R5 | `Dashboard.tsx` | 56-78 | Memory Leak — isMounted | MEDIUM | **CORREGIDO** |
| R6 | `useCustomerNotifications.ts` | 212-215 | Memory Leak — Timer | MEDIUM | **CORREGIDO** |
| R7 | `AdminDashboard.tsx` | 88 | Memory Leak — Toast Timer | LOW | **CORREGIDO** |
| R8 | Múltiples archivos | Varios | Memory Leak — FileReader | LOW | **CORREGIDO** |
| DB1 | Múltiples archivos | Varios | Cache — Profile Re-fetch | HIGH | **CORREGIDO** |
| DB2 | `Home.tsx` / `ProductAdd.tsx` / `ProductEdit.tsx` | 73 | Cache — Categorías | MEDIUM | **CORREGIDO** |
| DB3 | `RestaurantLayout.tsx` / `ProductAdd.tsx` / `ProductList.tsx` | 38/65/60 | Cache — Business Re-fetch | MEDIUM | **CORREGIDO** |
| DB4 | `Home.tsx` | 68-165 | Performance — Queries Secuenciales | MEDIUM | **CORREGIDO** |
| DB5 | `Dashboard.tsx` | 96-161 | Performance — Queries Secuenciales | MEDIUM | **CORREGIDO** |
| DB6 | `BusinessInfo.tsx` / `Orders.tsx` | 74 / 88 | Cache — Business Info | LOW | Pendiente |
| D1 | `ProductList.tsx` | 109-131 | Double Submit — Duplicar | MEDIUM | **CORREGIDO** |
| D2 | `RegisterOwner.tsx` | 65-148 | Double Submit — Registro | MEDIUM | **CORREGIDO** |
| D3 | `ProductList.tsx` | 96-107 | Double Submit — Eliminar | LOW | **CORREGIDO** |
| D4 | `Orders.tsx` | 115, 343, 388 | Double Submit — Key Collision | LOW | **CORREGIDO** |
| D5 | `SavedAddresses.tsx` | 573-579 | Double Submit — Dirección | LOW | **CORREGIDO** |
| RC1 | `checkoutService.ts` | 119-158 | Race — Sin Transacción | HIGH | Pendiente (requiere Edge Function) |
| RC2 | `CartLogic.ts` | 97-104 | Race — Cart Clear | HIGH | **CORREGIDO** |
| RC3 | `useCartSync.ts` | 107-129 | Race — Cart Sync | MEDIUM | **CORREGIDO** |
| RC4 | `AuthContext.tsx` | 207-223 | Race — Auth Init | MEDIUM | **CORREGIDO** |
| RC5 | `CartLogic.ts` | 116-123 | Race — Nombre Restaurante | MEDIUM | **CORREGIDO** |
| U1 | `EditProfile.tsx` | 230 | UI Bug — Button Type | HIGH | **CORREGIDO** |
| U2 | `EditProfileLogic.ts` | 80-91 | Data Bug — Birthdate | HIGH | **CORREGIDO** |
| U3 | `Home.tsx` | 369, 424 | UI Bug — React Key | MEDIUM | **CORREGIDO** |
| U4 | `Orders.tsx` | 473-487 | Logic Bug — Comma Parsing | MEDIUM | **CORREGIDO** |
| U5 | `ProductEdit.tsx` | 177-179 | Logic Bug — Image Clear | MEDIUM | **CORREGIDO** |
| U6 | `useRealtimeNotifications.ts` | 325-326 | UX Bug — Notification Permission | LOW | **CORREGIDO** (en fase R1) |

### Conteo por severidad

| Severidad | Cantidad |
|-----------|----------|
| CRÍTICO | 1 |
| HIGH | 16 |
| MEDIUM | 16 |
| LOW | 11 |
| **Total** | **44** |

### Prioridad de corrección recomendada

**Fase 1 — Seguridad (inmediato):**
S1, S2, S3, S4, S5, S6

**Fase 2 — Bugs críticos de negocio:**
C1, U1, U2, RC1, RC2, R3

**Fase 3 — Fugas de memoria y recursos:**
R1, R2, R4, R5, R6, R7, R8

**Fase 4 — Performance y caché:**
DB1, DB2, DB3, DB4, DB5, DB6

**Fase 5 — Double submission y races:**
D1, D2, D3, D4, D5, RC3, RC4, RC5

**Fase 6 — Bugs de UI/UX:**
U3, U4, U5, U6
