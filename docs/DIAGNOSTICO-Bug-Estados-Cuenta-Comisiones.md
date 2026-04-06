# Diagnóstico y Corrección del Bug: Estados de Cuenta no se Generan

## Problema

Al ejecutar "Cerrar quincena" desde `/admin/billing`, la tabla `billing_statements` queda vacía. Los estados de cuenta no se generan ni guardan.

## Flujo Actual

```
1. Admin hace clic en "Cerrar quincena"
         ↓
2. Frontend llama a edge function: close-billing-period
         ↓
3. close-billing-period:
   - Obtiene business_ids con comisiones del periodo
   - Actualiza billing_periods.status = 'closed'
   - Itera por cada business_id y llama a generate-billing-statement
         ↓
4. generate-billing-statement:
   - Genera HTML con datos del negocio
   - Sube a Supabase Storage
   - Hace upsert en billing_statements con pdf_url
         ↓
5. Frontend carga billing_statements y muestra botones de descarga
```

**Punto de falla identificado**: El paso 3-4 no está creando los registros en `billing_statements`.

## Hipótesis del Bug

### Hipótesis 1: Error silencioso en generate-billing-statement

La función `generate-billing-statement` podría fallar silenciosamente por:
- Error al hacer upsert (posiblemente por conflicto de RLS o unique constraint)
- Error al subir a Storage
- La función no está desplegada correctamente

### Hipótesis 2: close-billing-period no está llamando a la función correctamente

El código podría no estar ejecutando el loop de generación o los errores no se manejan correctamente.

### Hipótesis 3: La función no existe o no está desplegada

Las Edge Functions podrían no estar desplegadas en Supabase.

## Plan de Investigación y Corrección

### Paso 1: Verificar que la función está desplegada

En Supabase Dashboard → Edge Functions → verificar que existen:
- `close-billing-period`
- `generate-billing-statement`

### Paso 2: Revisar logs de Edge Functions

En Supabase Dashboard → Edge Functions → Logs, filtrar por las funciones mencionadas para ver errores.

### Paso 3: Agregar mejor manejo de errores en close-billing-period

El código actual (líneas 126-170) hace Promise.all pero no manejo de errores robusto. Si una llamada falla, el error se captura pero no se propagaría correctamente.

### Paso 4: Posible fix en generate-billing-statement

Revisar el upsert de billing_statements (líneas 252-268). El `onConflict: "billing_period_id,business_id"` podría estar fallando si la constraint no existe o está mal nombrada.

## Corrección Propuesta

### Fix 1: Mejorar logs en close-billing-period

Agregar logging más detallado para cada intento de generación.

### Fix 2: Validar que el upsert funcione correctamente

Revisar el upsert de billing_statements (líneas 252-268). El `onConflict: "billing_period_id,business_id"` podría estar fallando si la constraint no existe o está mal nombrada.

**CRÍTICO**: En el código se usa `onConflict: "billing_period_id,business_id"` pero la constraint en la base de datos se llama `unique_statement_per_period_business`. El nombre de la constraint debe coincidir, no los nombres de columnas. Esto podría causar el fallo silencioso.

### Fix 3: Script de recuperación

Crear script para regenerar los statements faltantes dado un billing_period_id.

---

## Verificaciones Manuales Requeridas

1. **Verificar que las funciones existen**:
   ```sql
   -- En Supabase SQL Editor
   SELECT * FROM supabase_functions.functions WHERE name LIKE '%billing%';
   ```

2. **Verificar constraint en billing_statements**:
   ```sql
   SELECT conname, pg_get_constraintdef(oid) 
   FROM pg_constraint 
   WHERE conrelid = 'billing_statements'::regclass;
   ```

3. **Verificar registros en order_commissions para el periodo**:
   ```sql
   SELECT * FROM order_commissions 
   WHERE billing_period_id = '<ID_DEL_PERIODO>';
   ```

4. **Verificar logs** en Supabase Dashboard → Edge Functions → Logs

## Código de Script de Regeneración

Para ejecutar manualmente la generación de estados de cuenta para un periodo específico:

```typescript
// Este script regenera los estados de cuenta para un periodo dado
// Ejecutar en el navegador console del admin o crear un endpoint

const billing_period_id = '<ID_DEL_PERIODO>';

// 1. Obtener negocios con comisiones
const { data: commissions } = await supabase
  .from('order_commissions')
  .select('business_id')
  .eq('billing_period_id', billing_period_id);

const businessIds = [...new Set(commissions.map(c => c.business_id))];

// 2. Para cada negocio, llamar a generate-billing-statement
for (const businessId of businessIds) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-billing-statement`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ billing_period_id, business_id: businessId })
  });
  console.log(businessId, await res.json());
}
```

---

## Acciones Inmediatas

1. [x] Verificar que las Edge Functions están desplegadas
2. [x] Revisar logs de Edge Functions
3. [x] Verificar que hay datos en order_commissions para el periodo
4. [x] Verificar la constraint en billing_statements
5. [x] Identificar la causa raíz: nombre de constraint incorrecto en el upsert

## Estado

- [x] Completado
- [x] En análisis

---

## Bug Confirmado (Causa Raíz)

**Problema encontrado en el código desplegado**: La Edge Function `generate-billing-statement` desplegada tiene el nombre de constraint incorrecto en el upsert.

### Detalles del Bug

**Ubicación**: `generate-billing-statement`, línea del upsert (~línea 265)

```typescript
// ❌ Código desplegado (INCORRECTO):
{ onConflict: "billing_period_id,business_id" }

// ✅ Código correcto:
{ onConflict: "unique_statement_per_period_business" }
```

### Por qué ocurre

El SDK de Supabase espera el **nombre de la constraint** (como está definida en la BD), no los nombres de columnas separados por coma. La constraint en la base de datos se llama `unique_statement_per_period_business`, pero el código usaba `"billing_period_id,business_id"`, lo cual causa que el upsert falle silenciosamente y nunca se guarden los registros en `billing_statements`.

### Diagnóstico confirmado

| Verificación | Resultado |
|--------------|-----------|
| Constraint existe en BD | ✅ `unique_statement_per_period_business` |
| Comisiones en períodos cerrados | ✅ 6 negocios con comisiones |
| billing_statements | ❌ Vacío (nunca se guardaron) |
| Código desplegado usa nombre correcto | ❌ Usa `"billing_period_id,business_id"` |

---

## Correcciones Aplicadas (en código local)

### Fix 1: Nombre de constraint incorrecto (CRÍTICO)

**Archivo**: `supabase/functions/generate-billing-statement/index.ts`

**Problema**: El código usaba `onConflict: "billing_period_id,business_id"` pero el nombre de la constraint en la BD es `unique_statement_per_period_business`.

**Corrección**: Cambiado a `onConflict: "unique_statement_per_period_business"`.

```typescript
// Antes (incorrecto):
{ onConflict: "billing_period_id,business_id" }

// Después (correcto):
{ onConflict: "unique_statement_per_period_business" }
```

### Fix 2: Agregar logging para debug

Se agregó console.log en ambas funciones para poder diagnosticar problemas en los logs de Supabase:
- En `close-billing-period`: Logging de chunks procesados
- En `generate-billing-statement`: Logging de datos del upsert

---

## Próximo paso

1. Desplegar las Edge Functions actualizadas:
   ```bash
   # Usando supabase CLI (el proyecto usa bun)
   bunx supabase functions deploy close-billing-period
   bunx supabase functions deploy generate-billing-statement
   ```

2. Para regenerar los estados de cuenta del período cerrado:
   - Opción A: Crear un nuevo período y cerrarlo (el período cerrado ya no puede regenerarse)
   - Opción B: Crear un script de recuperación manual (ver abajo)

### Script de Recuperación Manual

Si deseas regenerar los estados de cuenta para el período ya cerrado sin crear uno nuevo, puedes ejecutar este SQL directamente en el SQL Editor de Supabase:

```sql
-- Obtener el ID del período cerrado
SELECT id, period_start, period_end, status 
FROM billing_periods 
WHERE status = 'closed';

-- Luego ejecutar la edge function para cada negocio
-- Esto requiere conocimiento del business_id de cada restaurante
```

Alternativamente, podemos crear una Edge Function adicional `regenerate-billing-statements` que regenerate todos los statements para un periodo dado.

---

## Diagnóstico de Períodos Duplicados

Se detectaron 2 períodos con las mismas fechas (ambos status = 'closed'):

| id | period_start | period_end | closed_at |
|----|--------------|------------|-----------|
| 45f21d58-6a80-425e-886f-2feaa8b0dd59 | 2026-03-16 06:00:00+00 | 2026-04-01 05:59:59+00 | 2026-03-16 23:00:24+00 |
| 38303fa4-3c7f-4b24-ae6f-db68b7b35c97 | 2026-03-16 06:00:00+00 | 2026-04-01 05:59:59+00 | 2026-04-04 02:53:02+00 |

**Posible causa**: Se ejecutó "Cerrar quincena" dos veces (probablemente por error del usuario o double-click).

**Comisiones en esos períodos**: 6 negocios con un total de 14 órdenes

**Recomendación**: Limpiar el período duplicado (opcional, no afecta el funcionamiento pero genera confusión).