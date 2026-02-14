# 🔍 Guía de Diagnóstico Completo de Base de Datos

Esta guía te ayudará a recopilar toda la información necesaria sobre la estructura de tu base de datos para un análisis completo.

## 📋 Scripts Creados

He creado 6 scripts SQL para diagnosticar completamente tu base de datos:

### 1. **list_rls_policies.sql**
- Lista todas las políticas RLS (Row Level Security)
- Muestra qué usuarios pueden acceder a qué datos
- Verifica si RLS está habilitado en cada tabla

### 2. **list_all_triggers.sql**
- Lista todos los triggers activos
- Muestra qué acciones ejecutan automáticamente
- Indica en qué tablas y eventos se disparan

### 3. **list_all_functions.sql**
- Lista todas las funciones personalizadas
- Muestra el código fuente completo
- Indica tipo de seguridad (DEFINER/INVOKER)

### 4. **list_all_constraints.sql**
- Lista PRIMARY KEYS, FOREIGN KEYS, UNIQUE, CHECK
- Muestra relaciones entre tablas
- Indica reglas de CASCADE/RESTRICT

### 5. **list_all_indexes.sql**
- Lista todos los índices
- Muestra qué columnas están indexadas
- Indica tipo de índice (B-tree, etc.)

### 6. **list_table_structure.sql**
- Estructura completa de todas las tablas
- Tipos de datos de cada columna
- Relaciones entre tablas (diagrama ER)

---

## 🚀 Cómo Ejecutar

### Opción A: Ejecutar Todos los Scripts (Recomendado)

```sql
-- Copiar y pegar este bloque completo en Supabase SQL Editor

-- ========== 1. POLÍTICAS RLS ==========
SELECT 'POLÍTICAS RLS - PRODUCTS' as section;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE tablename = 'products' ORDER BY cmd, policyname;

SELECT 'POLÍTICAS RLS - BUSINESSES' as section;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE tablename = 'businesses' ORDER BY cmd, policyname;

SELECT 'RLS HABILITADO' as section;
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables WHERE tablename IN ('products', 'businesses') AND schemaname = 'public';

-- ========== 2. TRIGGERS ==========
SELECT 'TRIGGERS' as section;
SELECT trigger_schema, trigger_name, event_manipulation, event_object_table, action_statement, action_timing
FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY event_object_table, trigger_name;

SELECT 'DEFINICIÓN DE TRIGGERS' as section;
SELECT n.nspname as schema_name, t.tgname as trigger_name, c.relname as table_name, 
       p.proname as function_name, pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
LEFT JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'public' AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- ========== 3. FUNCIONES ==========
SELECT 'FUNCIONES' as section;
SELECT n.nspname as schema_name, p.proname as function_name, 
       pg_get_function_arguments(p.oid) as arguments,
       pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' ORDER BY p.proname;

SELECT 'CÓDIGO DE FUNCIONES' as section;
SELECT n.nspname as schema_name, p.proname as function_name, 
       pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' ORDER BY p.proname;

-- ========== 4. CONSTRAINTS ==========
SELECT 'CONSTRAINTS' as section;
SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name,
       ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name,
       rc.update_rule, rc.delete_rule
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- ========== 5. ÍNDICES ==========
SELECT 'ÍNDICES' as section;
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- ========== 6. ESTRUCTURA DE TABLAS ==========
SELECT 'ESTRUCTURA DE TABLAS' as section;
SELECT table_name, column_name, data_type, character_maximum_length, 
       column_default, is_nullable, ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

SELECT 'RELACIONES ENTRE TABLAS' as section;
SELECT tc.table_name AS from_table, kcu.column_name AS from_column,
       ccu.table_name AS to_table, ccu.column_name AS to_column,
       tc.constraint_name, rc.update_rule, rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

### Opción B: Ejecutar Scripts Individuales

Ejecuta cada archivo `.sql` por separado en Supabase SQL Editor.

---

## 📊 Qué Información Necesito

Por favor ejecuta el script completo de la **Opción A** y cópiame **TODOS** los resultados.

Específicamente necesito:

### ✅ Crítico (Obligatorio):
1. **Todas las políticas RLS** de `products` y `businesses`
2. **Todos los triggers** y sus definiciones completas
3. **Todas las funciones** con su código fuente
4. **Estructura de las tablas** `products`, `businesses`, `profiles`

### 📌 Importante (Muy útil):
5. **Constraints** (especialmente FOREIGN KEYS)
6. **Índices** en las tablas principales
7. **Relaciones entre tablas**

---

## 🎯 Objetivo del Diagnóstico

Con esta información podré:

1. ✅ Identificar por qué las consultas devuelven arrays vacíos
2. ✅ Simplificar las políticas RLS si son demasiado complejas
3. ✅ Optimizar triggers que puedan estar causando problemas
4. ✅ Proponer una estructura más simple y eficiente
5. ✅ Asegurar que funcione correctamente en producción

---

## 💡 Notas Importantes

- **No ejecutes** `fix_public_access_policies.sql` todavía
- Primero necesito ver toda la estructura actual
- Luego te daré una solución completa y optimizada
- La solución será simple, eficiente y lista para producción

---

## 📝 Formato de Respuesta

Copia los resultados en formato JSON (como lo hiciste antes) o en texto plano.

Si los resultados son muy largos, puedes:
1. Dividirlos en varias respuestas
2. Usar un servicio como Pastebin
3. Enviarlos por secciones

---

**¿Listo para ejecutar el diagnóstico completo?**
