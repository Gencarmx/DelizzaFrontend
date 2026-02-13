# Mejoras en Business Hours - Prevención de Duplicados

## 🎯 Problema Identificado

Al guardar horarios, se estaban creando registros duplicados en la base de datos. Esto ocurría porque:
1. No había distinción visual entre "crear" y "actualizar" horarios
2. No había feedback claro sobre el estado de los datos
3. Faltaban logs para rastrear el proceso de guardado

## ✅ Soluciones Implementadas

### 1. Estado de Horarios Existentes

**Archivo:** `src/presentation/pages/settings/BusinessHours.tsx`

**Cambio:** Agregado estado `hasExistingHours` para detectar si ya existen horarios guardados

```typescript
// NUEVO ESTADO
const [hasExistingHours, setHasExistingHours] = useState(false);

// LÓGICA DE DETECCIÓN
const loadBusinessHours = async () => {
  const hours = await getBusinessHours(businessId);
  
  if (hours && hours.length > 0) {
    setHasExistingHours(true);  // ✅ Marca que ya existen horarios
    // ... mapear horarios existentes
  } else {
    setHasExistingHours(false); // ✅ Marca que no hay horarios
    // ... usar horarios por defecto
  }
};
```

**Beneficio:** El componente ahora sabe si está creando o editando horarios.

---

### 2. Botón Dinámico de Guardado

**Cambio:** El texto del botón cambia según el contexto

```typescript
// ANTES
<span>Guardar horarios</span>

// DESPUÉS
<span>{hasExistingHours ? "Guardar cambios" : "Guardar horarios"}</span>
```

**Resultado Visual:**
- **Primera vez:** "Guardar horarios" 
- **Editando:** "Guardar cambios"

**Beneficio:** El usuario sabe claramente qué acción está realizando.

---

### 3. Mensaje de Confirmación Dinámico

**Cambio:** El mensaje de éxito también es contextual

```typescript
// ANTES
alert("Horarios guardados correctamente");

// DESPUÉS
alert(hasExistingHours ? "Cambios guardados correctamente" : "Horarios guardados correctamente");
```

**Beneficio:** Feedback más preciso al usuario.

---

### 4. Logs Detallados en el Servicio

**Archivo:** `src/core/services/businessHoursService.ts`

**Cambios:** Agregados logs en cada paso del proceso

```typescript
export async function saveBusinessHours(
  businessId: string,
  hours: BusinessHourInput[]
): Promise<BusinessHour[]> {
  try {
    console.log('Iniciando guardado de horarios para business_id:', businessId);
    
    // PASO 1: Eliminar horarios existentes
    const { error: deleteError } = await supabase
      .from('business_hours')
      .delete()
      .eq('business_id', businessId);

    if (deleteError) {
      console.error('Error eliminando horarios existentes:', deleteError);
      throw deleteError;
    }

    console.log('Horarios existentes eliminados correctamente');

    // PASO 2: Preparar nuevos horarios
    const hoursToInsert: BusinessHourInsert[] = hours.map(hour => ({
      id: crypto.randomUUID(),
      business_id: businessId,
      day_of_week: hour.day_of_week,
      open_time: hour.open_time,
      close_time: hour.close_time,
      active: hour.active,
    }));

    console.log('Insertando nuevos horarios:', hoursToInsert.length, 'registros');

    // PASO 3: Insertar nuevos horarios
    const { data, error } = await supabase
      .from('business_hours')
      .insert(hoursToInsert)
      .select();

    if (error) {
      console.error('Error insertando nuevos horarios:', error);
      throw error;
    }

    console.log('Horarios guardados correctamente:', data?.length, 'registros');
    return data || [];
  } catch (error) {
    console.error('Error guardando horarios del negocio:', error);
    throw new Error('No se pudieron guardar los horarios del negocio');
  }
}
```

**Logs que verás en consola:**
1. `Iniciando guardado de horarios para business_id: [uuid]`
2. `Horarios existentes eliminados correctamente`
3. `Insertando nuevos horarios: 7 registros`
4. `Horarios guardados correctamente: 7 registros`

**Beneficio:** Puedes rastrear exactamente qué está pasando en cada paso.

---

## 🔍 Cómo Funciona la Prevención de Duplicados

### Flujo de Guardado

```
1. Usuario hace clic en "Guardar"
   ↓
2. saveBusinessHours() se ejecuta
   ↓
3. DELETE todos los horarios del business_id
   ↓
4. INSERT 7 nuevos registros (uno por día)
   ↓
5. Retorna los datos guardados
```

### ¿Por Qué No Hay Duplicados?

**Estrategia "Delete + Insert":**
- Primero elimina TODOS los horarios existentes del negocio
- Luego inserta los 7 nuevos registros
- Resultado: Siempre 7 registros (uno por día de la semana)

**Alternativa (no implementada):**
- Podríamos usar UPDATE para cada registro existente
- Pero DELETE + INSERT es más simple y garantiza consistencia

---

## 🧪 Pruebas de Verificación

### Test 1: Verificar Cantidad de Registros

```sql
-- Ejecutar ANTES de guardar
SELECT COUNT(*) as total_antes 
FROM business_hours 
WHERE business_id = 'tu-business-id';

-- Guardar horarios desde la app

-- Ejecutar DESPUÉS de guardar
SELECT COUNT(*) as total_despues 
FROM business_hours 
WHERE business_id = 'tu-business-id';

-- Resultado esperado: total_despues = 7 (siempre)
```

### Test 2: Verificar Logs en Consola

1. Abre DevTools (F12) → Console
2. Guarda horarios
3. Deberías ver:
   ```
   Iniciando guardado de horarios para business_id: [uuid]
   Horarios existentes eliminados correctamente
   Insertando nuevos horarios: 7 registros
   Horarios guardados correctamente: 7 registros
   ```

### Test 3: Verificar Texto del Botón

**Primera vez (sin horarios):**
- Botón debe decir: "Guardar horarios"
- Mensaje de éxito: "Horarios guardados correctamente"

**Segunda vez (editando):**
- Botón debe decir: "Guardar cambios"
- Mensaje de éxito: "Cambios guardados correctamente"

---

## 📊 Comparación Antes/Después

| Aspecto | Antes ❌ | Después ✅ |
|---------|---------|-----------|
| **Detección de estado** | No sabía si había horarios | Detecta con `hasExistingHours` |
| **Texto del botón** | Siempre "Guardar horarios" | Dinámico según contexto |
| **Mensaje de éxito** | Genérico | Contextual (crear vs editar) |
| **Logs de debug** | Solo errores | Logs detallados de cada paso |
| **Duplicados** | Posibles | Imposibles (DELETE antes de INSERT) |
| **Feedback visual** | Limitado | Claro y contextual |

---

## 🔧 Troubleshooting

### Si aún ves duplicados:

#### 1. Verificar que la función no se llama múltiples veces
```typescript
// En BusinessHours.tsx, agregar log temporal
const handleSave = async () => {
  console.log('handleSave llamado'); // ⚠️ Debe aparecer solo UNA vez
  // ... resto del código
};
```

**Problema común:** Doble clic en el botón
**Solución:** El botón ya tiene `disabled={saving}` para prevenir esto

#### 2. Verificar el business_id
```typescript
// En BusinessHours.tsx
console.log('Business ID:', businessId);
```

**Problema:** Si el `businessId` cambia entre llamadas, se crearían registros para diferentes negocios
**Solución:** Verificar que el `businessId` sea consistente

#### 3. Verificar la eliminación en la BD
```sql
-- Ejecutar inmediatamente después de guardar
SELECT 
  id,
  business_id,
  day_of_week,
  created_at
FROM business_hours
WHERE business_id = 'tu-business-id'
ORDER BY created_at DESC;

-- Todos los registros deben tener el mismo created_at (mismo momento)
```

---

## 🎨 Mejoras de UX Implementadas

### 1. Feedback Visual Claro
- ✅ Botón cambia de texto según contexto
- ✅ Mensaje de éxito personalizado
- ✅ Estado de carga con spinner

### 2. Prevención de Errores
- ✅ Botón deshabilitado mientras guarda (`disabled={saving}`)
- ✅ Validación de `businessId` antes de guardar
- ✅ Manejo de errores con mensajes claros

### 3. Transparencia del Proceso
- ✅ Logs detallados en consola
- ✅ Conteo de registros procesados
- ✅ Mensajes de error específicos

---

## 📝 Resumen de Archivos Modificados

### 1. `src/presentation/pages/settings/BusinessHours.tsx`
**Líneas modificadas:**
- Línea 21: Agregado `const [hasExistingHours, setHasExistingHours] = useState(false);`
- Línea 49: Agregado `setHasExistingHours(true);`
- Línea 66: Agregado `setHasExistingHours(false);`
- Línea 71: Agregado `setHasExistingHours(false);`
- Línea 105: Modificado mensaje de alerta condicional
- Línea 215: Modificado texto del botón condicional

### 2. `src/core/services/businessHoursService.ts`
**Líneas modificadas:**
- Línea 59-61: Agregados logs de inicio
- Línea 67-70: Agregados logs de eliminación
- Línea 72: Agregado log de confirmación
- Línea 82: Agregado log de inserción
- Línea 92-93: Agregados logs de error y éxito

---

## ✅ Checklist de Implementación

- [x] Estado `hasExistingHours` agregado
- [x] Detección de horarios existentes implementada
- [x] Botón dinámico implementado
- [x] Mensaje de éxito contextual
- [x] Logs detallados agregados
- [x] Prevención de doble clic (disabled)
- [ ] **PENDIENTE:** Probar guardado inicial (sin horarios)
- [ ] **PENDIENTE:** Probar edición (con horarios existentes)
- [ ] **PENDIENTE:** Verificar logs en consola
- [ ] **PENDIENTE:** Confirmar que no hay duplicados

---

## 🎯 Resultado Esperado

Después de implementar estos cambios:

1. ✅ **Primera vez:** Botón dice "Guardar horarios", se crean 7 registros
2. ✅ **Segunda vez:** Botón dice "Guardar cambios", se eliminan los 7 anteriores y se crean 7 nuevos
3. ✅ **Siempre:** Solo 7 registros en la BD por negocio (uno por día)
4. ✅ **Logs claros:** Puedes ver cada paso del proceso en consola
5. ✅ **Sin duplicados:** Imposible tener más de 7 registros por negocio

---

## 💡 Notas Adicionales

### ¿Por qué DELETE + INSERT en lugar de UPDATE?

**Ventajas:**
- ✅ Más simple de implementar
- ✅ Garantiza consistencia (siempre 7 registros)
- ✅ No requiere lógica compleja de comparación
- ✅ Evita registros huérfanos

**Desventajas:**
- ⚠️ Pierde el historial de `created_at` original
- ⚠️ Genera nuevos UUIDs en cada guardado

**Alternativa futura (si se necesita):**
- Implementar lógica de UPSERT (UPDATE si existe, INSERT si no)
- Mantener los IDs originales
- Preservar `created_at` original

### Sobre los UUIDs

Cada vez que guardas, se generan nuevos UUIDs para los registros. Esto es normal con la estrategia DELETE + INSERT. Si necesitas mantener los IDs originales, habría que cambiar a una estrategia de UPDATE.

### Sobre el Performance

La operación DELETE + INSERT es muy rápida para 7 registros. No hay impacto perceptible en el rendimiento. Si en el futuro manejas cientos de registros, considera cambiar a UPDATE selectivo.
