# Plan: Botón de Reactivar Notificaciones Push

> **Fecha:** 2026-05-08  
> **Estado:** Revisado v2 — listo para implementar  
> **Target:** both (Settings + Banner flotante en RestaurantLayout)

---

## 1. Resumen Ejecutivo

Los logs de producción exponen **dos fallos distintos** que la propuesta original confundía en uno:

| Caso | Síntoma en logs | Causa raíz |
|------|-----------------|------------|
| **A** | `errors: ["All included players are not subscribed"]`, `notificationId: ""` | El `external_user_id` de OneSignal no tiene ninguna suscripción push activa vinculada. El usuario nunca otorgó permiso o su token expiró. |
| **B** | `errors: null`, `notificationId: "xxx..."`, `recipients: 0` | OneSignal acepta la petición (asigna ID) pero ningún dispositivo registrado tiene un token push válido. La suscripción existe en su sistema pero está huérfana. Ver §8. |

La propuesta original solucionaba parcialmente el **Caso A**, ignoraba el **Caso B**, y tenía cuatro errores de implementación que la habrían dejado inefectiva. Este documento corrige ambos.

---

## 2. Causa raíz técnica en el código actual

### 2.1 La guardia `lastLinkedUserId` puede dejar usuarios sin vincular

```typescript
// oneSignalService.ts:122
if (userId === lastLinkedUserId) return; // ← bloquea re-linking si el userId no cambió
```

Si `OneSignal.login()` se ejecutó correctamente pero el usuario no tenía permiso de notificaciones en ese momento (o lo tenía pero el token expiró), `lastLinkedUserId` queda fijado. Toda llamada posterior a `setOneSignalUser()` es ignorada aunque la suscripción siga rota.

### 2.2 `requestPermission()` en el contexto no re-vincula al usuario

```typescript
// OneSignalContext.tsx:99-100 (código actual)
if (granted) {
  setIsSubscribed(isOneSignalSubscribed()); // lee estado SDK inmediatamente tras grant
}
```

Cuando el usuario acepta el permiso, `isOneSignalSubscribed()` se llama de forma síncrona, pero OneSignal establece la suscripción de forma asíncrona internamente. El valor leído en ese punto es el estado anterior (falso), no el nuevo. Además, no se re-llama a `OneSignal.login()` — la vinculación de identidad queda pendiente del próximo `TOKEN_REFRESHED`.

### 2.3 `setOneSignalUser()` en AuthContext es fire-and-forget

```typescript
// AuthContext.tsx:169
setOneSignalUser(currentSession.user.id).catch(console.error); // sin await
```

Si `initOneSignal()` tarda más que el primer `onAuthStateChange` (INITIAL_SESSION), el `whenReady()` awaita correctamente. Pero si el dominio no está registrado en OneSignal (`init` rechaza), `whenReady()` devuelve `false` silenciosamente y el usuario nunca queda vinculado en esa sesión.

---

## 3. Arquitectura de la solución

### 3.1 Los tres escenarios a cubrir

```
ESCENARIO A — Permiso nunca otorgado (Notification.permission === "default")
┌──────────────────────────────────────────────────────────┐
│  Botón/Banner visible → click                            │
│  → requestOneSignalPermission()  [muestra prompt nativo] │
│  → permiso concedido                                     │
│  → forceRelinkOneSignalUser(userId)  [nuevo]             │
│  → esperar settle (500 ms)                               │
│  → verificar isOneSignalSubscribed()  [fuente: SDK, no   │
│    estado React]                                         │
│  → Toast éxito / error                                   │
└──────────────────────────────────────────────────────────┘

ESCENARIO B — Permiso concedido pero opted-out manualmente
┌──────────────────────────────────────────────────────────┐
│  Settings.tsx ya muestra botón "Activar" (optIn)         │
│  → optInOneSignal()  [ya existe]                         │
│  → forceRelinkOneSignalUser(userId)  [AÑADIR]            │
│  → esperar settle (500 ms)                               │
│  → actualizar estado                                     │
└──────────────────────────────────────────────────────────┘

ESCENARIO C — Permiso bloqueado (Notification.permission === "denied")
┌──────────────────────────────────────────────────────────┐
│  NO mostrar botón de activación                          │
│  Mostrar instrucciones de navegador                      │
│  (ya cubierto en NotificationPermissionBanner.tsx y      │
│   Notifications.tsx — no requiere cambios)               │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Nueva función: `forceRelinkOneSignalUser()`

Esta es la pieza central que faltaba. Se agrega a `oneSignalService.ts`.

### Archivo
`src/core/services/oneSignalService.ts`

### Por qué es necesaria

`setOneSignalUser()` tiene la guardia `if (userId === lastLinkedUserId) return`. Para forzar un re-linking explícito (desde el botón o tras conceder permiso) se necesita una función que omita esa guardia, re-ejecute `OneSignal.login()` y espere a que la suscripción se establezca.

### Implementación

```typescript
/**
 * Fuerza una re-vinculación del userId con OneSignal, omitiendo la guardia
 * de deduplicación de setOneSignalUser(). Usar únicamente desde acciones
 * explícitas del usuario (botón "Activar notificaciones").
 *
 * Retorna true si tras el login el usuario quedó suscrito (optedIn === true).
 */
export async function forceRelinkOneSignalUser(userId: string): Promise<boolean> {
  if (!(await whenReady())) return false;

  // Resetear la guardia para que login() se ejecute aunque el userId no cambiara
  lastLinkedUserId = null;

  try {
    await OneSignal.login(userId);
    console.info(
      "[OneSignal] forceRelink completado | optedIn:",
      OneSignal.User.PushSubscription.optedIn
    );
    lastLinkedUserId = userId;
  } catch (error) {
    console.error("[OneSignal] forceRelink login error:", error);
    return false;
  }

  // Si el permiso está concedido pero el usuario no está opted-in,
  // intentar optIn explícito (Caso B: subscription huérfana)
  if (
    Notification.permission === "granted" &&
    !OneSignal.User.PushSubscription.optedIn
  ) {
    try {
      await OneSignal.User.PushSubscription.optIn();
      console.info("[OneSignal] optIn forzado tras relink");
    } catch (error) {
      console.error("[OneSignal] optIn error:", error);
    }
  }

  // Esperar a que el SDK registre el estado internamente antes de leer
  await new Promise((r) => setTimeout(r, 500));

  const subscribed = OneSignal.User?.PushSubscription?.optedIn ?? false;
  console.info("[OneSignal] estado final tras forceRelink | optedIn:", subscribed);
  return subscribed;
}
```

---

## 5. Fix en `OneSignalContext`: `requestPermission` con re-linking

El `requestPermission` del contexto actual no re-vincula al usuario tras conceder permiso. Esto deja al usuario en estado "permiso granted, SDK no asociado al userId".

### Archivo
`src/core/context/OneSignalContext.tsx`

### Cambio

```typescript
// Agregar import:
import {
  // ...existentes...
  forceRelinkOneSignalUser,  // ← nuevo
} from "@core/services/oneSignalService";

// Agregar userId como dependencia del provider:
// OneSignalProvider recibe userId del AuthContext o lo lee de Supabase session
// Opción más simple: importar desde supabase directamente dentro del callback

const requestPermission = useCallback(async (): Promise<boolean> => {
  if (!isSupported) return false;
  setIsLoading(true);
  try {
    // Verificar si el permiso ya está denegado antes de llamar al SDK
    if (Notification.permission === "denied") {
      return false;
    }

    const granted = await requestOneSignalPermission();
    setStatus(granted ? "granted" : "denied");

    if (granted) {
      // Obtener userId de la sesión activa para forzar vinculación
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const subscribed = await forceRelinkOneSignalUser(session.user.id);
        setIsSubscribed(subscribed);
      } else {
        // Sin sesión activa, leer estado del SDK directamente
        await new Promise((r) => setTimeout(r, 500));
        setIsSubscribed(isOneSignalSubscribed());
      }
    }

    return granted;
  } finally {
    setIsLoading(false);
  }
}, [isSupported]);
```

### Fix también en `optIn`

```typescript
const optIn = useCallback(async (): Promise<void> => {
  if (!isSupported) return;
  setIsLoading(true);
  try {
    await optInOneSignal();
    // Forzar re-linking para cubrir el Caso B (token huérfano)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const subscribed = await forceRelinkOneSignalUser(session.user.id);
      setIsSubscribed(subscribed);
    } else {
      setIsSubscribed(isOneSignalSubscribed());
    }
  } finally {
    setIsLoading(false);
  }
}, [isSupported]);
```

> **Nota sobre imports**: `supabase` ya está disponible en el proyecto vía `@core/supabase/client`.
> Agregar al import existente en el contexto.

---

## 6. Componente `EnableNotificationsButton`

### Contexto importante

Ya existe `NotificationPermissionBanner.tsx` que cubre el caso de primer otorgamiento de permisos. El nuevo componente se enfoca en **re-activación explícita** desde Settings y como banner flotante para restaurantes.

### Archivo
`src/presentation/components/common/EnableNotificationsButton.tsx`

### Implementación corregida

```typescript
import { useState } from "react";
import clsx from "clsx"; // ← import explícito (faltaba en v1)
import { Bell, CheckCircle, Loader2 } from "lucide-react";
import { useOneSignal } from "@core/hooks/useOneSignal";
import { useAuth } from "@core/context/AuthContext";
import { forceRelinkOneSignalUser } from "@core/services/oneSignalService";
import { toast } from "react-hot-toast";

export interface EnableNotificationsButtonProps {
  variant?: "button" | "banner";
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onDismiss?: () => void;
}

export function EnableNotificationsButton({
  variant = "button",
  className = "",
  onSuccess,
  onError,
  onDismiss,
}: EnableNotificationsButtonProps) {
  const { status, isSubscribed, requestPermission, optIn } = useOneSignal();
  const { user } = useAuth();
  const [isActivating, setIsActivating] = useState(false);

  const handleEnable = async () => {
    if (!user) {
      toast.error("Inicia sesión para activar notificaciones");
      return;
    }

    // Caso C: permiso bloqueado por el navegador — no hay nada que hacer desde la app
    if (status === "denied") {
      toast.error("Notificaciones bloqueadas. Ve a Configuración del navegador para reactivarlas.");
      return;
    }

    setIsActivating(true);
    try {
      let finallySubscribed = false;

      if (status === "granted") {
        // Caso B: permiso ya concedido pero opted-out o suscripción huérfana
        // optIn() del contexto ya incluye el forceRelink tras el fix del §5
        await optIn();
        // Forzar re-linking explícito como respaldo (acción del usuario)
        finallySubscribed = await forceRelinkOneSignalUser(user.id);
      } else {
        // Caso A: permiso no concedido — mostrar prompt nativo
        // requestPermission() del contexto ya incluye el forceRelink tras el fix del §5
        const granted = await requestPermission();
        if (!granted) {
          const msg =
            Notification.permission === "denied"
              ? "Activa las notificaciones en la configuración del navegador"
              : "Necesitas aceptar las notificaciones para continuar";
          onError?.(msg);
          toast.error(msg);
          return;
        }
        // requestPermission ya llamó a forceRelinkOneSignalUser internamente;
        // verificamos el estado actualizado leyendo del SDK directamente
        finallySubscribed = OneSignal.User?.PushSubscription?.optedIn ?? false;
      }

      if (!finallySubscribed) {
        onError?.("No se pudo activar la suscripción");
        toast.error("No se pudo activar. Intenta de nuevo.");
        return;
      }

      onSuccess?.();
      toast.success("Notificaciones activadas");
    } catch (error) {
      console.error("[EnableNotifications] Error:", error);
      onError?.("Error desconocido");
      toast.error("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setIsActivating(false);
    }
  };

  if (variant === "banner") {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Activa notificaciones
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No te pierdas los pedidos entrantes
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleEnable}
              disabled={isActivating || isSubscribed}
              className="px-3 py-1.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 rounded-md transition-colors"
            >
              {isSubscribed ? (
                <CheckCircle className="w-4 h-4" />
              ) : isActivating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Activar"
              )}
            </button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleEnable}
      disabled={isActivating || isSubscribed}
      className={clsx(
        "flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors",
        isSubscribed
          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          : "bg-amber-500 text-white hover:bg-amber-600",
        isActivating && "opacity-50 cursor-wait",
        className
      )}
    >
      {isSubscribed ? (
        <>
          <CheckCircle className="w-5 h-5" />
          <span>Notificaciones activas</span>
        </>
      ) : isActivating ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Activando...</span>
        </>
      ) : (
        <>
          <Bell className="w-5 h-5" />
          <span>Activar notificaciones</span>
        </>
      )}
    </button>
  );
}
```

> **Nota**: El componente importa `OneSignal` directamente para leer `PushSubscription.optedIn`
> de forma síncrona y fresca (no estado React). Agregar `import OneSignal from "react-onesignal"`.

---

## 7. Integración en Settings

La página `Notifications.tsx` **ya cubre todos los estados visualmente** (denied, granted+subscribed, granted+!subscribed, default). El único cambio necesario es que el botón "Activar" del estado `granted && !isSubscribed` pase por `forceRelinkOneSignalUser()`, lo cual queda resuelto por el fix en `OneSignalContext.optIn` (§5).

No se requieren cambios en `Notifications.tsx`.

---

## 8. Integración como Banner en RestaurantLayout

### Archivo
`src/presentation/layouts/RestaurantLayout.tsx` (o el layout que envuelva la UI del restaurante)

### Lógica con dismiss persistente

```typescript
import { useState, useEffect } from "react";
import { EnableNotificationsButton } from "@presentation/components/common/EnableNotificationsButton";
import { useOneSignal } from "@core/hooks/useOneSignal";
import { useAuth } from "@core/context/AuthContext";

const DISMISS_KEY = "notifications-banner-dismissed-v1";

export default function RestaurantLayout() {
  const { isSubscribed, status } = useOneSignal();
  const { role } = useAuth();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Solo mostrar a owners no suscritos, y solo si el permiso no está bloqueado
    if (role !== "owner") return;
    if (isSubscribed) return;
    if (status === "denied" || status === "unsupported") return;
    if (localStorage.getItem(DISMISS_KEY) === "true") return;

    const timer = setTimeout(() => setShowBanner(true), 3000);
    return () => clearTimeout(timer);
  }, [isSubscribed, status, role]);

  // Si se suscribe correctamente, ocultar el banner
  useEffect(() => {
    if (isSubscribed) setShowBanner(false);
  }, [isSubscribed]);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, "true");
  };

  return (
    <Layout>
      {/* ...resto del layout */}
      {showBanner && (
        <EnableNotificationsButton
          variant="banner"
          onSuccess={() => setShowBanner(false)}
          onDismiss={handleDismiss}
        />
      )}
    </Layout>
  );
}
```

> **Por qué `DISMISS_KEY` tiene versión (`-v1`)**: si en el futuro se resetea el dismiss
> (por ejemplo, tras muchos días), se puede cambiar la clave sin afectar la lógica actual.

---

## 9. Investigación: `recipients: 0` con `errors: null` y `notificationId` asignado

### 9.1 Descripción del fenómeno

En los logs se observan envíos donde OneSignal **acepta la petición** (asigna `notificationId`) pero no la entrega a ningún dispositivo (`recipients: 0`), sin reportar error. Ejemplos del log del 2026-05-08:

```json
{ "targetUserId": "cbe8c26f-...", "notificationId": "7a225152-...", "recipients": 0, "errors": null }
{ "targetUserId": "93447d0c-...", "notificationId": "004a813b-...", "recipients": 0, "errors": null }
{ "targetUserId": "92085076-...", "notificationId": "f6bac5b4-...", "recipients": 0, "errors": null }
```

Esto es diferente al error "All included players are not subscribed" (Caso A), donde OneSignal ni siquiera encuentra al usuario en su sistema.

### 9.2 Hipótesis de causas

| # | Hipótesis | Probabilidad | Cómo verificar |
|---|-----------|:---:|----------------|
| H1 | El usuario tiene `external_user_id` en OneSignal pero el token push expiró (FCM/APNS lo invalidó) y OneSignal no lo ha purgado aún | Alta | Dashboard OneSignal → Users → buscar por `external_user_id` → ver `Last Active` y estado del subscription |
| H2 | El usuario limpió el storage del navegador (borró caché/cookies), invalidando el Service Worker y el push token. OneSignal aún guarda el registro del dispositivo pero ya no es alcanzable | Alta | Comparar fecha de `Last Active` en OneSignal con la fecha del pedido |
| H3 | La función Supabase envía a `external_user_id` pero OneSignal tiene registrado al usuario bajo un `player_id` diferente (conflicto de identidad por uso de múltiples dispositivos o sesiones) | Media | Dashboard → Users → ver cuántos `subscriptions` tiene el `external_user_id` |
| H4 | El servicio de push del navegador (FCM) entregó silenciosamente el push pero el Service Worker lo procesó sin mostrar notificación (bug en el SW) | Baja | Ver si el `OneSignalSDKWorker.ts` tiene manejo explícito del evento `push` |

### 9.3 Plan de investigación (pasos ordenados)

**Paso 1 — Verificar en Dashboard de OneSignal** (sin código, inmediato)

Para cada `targetUserId` que muestre `recipients: 0, errors: null`, buscar en:
`OneSignal Dashboard → Audience → Users → Filter by External User ID`

Verificar:
- ¿Cuántas suscripciones (subscriptions) tiene registradas?
- ¿Cuál es su `Last Active` date?
- ¿El estado de cada suscripción es `Active`, `Inactive`, o `Unsubscribed`?

**Paso 2 — Agregar log diagnóstico en la Edge Function**

Modificar la función `onesignal-notify` de Supabase para registrar la respuesta completa de OneSignal, no solo los campos actuales:

```typescript
// En onesignal-notify (Edge Function de Supabase)
const response = await fetch("https://onesignal.com/api/v1/notifications", {
  method: "POST",
  // ...
});

const result = await response.json();

// Log extendido para diagnóstico — incluir campo `errors` y estructura completa
console.log("[onesignal-notify] Respuesta completa:", JSON.stringify({
  targetUserId,
  appId: ONESIGNAL_APP_ID,
  title: body.title,
  notificationId: result.id ?? "",
  recipients: result.recipients ?? 0,
  errors: result.errors ?? null,
  // NUEVO: campos adicionales para diagnóstico del Caso B
  external_id: result.external_id ?? null,
  converted: result.converted ?? 0,
  remaining: result.remaining ?? 0,
}));
```

Los campos `converted` y `remaining` de la respuesta de OneSignal pueden indicar si la notificación quedó en cola o fue descartada.

**Paso 3 — Verificar estado del token en el cliente**

Agregar un log temporal en `setOneSignalUser()` que incluya el token push actual:

```typescript
// oneSignalService.ts — diagnóstico temporal (remover después de investigar)
export async function setOneSignalUser(userId: string): Promise<void> {
  if (!(await whenReady())) return;
  if (userId === lastLinkedUserId) return;
  await OneSignal.login(userId);

  const token = OneSignal.User.PushSubscription.token;
  const optedIn = OneSignal.User.PushSubscription.optedIn;
  console.info("[OneSignal] login OK | optedIn:", optedIn, "| token presente:", !!token);
  // Si token es null pero optedIn es true → suscripción fantasma (confirma H2)

  lastLinkedUserId = userId;
  // ...resto igual
}
```

**Paso 4 — Verificar el Service Worker**

Leer `OneSignalSDKWorker.ts` y confirmar que el evento `push` se maneja correctamente y no está siendo absorbido silenciosamente:

```typescript
// Verificar que OneSignalSDKWorker.ts no tenga un listener `push` propio
// que consuma el evento antes de que OneSignal lo procese
self.addEventListener("push", (event) => {
  // Si esto existe y no llama a los handlers de OneSignal, es la causa
});
```

**Paso 5 — Correlacionar con `forceRelinkOneSignalUser()`**

Una vez implementado el §4, monitorear si los `targetUserId` que antes mostraban `recipients: 0` comienzan a mostrar `recipients > 0` después de que el usuario activa el botón de re-vinculación. Esto confirmaría que la causa era un token expirado (H2) que se renueva al hacer `optIn()` explícito.

### 9.4 Acción correctiva esperada

Si la investigación confirma H1 o H2, la solución definitiva es implementar un **mecanismo de detección proactiva de tokens expirados**: cuando `optedIn === true` pero `token === null`, llamar automáticamente a `optIn()` sin intervención del usuario. Esto se puede hacer en el `useEffect` de `OneSignalContext` tras el `waitForOneSignal()`:

```typescript
// OneSignalContext.tsx — a implementar tras confirmar H1/H2
waitForOneSignal().then((ready) => {
  if (!mounted.current || !ready) return;
  setStatus(getNotificationPermission() as NotificationStatus);
  const subscribed = isOneSignalSubscribed();
  setIsSubscribed(subscribed);

  // Detección proactiva de token expirado (post-investigación)
  const token = OneSignal.User?.PushSubscription?.token;
  if (subscribed && !token) {
    console.warn("[OneSignal] optedIn=true pero token=null — token posiblemente expirado");
    // Forzar re-link automático si hay sesión activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        forceRelinkOneSignalUser(session.user.id).catch(console.error);
      }
    });
  }
});
```

> **Esta última parte no se implementa ahora**: esperar resultados de la investigación del §9.3
> para confirmar la causa antes de agregar lógica de recuperación automática.

---

## 10. Archivos a modificar

| # | Archivo | Acción | Sección |
|---|---------|--------|---------|
| 1 | `src/core/services/oneSignalService.ts` | Agregar `forceRelinkOneSignalUser()` y log de token en `setOneSignalUser()` | §4, §9.3 |
| 2 | `src/core/context/OneSignalContext.tsx` | Corregir `requestPermission` y `optIn` con re-linking + check denied | §5 |
| 3 | `src/presentation/components/common/EnableNotificationsButton.tsx` | **CREAR** | §6 |
| 4 | `src/presentation/layouts/RestaurantLayout.tsx` | Integrar banner con dismiss persistente | §8 |
| 5 | Edge Function `onesignal-notify` (Supabase) | Ampliar log de respuesta para diagnóstico | §9.3 |

`src/presentation/pages/settings/Notifications.tsx` → **Sin cambios** (el fix en el contexto lo cubre).

---

## 11. Prioridad de implementación

| # | Task | Prioridad | Motivo |
|---|------|:---------:|--------|
| 1 | `forceRelinkOneSignalUser()` en `oneSignalService.ts` | **Crítica** | Base de todos los demás fixes |
| 2 | Fix `requestPermission` y `optIn` en `OneSignalContext` | **Crítica** | Resuelve el race condition y el re-linking ausente |
| 3 | Log diagnóstico en Edge Function `onesignal-notify` | **Alta** | Desbloquea la investigación del Caso B sin código cliente |
| 4 | Log de token en `setOneSignalUser()` | **Alta** | Confirma o descarta H1/H2 en consola del navegador |
| 5 | Crear `EnableNotificationsButton` | **Media** | UX de recuperación para usuarios afectados |
| 6 | Integrar banner en `RestaurantLayout` | **Media** | Especialmente relevante para restaurantes (pedidos perdidos) |
| 7 | Investigar Dashboard OneSignal (§9.3 Paso 1) | **Alta** | Sin código — puede hacerse en paralelo con todo lo anterior |

---

## 12. Testing

### Escenario A — Permiso nunca otorgado
- [ ] Click en botón muestra prompt nativo del navegador
- [ ] Aceptar → `forceRelinkOneSignalUser()` se ejecuta → log "[OneSignal] forceRelink completado | optedIn: true"
- [ ] Toast "Notificaciones activadas"
- [ ] Recargar página → `isSubscribed` persiste en `true` (localStorage + SDK)

### Escenario B — Permiso concedido, opted-out
- [ ] Botón "Desactivar" en Settings → `optOut()` → `isSubscribed: false`
- [ ] Botón "Activar" → `optIn()` + `forceRelinkOneSignalUser()` → `isSubscribed: true`
- [ ] No aparece prompt del navegador (permiso ya concedido)

### Escenario C — Permiso bloqueado
- [ ] Con `Notification.permission === "denied"`, click en botón → toast con instrucciones de navegador (NO crash, NO prompt)
- [ ] Banner en RestaurantLayout NO aparece cuando `status === "denied"`

### Banner
- [ ] Aparece 3 segundos después de cargar si `role === "owner"` y no está suscrito
- [ ] Al hacer click en `×` se oculta y no vuelve a aparecer (localStorage)
- [ ] Al activar con éxito, desaparece automáticamente
- [ ] NO aparece si ya está suscrito

### Diagnóstico Caso B
- [ ] Abrir consola tras login: verificar "[OneSignal] login OK | token presente: true/false"
- [ ] Si `token presente: false` con `optedIn: true` → confirma H2 → documentar
