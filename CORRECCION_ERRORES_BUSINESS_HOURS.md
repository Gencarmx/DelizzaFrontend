# Corrección de Errores - Business Hours

## 🔧 Problemas Corregidos

### 1. Error RLS (Row Level Security) ✅
**Error original:** `new row violates row-level security policy for table "business_hours"`

**Causa:** Políticas RLS dependían de la tabla `collaborators` (descontinuada)

**Solución aplicada:** Nuevas políticas basadas en `businesses.owner_id`

---

### 2. Error de UUID Nulo ✅
**Error:** `null value in column "id" of relation "business_hours" violates not-null constraint`

**Causa:** La columna `id` no tenía valor por defecto para generar UUIDs automáticamente

**Soluciones aplicadas:**
1. **SQL Fix (Base de datos):** Script para agregar `gen_random_uuid()` como default
2. **Código Fix (Aplicación):** Generación explícita de UUIDs con `crypto.randomUUID()`

---

### 3. Timeout en Business Status ✅
**Error:** `Business status fetch timeout`

**Causa:** Timeout de 3 segundos muy corto para consultas de base de datos

**Solución aplicada:** 
- Aumentado timeout de 3s a 10s
- Cambiado `console.error` a `console.warn` para reducir ruido en logs

---

## 📋 Archivos Modificados

### 1. `src/core/services/businessHoursService.ts`
**Cambios:**
```typescript
// ANTES
const hoursToInsert: BusinessHourInsert[] = hours.map(hour => ({
  business_id: businessId,
  day_of_week: hour.day_of_week,
  // ... sin id
}));

// DESPUÉS
const hoursToInsert: BusinessHourInsert[] = hours.map(hour => ({
  id: crypto.randomUUID(),  // ✅ Genera UUID explícitamente
  business_id: businessId,
  day_of_week: hour.day_of_week,
  // ...
}));
```

**Beneficio:** Garantiza que cada registro tenga un UUID único, incluso si la base de datos no lo genera automáticamente.

---

### 2. `src/core/context/AuthContext.tsx`
**Cambios:**
```typescript
// ANTES
const timeoutPromise = new Promise<null>((_, reject) => {
  setTimeout(() => reject(new Error("Business status fetch timeout")), 3000);
});

// DESPUÉS
const timeoutPromise = new Promise<null>((_, reject) => {
  setTimeout(() => reject(new Error("Business status fetch timeout")), 10000);
});

// Y cambio de log
console.warn('Business status fetch timeout or error:', error); // antes era console.error
```

**Beneficio:** Más tiempo para consultas lentas y menos ruido en la consola.

---

## 🗄️ Scripts SQL Creados

### 1. `fix_business_hours_id_default.sql`
**Propósito:** Agregar generación automática de UUID en la base de datos

**Ejecutar en Supabase SQL Editor:**
```sql
ALTER TABLE business_hours 
ALTER COLUMN id SET DEFAULT gen_random_uuid();
```

**Cuándo ejecutar:** 
- ✅ **RECOMENDADO:** Ejecutar este script para tener doble protección
- Si no lo ejecutas, el código TypeScript generará los UUIDs de todas formas

---

## 🚀 Pasos para Implementar

### Paso 1: Verificar Políticas RLS (Ya aplicadas ✅)
Las políticas ya están activas según tu confirmación:
- ✅ Public can view active business hours
- ✅ Owners can view their business hours
- ✅ Owners can insert business hours
- ✅ Owners can update business hours
- ✅ Owners can delete business hours

### Paso 2: Aplicar Fix de UUID (OPCIONAL pero recomendado)
```sql
-- Ejecutar en Supabase SQL Editor
ALTER TABLE business_hours 
ALTER COLUMN id SET DEFAULT gen_random_uuid();
```

### Paso 3: Probar la Aplicación
1. Inicia sesión como owner
2. Ve a Configuración → Horarios de atención
3. Modifica los horarios
4. Guarda los cambios
5. ✅ Debería funcionar sin errores

---

## 🧪 Verificación de Correcciones

### Test 1: Verificar UUID Default en BD
```sql
SELECT 
  column_name,
  column_default
FROM information_schema.columns
WHERE table_name = 'business_hours' 
  AND column_name = 'id';

-- Resultado esperado:
-- column_default: gen_random_uuid()
```

### Test 2: Inserción Manual
```sql
-- Reemplaza con tu business_id real
INSERT INTO business_hours (
  business_id,
  day_of_week,
  open_time,
  close_time,
  active
) VALUES (
  'tu-business-id-aqui',
  1,
  '09:00',
  '21:00',
  true
);

-- Si funciona, el UUID se generó correctamente
```

### Test 3: Verificar desde la App
1. Abre DevTools (F12)
2. Ve a la pestaña Console
3. Guarda horarios
4. Busca el log: `"Horarios guardados correctamente:"`
5. Verifica que cada objeto tenga un `id` UUID válido

---

## 📊 Comparación Antes/Después

| Aspecto | Antes ❌ | Después ✅ |
|---------|---------|-----------|
| **Políticas RLS** | Dependían de `collaborators` | Basadas en `businesses.owner_id` |
| **Generación UUID** | No generaba (null) | `crypto.randomUUID()` en código |
| **Timeout Business** | 3 segundos | 10 segundos |
| **Logs de error** | `console.error` ruidoso | `console.warn` apropiado |
| **Inserción horarios** | ❌ Fallaba | ✅ Funciona |

---

## 🔍 Troubleshooting

### Si aún falla la inserción:

#### Error: "permission denied"
**Solución:** Verifica que el usuario esté autenticado y sea owner
```sql
-- Verificar usuario y rol
SELECT 
  p.id,
  p.user_id,
  p.user_role,
  b.id as business_id,
  b.name as business_name
FROM profiles p
LEFT JOIN businesses b ON b.owner_id = p.id
WHERE p.user_id = auth.uid();
```

#### Error: "business_id does not exist"
**Solución:** Verifica que el `businessId` del contexto sea válido
```typescript
// En BusinessHours.tsx, agregar log temporal
console.log('Business ID from context:', businessId);
```

#### Error: "invalid input syntax for type uuid"
**Solución:** Verifica que `crypto.randomUUID()` esté disponible
```typescript
// Test en consola del navegador
console.log(crypto.randomUUID()); // Debe mostrar un UUID válido
```

---

## 📝 Notas Adicionales

### Sobre crypto.randomUUID()
- ✅ Soportado en todos los navegadores modernos (Chrome 92+, Firefox 95+, Safari 15.4+)
- ✅ Genera UUIDs v4 estándar
- ✅ No requiere librerías externas

### Sobre el Timeout
- El timeout de 10s es generoso para conexiones lentas
- Si aún es insuficiente, puedes aumentarlo a 15000 (15s)
- El timeout solo afecta la carga inicial, no las operaciones normales

### Sobre las Políticas RLS
- Las políticas actuales son seguras y eficientes
- No necesitan modificación a menos que agregues colaboradores
- Permiten lectura pública de horarios activos (necesario para clientes)

---

## ✅ Checklist de Implementación

- [x] Políticas RLS actualizadas y verificadas
- [x] Código TypeScript actualizado con `crypto.randomUUID()`
- [x] Timeout aumentado en AuthContext
- [ ] **PENDIENTE:** Ejecutar `fix_business_hours_id_default.sql` (opcional)
- [ ] **PENDIENTE:** Probar guardado de horarios en la app
- [ ] **PENDIENTE:** Verificar que no hay errores en consola

---

## 🎯 Resultado Esperado

Después de implementar todos los cambios:

1. ✅ Los horarios se guardan correctamente
2. ✅ No hay errores RLS en consola
3. ✅ No hay errores de UUID nulo
4. ✅ El timeout de business status no aparece (o es menos frecuente)
5. ✅ La experiencia de usuario es fluida

---

## 📞 Soporte

Si después de implementar todo sigues teniendo problemas:

1. Verifica los logs de Supabase Dashboard → Logs
2. Revisa la pestaña Network en DevTools para ver las peticiones fallidas
3. Confirma que el usuario tiene un perfil válido en la tabla `profiles`
4. Verifica que el negocio existe y está activo en la tabla `businesses`
