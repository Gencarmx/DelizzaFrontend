# Errores en el Sistema de Notificaciones al Cliente

Archivos analizados:
- `src/presentation/logic/useCustomerNotifications.ts`
- `src/core/context/CustomerNotificationsContext.tsx`
- `src/presentation/pages/Activity.tsx`

---

## Bloque 1 — Dificultad Baja (Correcciones puntuales de código)

### Error 1.1 — `vibrate` no existe en el tipo `NotificationOptions` de TypeScript

**Archivo:** `src/presentation/logic/useCustomerNotifications.ts` — línea 86  
**Tipo:** Error de compilación (TypeScript)  
**Severidad:** Alta — puede bloquear el build

**Descripción:**  
La propiedad `vibrate` no está incluida en el tipo `NotificationOptions` definido por TypeScript, aunque la API de vibración sí existe en la spec de `ServiceWorkerRegistration.showNotification()`. TypeScript rechaza la propiedad y lanza un error de tipo.

**Código problemático:**
```ts
await registration.showNotification(title, {
  body,
  icon,
  tag,
  vibrate: [200, 100, 200], // ❌ No existe en NotificationOptions
  badge: "/favicon.svg",
});
```

**Corrección sugerida:**  
Extender el tipo con una intersección para incluir `vibrate`:
```ts
await registration.showNotification(title, {
  body,
  icon,
  tag,
  badge: "/favicon.svg",
} as NotificationOptions & { vibrate?: number[] });
```

---

### Error 1.2 — `permissionStatus` no se re-sincroniza al volver a la app

**Archivo:** `src/presentation/pages/Activity.tsx` — líneas 13–16  
**Tipo:** Error de lógica de estado  
**Severidad:** Baja — produce UI incorrecta

**Descripción:**  
El estado `permissionStatus` se inicializa una sola vez al montar el componente. Si el usuario cambia el permiso desde la configuración del sistema operativo mientras la app está abierta (o al volver a ella), el estado no se actualiza. En móviles es común que el usuario salga a configuración y regrese.

**Código problemático:**
```ts
const [permissionStatus, setPermissionStatus] =
  useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "default",
  );
// ❌ No hay listener para detectar cambios externos al permiso
```

**Corrección sugerida:**  
Agregar un listener de `visibilitychange` que re-sincronice el estado al volver a la app:
```ts
useEffect(() => {
  const syncPermission = () => {
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission);
    }
  };
  document.addEventListener("visibilitychange", syncPermission);
  return () => document.removeEventListener("visibilitychange", syncPermission);
}, []);
```

---

## Bloque 2 — Dificultad Media (Errores de lógica y arquitectura)

### Error 2.1 — `isSubscribedRef` se marca como `true` antes de confirmar la suscripción

**Archivo:** `src/presentation/logic/useCustomerNotifications.ts` — líneas 121, 128, 157–158  
**Tipo:** Error de lógica de control de flujo  
**Severidad:** Media — impide reintentos de suscripción tras un fallo

**Descripción:**  
El flag `isSubscribedRef.current` se establece en `true` en la línea 128, antes de que Supabase confirme la suscripción con el estado `SUBSCRIBED`. Si la suscripción falla con `CHANNEL_ERROR`, el flag se resetea a `false`, pero si `setupSubscription` se vuelve a llamar antes de que ocurra el error, la guarda de la línea 121 (`if (isSubscribedRef.current) return;`) bloqueará el reintento porque el flag ya estaba en `true`.

**Código problemático:**
```ts
if (isSubscribedRef.current) return; // línea 121

// ...

isSubscribedRef.current = true; // línea 128 — ❌ prematuro, antes de confirmar

// ...

.subscribe((status) => {
  if (status === "SUBSCRIBED") {
    console.log("🔔 Suscrito a notificaciones de cliente");
  } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
    isSubscribedRef.current = false; // se resetea tarde
  }
});
```

**Corrección sugerida:**  
Mover la asignación `isSubscribedRef.current = true` al interior del callback de `subscribe`, únicamente cuando el estado sea `SUBSCRIBED`:
```ts
.subscribe((status) => {
  if (status === "SUBSCRIBED") {
    isSubscribedRef.current = true; // ✅ solo cuando se confirma
  } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
    isSubscribedRef.current = false;
  }
});
```

---

### Error 2.2 — Dos suscripciones Realtime duplicadas para el mismo usuario

**Archivos:**  
- `src/presentation/logic/useCustomerNotifications.ts` — línea 132 (canal `customer_orders_${profile.id}`)  
- `src/presentation/pages/Activity.tsx` — línea 70 (canal `activity_orders_${profile.id}`)  
**Tipo:** Error de arquitectura / duplicación de recursos  
**Severidad:** Media — doble consumo de conexiones WebSocket, comportamiento impredecible en móviles con red inestable

**Descripción:**  
Ambos archivos crean suscripciones independientes a la tabla `orders` filtradas por `customer_id`. Aunque los nombres de canal son distintos, escuchan los mismos eventos sobre los mismos datos. En dispositivos móviles con conexión inestable, mantener dos WebSockets activos aumenta la probabilidad de que uno falle sin recuperarse.

**Canales activos simultáneamente:**
```
customer_orders_<profile.id>   → useCustomerNotifications.ts (evento UPDATE)
activity_orders_<profile.id>   → Activity.tsx (evento *)
```

**Corrección sugerida:**  
Consolidar ambas suscripciones en una sola dentro del hook `useCustomerNotifications` y exponer un callback `onOrderUpdate` que `Activity.tsx` pueda registrar para recibir actualizaciones de UI sin abrir una segunda conexión:
```ts
// En useCustomerNotifications
export function useCustomerNotifications(onOrderUpdate?: () => void) {
  // ...una sola suscripción que llama a onOrderUpdate cuando hay cambios
}
```

---

## Bloque 3 — Dificultad Alta (Limitaciones de plataforma móvil)

### Error 3.1 — `AudioContext` bloqueado sin interacción previa del usuario en iOS y Android

**Archivo:** `src/presentation/logic/useCustomerNotifications.ts` — líneas 23–43  
**Tipo:** Restricción de plataforma móvil  
**Severidad:** Alta — el sonido de notificación nunca se reproduce en móviles

**Descripción:**  
iOS Safari y Chrome para Android suspenden el `AudioContext` hasta que el usuario interactúa directamente con la página (política de autoplay). Cuando llega una notificación de Supabase Realtime, el callback es asíncrono y no está asociado a ningún gesto del usuario, por lo que el `AudioContext` permanece en estado `suspended` y el sonido no se reproduce. No hay ningún intento de llamar a `audioContext.resume()`.

**Código problemático:**
```ts
const audioContext = new (
  window.AudioContext || (window as any).webkitAudioContext
)();
// ❌ No se llama audioContext.resume() — en móviles el contexto está suspended
const oscillator = audioContext.createOscillator();
```

**Corrección sugerida:**  
Llamar a `audioContext.resume()` antes de usar el contexto, y pre-inicializar el `AudioContext` durante un evento de usuario (por ejemplo, al hacer tap en "Activar notificaciones"):
```ts
const audioContext = new (
  window.AudioContext || (window as any).webkitAudioContext
)();
if (audioContext.state === "suspended") {
  await audioContext.resume();
}
```

---

### Error 3.2 — `Notification.requestPermission()` llamado fuera de un gesto del usuario

**Archivo:** `src/presentation/logic/useCustomerNotifications.ts` — líneas 66–69  
**Tipo:** Restricción de plataforma móvil  
**Severidad:** Crítica — el permiso nunca se concede en móviles

**Descripción:**  
En `showBrowserNotification()`, si el permiso no está concedido, se intenta pedirlo llamando a `requestPermission()`. Este llamado ocurre desde un callback de Supabase Realtime, que es completamente asíncrono y no está vinculado a ningún evento de interacción del usuario. Chrome para Android y Safari iOS requieren que `Notification.requestPermission()` se invoque **directamente desde un handler de evento de usuario** (tap, click). Fuera de ese contexto, el navegador ignora la solicitud o la deniega automáticamente.

**Código problemático:**
```ts
// Este código se ejecuta desde un callback de Supabase — sin gesto del usuario
if (Notification.permission !== "granted") {
  const granted = await requestPermission(); // ❌ fallará en móviles
  if (!granted) return;
}
```

**Corrección sugerida:**  
Eliminar el intento de pedir permiso desde `showBrowserNotification()`. El permiso debe solicitarse **únicamente** desde la interacción explícita del usuario (el botón "Activar" en `Activity.tsx` ya lo hace correctamente). Si el permiso no está concedido al momento de mostrar la notificación, simplemente retornar:
```ts
if (Notification.permission !== "granted") return; // ✅ sin reintentar
```

---

### Error 3.3 — `Notification` API no disponible en iOS Safari fuera de modo PWA standalone

**Archivo:** `src/presentation/logic/useCustomerNotifications.ts` — líneas 51, 64  
**Tipo:** Restricción de plataforma móvil (iOS)  
**Severidad:** Crítica — las notificaciones no funcionan en iOS Safari estándar

**Descripción:**  
En iOS Safari, el objeto `Notification` **no existe en absoluto** a menos que la aplicación esté instalada como PWA y abierta en modo `standalone` (desde la pantalla de inicio). La verificación `if (!("Notification" in window))` detecta correctamente la ausencia, pero el flujo completo falla silenciosamente sin ningún mecanismo alternativo. Esto afecta a la mayoría de usuarios de iPhone y iPad que acceden desde el navegador directamente.

**Comportamiento por plataforma:**

| Plataforma | `Notification` disponible | Notas |
|---|---|---|
| Chrome Android | Sí | Requiere HTTPS y permiso del usuario |
| Safari iOS (navegador) | No | `Notification` no existe |
| Safari iOS (PWA standalone) | Sí (iOS 16.4+) | Solo si está instalada desde la pantalla de inicio |
| Firefox Android | Sí | Requiere permiso |

**Código problemático:**
```ts
if (!("Notification" in window)) return; // ✅ detecta correctamente
// ❌ pero no hay ningún fallback para iOS Safari
```

**Corrección sugerida:**  
Implementar un sistema de notificaciones in-app como fallback cuando `Notification` no está disponible. Por ejemplo, un banner o toast visible dentro de la interfaz que informe al usuario del cambio de estado de su pedido:
```ts
if (!("Notification" in window)) {
  showInAppNotification(order); // fallback: toast/banner in-app
  return;
}
```

---

## Resumen General

| # | Error | Archivo | Severidad | Dificultad |
|---|-------|---------|-----------|------------|
| 1.1 | `vibrate` error de TypeScript | `useCustomerNotifications.ts:86` | Alta | Baja |
| 1.2 | `permissionStatus` desincronizado | `Activity.tsx:13` | Baja | Baja |
| 2.1 | `isSubscribedRef` prematuro | `useCustomerNotifications.ts:128` | Media | Media |
| 2.2 | Dos suscripciones Realtime duplicadas | `useCustomerNotifications.ts:132` / `Activity.tsx:70` | Media | Media |
| 3.1 | `AudioContext` sin `resume()` en móviles | `useCustomerNotifications.ts:23` | Alta | Alta |
| 3.2 | `requestPermission()` sin gesto del usuario | `useCustomerNotifications.ts:67` | Crítica | Alta |
| 3.3 | `Notification` no existe en iOS Safari | `useCustomerNotifications.ts:51,64` | Crítica | Alta |
