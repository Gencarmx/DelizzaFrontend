# Procedimiento de Pruebas: Sistema de Modo Oscuro/Claro

## 📋 Objetivo
Verificar que el sistema de temas funciona correctamente en todos los escenarios: detección de preferencias guardadas, cambio manual, persistencia y detección del sistema operativo.

---

## 🧪 Suite de Pruebas

### **PRUEBA 1: Primera Carga (Sin Preferencia Guardada)**

**Objetivo:** Verificar que la aplicación usa el tema del sistema operativo por defecto.

#### Pasos:
1. Abrir DevTools del navegador (F12)
2. Ir a la pestaña "Application" → "Local Storage"
3. Eliminar la clave `dlizza-theme` si existe
4. Recargar la página (F5)

#### Verificaciones:
```javascript
// En la consola del navegador:
localStorage.getItem('dlizza-theme')
// Resultado esperado: null (no hay preferencia guardada)

document.documentElement.classList.contains('dark')
// Resultado esperado: 
// - true si tu SO está en modo oscuro
// - false si tu SO está en modo claro
```

#### Resultado Esperado:
- ✅ La aplicación debe mostrar el tema según tu sistema operativo
- ✅ Si tu SO está en modo oscuro → App en modo oscuro
- ✅ Si tu SO está en modo claro → App en modo claro

#### Evidencia Visual:
- Fondo de la app: `gray-900` (oscuro) o `gray-50` (claro)
- Header: `gray-800` (oscuro) o `white` (claro)
- Tarjetas: `gray-800` (oscuro) o `white` (claro)

---

### **PRUEBA 2: Cambio Manual a Modo Oscuro**

**Objetivo:** Verificar que el usuario puede cambiar manualmente a modo oscuro.

#### Pasos:
1. Navegar a Settings (`/settings`)
2. Localizar el toggle "Modo oscuro"
3. Si está desactivado, hacer clic para activarlo
4. Observar el cambio visual inmediato

#### Verificaciones:
```javascript
// En la consola del navegador:
localStorage.getItem('dlizza-theme')
// Resultado esperado: "dark"

document.documentElement.classList.contains('dark')
// Resultado esperado: true

document.documentElement.className
// Resultado esperado: "dark"
```

#### Resultado Esperado:
- ✅ Toggle switch debe mostrarse en posición "activado" (derecha)
- ✅ La aplicación cambia inmediatamente a modo oscuro
- ✅ Fondo principal: `bg-gray-900` (muy oscuro)
- ✅ Header: `bg-gray-800` (oscuro)
- ✅ Tarjetas: `bg-gray-800` (oscuras)
- ✅ Texto: `text-white` o `text-gray-200/300`
- ✅ Iconos de navegación activos: color dorado (`text-amber-400`)

#### Evidencia Visual:
Tomar captura de pantalla mostrando:
- Settings page con toggle activado
- Home page con fondo oscuro
- Favorites page con tarjetas oscuras

---

### **PRUEBA 3: Persistencia del Modo Oscuro**

**Objetivo:** Verificar que la preferencia se mantiene después de recargar.

#### Pasos:
1. Con el modo oscuro activado (de la prueba anterior)
2. Recargar la página (F5)
3. Observar que la app carga directamente en modo oscuro

#### Verificaciones:
```javascript
// ANTES de recargar:
localStorage.getItem('dlizza-theme')
// Resultado: "dark"

// DESPUÉS de recargar:
localStorage.getItem('dlizza-theme')
// Resultado: "dark" (se mantiene)

document.documentElement.classList.contains('dark')
// Resultado: true (se aplica inmediatamente)
```

#### Resultado Esperado:
- ✅ La app carga directamente en modo oscuro
- ✅ NO hay "flash" de modo claro antes de cambiar
- ✅ El toggle en Settings sigue en posición "activado"
- ✅ localStorage mantiene el valor "dark"

---

### **PRUEBA 4: Cambio Manual a Modo Claro**

**Objetivo:** Verificar que el usuario puede cambiar manualmente a modo claro.

#### Pasos:
1. Con el modo oscuro activado
2. Navegar a Settings (`/settings`)
3. Hacer clic en el toggle "Modo oscuro" para desactivarlo
4. Observar el cambio visual inmediato

#### Verificaciones:
```javascript
// En la consola del navegador:
localStorage.getItem('dlizza-theme')
// Resultado esperado: "light"

document.documentElement.classList.contains('dark')
// Resultado esperado: false

document.documentElement.className
// Resultado esperado: "" (vacío, sin clase 'dark')
```

#### Resultado Esperado:
- ✅ Toggle switch debe mostrarse en posición "desactivado" (izquierda)
- ✅ La aplicación cambia inmediatamente a modo claro
- ✅ Fondo principal: `bg-gray-50` (claro)
- ✅ Header: `bg-white` (blanco)
- ✅ Tarjetas: `bg-white` (blancas)
- ✅ Texto: `text-gray-900` o `text-gray-600/500`
- ✅ Bordes: `border-gray-100/200`

#### Evidencia Visual:
Tomar captura de pantalla mostrando:
- Settings page con toggle desactivado
- Home page con fondo claro
- Favorites page con tarjetas blancas

---

### **PRUEBA 5: Persistencia del Modo Claro**

**Objetivo:** Verificar que la preferencia de modo claro se mantiene.

#### Pasos:
1. Con el modo claro activado (de la prueba anterior)
2. Recargar la página (F5)
3. Observar que la app carga directamente en modo claro

#### Verificaciones:
```javascript
// ANTES de recargar:
localStorage.getItem('dlizza-theme')
// Resultado: "light"

// DESPUÉS de recargar:
localStorage.getItem('dlizza-theme')
// Resultado: "light" (se mantiene)

document.documentElement.classList.contains('dark')
// Resultado: false (no tiene clase 'dark')
```

#### Resultado Esperado:
- ✅ La app carga directamente en modo claro
- ✅ El toggle en Settings sigue en posición "desactivado"
- ✅ localStorage mantiene el valor "light"

---

### **PRUEBA 6: Navegación Entre Páginas**

**Objetivo:** Verificar que el tema se mantiene al navegar.

#### Pasos:
1. Activar modo oscuro en Settings
2. Navegar a Home (`/`)
3. Navegar a Favorites (`/favorites`)
4. Navegar a Activity (`/activity`)
5. Navegar a Account (`/account`)
6. Volver a Settings (`/settings`)

#### Verificaciones en cada página:
```javascript
// En cada página, verificar:
document.documentElement.classList.contains('dark')
// Resultado: true (siempre)

localStorage.getItem('dlizza-theme')
// Resultado: "dark" (siempre)
```

#### Resultado Esperado:
- ✅ El tema oscuro se mantiene en TODAS las páginas
- ✅ No hay "flash" o cambio de tema al navegar
- ✅ Todas las páginas muestran el diseño oscuro consistente

---

### **PRUEBA 7: Alternancia Rápida (Toggle Múltiple)**

**Objetivo:** Verificar que el sistema maneja cambios rápidos correctamente.

#### Pasos:
1. Ir a Settings
2. Hacer clic en el toggle 5 veces seguidas rápidamente
3. Observar que cada clic cambia el tema

#### Verificaciones:
```javascript
// Después de cada clic, verificar:
localStorage.getItem('dlizza-theme')
// Debe alternar: "dark" → "light" → "dark" → "light" → "dark"

document.documentElement.classList.contains('dark')
// Debe alternar: true → false → true → false → true
```

#### Resultado Esperado:
- ✅ Cada clic cambia el tema inmediatamente
- ✅ No hay retrasos o errores
- ✅ El estado final coincide con la posición del toggle
- ✅ localStorage se actualiza correctamente en cada cambio

---

### **PRUEBA 8: Detección del Sistema Operativo (Modo System)**

**Objetivo:** Verificar que la app detecta cambios en el tema del SO.

#### Pasos:
1. Eliminar la preferencia guardada:
   ```javascript
   localStorage.removeItem('dlizza-theme')
   ```
2. Recargar la página
3. Cambiar el tema de tu sistema operativo:
   - **Windows**: Configuración → Personalización → Colores → Modo
   - **macOS**: Preferencias → General → Apariencia
   - **Linux**: Configuración del sistema → Apariencia
4. Observar si la app cambia automáticamente

#### Verificaciones:
```javascript
// Antes de cambiar el SO:
localStorage.getItem('dlizza-theme')
// Resultado: null (sin preferencia)

window.matchMedia('(prefers-color-scheme: dark)').matches
// Resultado: true o false (según tu SO)

// Después de cambiar el SO:
window.matchMedia('(prefers-color-scheme: dark)').matches
// Resultado: debe cambiar según el nuevo tema del SO

document.documentElement.classList.contains('dark')
// Resultado: debe coincidir con el tema del SO
```

#### Resultado Esperado:
- ✅ La app detecta el tema del SO al cargar
- ✅ Si cambias el tema del SO, la app se actualiza automáticamente
- ✅ Sin preferencia guardada, siempre sigue al SO

---

### **PRUEBA 9: Preferencia Manual Sobrescribe Sistema**

**Objetivo:** Verificar que la elección manual tiene prioridad sobre el SO.

#### Pasos:
1. Asegurarse de que tu SO está en modo claro
2. En la app, activar modo oscuro manualmente
3. La app debe estar en modo oscuro (ignorando el SO)
4. Cambiar el tema del SO a oscuro
5. La app debe seguir en modo oscuro (porque el usuario eligió manualmente)

#### Verificaciones:
```javascript
// Con SO en claro y app en oscuro:
localStorage.getItem('dlizza-theme')
// Resultado: "dark" (preferencia manual)

window.matchMedia('(prefers-color-scheme: dark)').matches
// Resultado: false (SO está en claro)

document.documentElement.classList.contains('dark')
// Resultado: true (app ignora SO porque hay preferencia manual)
```

#### Resultado Esperado:
- ✅ La preferencia manual tiene prioridad
- ✅ Cambios en el SO NO afectan la app si hay preferencia guardada
- ✅ Solo afecta si localStorage está vacío (modo "system")

---

### **PRUEBA 10: Consistencia Visual en Todas las Páginas**

**Objetivo:** Verificar que el diseño oscuro es uniforme en toda la app.

#### Pasos:
1. Activar modo oscuro
2. Visitar cada página y verificar colores:

#### Checklist Visual:

**Home (`/`)**
- [ ] Fondo principal: `bg-gray-900`
- [ ] Selector de dirección: `bg-gray-800`
- [ ] Banner hero: `bg-gray-800`
- [ ] Categorías: `bg-gray-800`
- [ ] Tarjetas de productos: `bg-gray-800`
- [ ] Tarjetas de restaurantes: `bg-gray-800`
- [ ] Texto principal: `text-white`
- [ ] Texto secundario: `text-gray-300/400`

**Favorites (`/favorites`)**
- [ ] Fondo principal: `bg-gray-900`
- [ ] Título: `text-white`
- [ ] Tarjetas: `bg-gray-800`
- [ ] Texto en tarjetas: `text-white`
- [ ] Bordes: `border-gray-700`

**Activity (`/activity`)**
- [ ] Fondo principal: `bg-gray-900`
- [ ] Título: `text-white`
- [ ] Tarjetas de actividad: `bg-gray-800`
- [ ] Texto: `text-white` / `text-gray-300`

**Account (`/account`)**
- [ ] Fondo principal: `bg-gray-900`
- [ ] Tarjeta de perfil: `bg-gray-800`
- [ ] Tarjetas de menú: `bg-gray-800`
- [ ] Texto: `text-white` / `text-gray-200`

**Settings (`/settings`)**
- [ ] Fondo principal: `bg-gray-900`
- [ ] Tarjetas de configuración: `bg-gray-800`
- [ ] Toggle "Modo oscuro": visible y funcional
- [ ] Texto: `text-white` / `text-gray-200`

**Header (todas las páginas)**
- [ ] Fondo: `bg-gray-800`
- [ ] Texto: `text-white`
- [ ] Iconos: visibles en blanco

**BottomNav (todas las páginas)**
- [ ] Fondo: `bg-gray-800`
- [ ] Iconos inactivos: `text-gray-400`
- [ ] Iconos activos: `text-amber-400` (dorado)

---

## 📊 Matriz de Resultados

| # | Prueba | Estado | Notas |
|---|--------|--------|-------|
| 1 | Primera carga sin preferencia | ⬜ | |
| 2 | Cambio manual a oscuro | ⬜ | |
| 3 | Persistencia modo oscuro | ⬜ | |
| 4 | Cambio manual a claro | ⬜ | |
| 5 | Persistencia modo claro | ⬜ | |
| 6 | Navegación entre páginas | ⬜ | |
| 7 | Alternancia rápida | ⬜ | |
| 8 | Detección del SO | ⬜ | |
| 9 | Preferencia manual vs SO | ⬜ | |
| 10 | Consistencia visual | ⬜ | |

**Leyenda:**
- ⬜ Pendiente
- ✅ Pasó
- ❌ Falló

---

## 🐛 Registro de Problemas Encontrados

### Problema 1:
**Descripción:**
**Pasos para reproducir:**
**Resultado esperado:**
**Resultado actual:**
**Captura de pantalla:**

### Problema 2:
**Descripción:**
**Pasos para reproducir:**
**Resultado esperado:**
**Resultado actual:**
**Captura de pantalla:**

---

## 🔍 Comandos Útiles para Debugging

### Verificar Estado Actual:
```javascript
// En la consola del navegador:

// 1. Ver preferencia guardada
localStorage.getItem('dlizza-theme')

// 2. Ver si tiene clase 'dark'
document.documentElement.classList.contains('dark')

// 3. Ver todas las clases del HTML
document.documentElement.className

// 4. Ver tema del sistema operativo
window.matchMedia('(prefers-color-scheme: dark)').matches

// 5. Forzar modo oscuro (para pruebas)
document.documentElement.classList.add('dark')

// 6. Forzar modo claro (para pruebas)
document.documentElement.classList.remove('dark')

// 7. Limpiar preferencia guardada
localStorage.removeItem('dlizza-theme')

// 8. Establecer preferencia manualmente
localStorage.setItem('dlizza-theme', 'dark')
localStorage.setItem('dlizza-theme', 'light')
localStorage.setItem('dlizza-theme', 'system')
```

### Verificar Estilos Aplicados:
```javascript
// Ver estilos computados de un elemento
const element = document.querySelector('.bg-white');
window.getComputedStyle(element).backgroundColor;

// Ver si Tailwind está aplicando dark mode
const html = document.documentElement;
console.log('Tiene clase dark:', html.classList.contains('dark'));
console.log('Clases aplicadas:', html.className);
```

---

## ✅ Criterios de Aceptación

Para que el sistema de temas se considere **APROBADO**, debe cumplir:

1. ✅ **Detección inicial**: Detecta correctamente el tema del SO en primera carga
2. ✅ **Cambio manual**: El usuario puede cambiar entre claro/oscuro desde Settings
3. ✅ **Persistencia**: La preferencia se guarda y se mantiene después de recargar
4. ✅ **Navegación**: El tema se mantiene al navegar entre páginas
5. ✅ **Consistencia**: Todas las páginas usan la misma paleta de colores
6. ✅ **Reactividad**: Los cambios se aplican inmediatamente sin recargar
7. ✅ **Prioridad**: La preferencia manual sobrescribe la del SO
8. ✅ **Sin errores**: No hay errores en consola relacionados con el tema
9. ✅ **Sin flash**: No hay "flash" de tema incorrecto al cargar
10. ✅ **Accesibilidad**: Los colores tienen suficiente contraste en ambos modos

---

## 📝 Notas Finales

- **Tiempo estimado de pruebas**: 15-20 minutos
- **Navegadores recomendados**: Chrome, Firefox, Safari, Edge
- **Dispositivos**: Desktop y móvil
- **Requisitos**: DevTools abierto para verificaciones técnicas

**Fecha de prueba:** _____________
**Probado por:** _____________
**Resultado general:** ⬜ APROBADO / ⬜ RECHAZADO
**Observaciones:**
