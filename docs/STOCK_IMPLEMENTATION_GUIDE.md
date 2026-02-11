# 📦 Guía de Implementación del Campo Stock

## 🎯 Resumen

Se ha implementado el soporte completo para el campo `stock` en la tabla `products`, permitiendo a los restaurantes gestionar el inventario de sus productos.

---

## 📋 Archivos Modificados

### 1. **Base de Datos**
- ✅ `sql/add_stock_to_products.sql` - Script para agregar columna `stock`
- ⚠️ `sql/add_category_to_products_OPTIONAL.sql` - Script OPCIONAL para categorías

### 2. **TypeScript Types**
- ✅ `src/core/supabase/types.ts` - Tipos actualizados con campo `stock`

### 3. **Servicios**
- ✅ `src/core/services/productService.ts` - Soporte para `stock` en CRUD

### 4. **Componentes**
- ✅ `src/presentation/pages/restaurantUI/ProductAdd.tsx` - Crear productos con stock
- ✅ `src/presentation/pages/restaurantUI/ProductEdit.tsx` - Editar stock de productos

---

## 🚀 Pasos para Implementar

### **PASO 1: Ejecutar Scripts SQL en Supabase**

#### 1.1 Agregar Columna Stock (OBLIGATORIO)
```sql
-- Ir a Supabase Dashboard → SQL Editor → New query
-- Copiar y pegar el contenido completo de: sql/add_stock_to_products.sql
-- Hacer clic en "Run"
```

**Lo que hace este script:**
- ✅ Agrega columna `stock` (INTEGER, DEFAULT 0, NOT NULL)
- ✅ Agrega constraint para que stock no sea negativo
- ✅ Crea índice para consultas por stock
- ✅ Es idempotente (se puede ejecutar múltiples veces)

#### 1.2 Corregir Políticas RLS (OBLIGATORIO)
```sql
-- Copiar y pegar el contenido completo de: sql/fix_product_policies.sql
-- Hacer clic en "Run"
```

**Lo que hace este script:**
- ✅ Elimina políticas antiguas que usan `collaborators`
- ✅ Crea políticas correctas usando `businesses.owner_id`
- ✅ Permite CREATE, READ, UPDATE, DELETE de productos

#### 1.3 Agregar Categorías (OPCIONAL - Solo si lo necesitas)
```sql
-- Copiar y pegar el contenido completo de: sql/add_category_to_products_OPTIONAL.sql
-- Hacer clic en "Run"
```

**⚠️ NOTA sobre Categorías:**
- **NO es necesario** para que funcione el stock
- Solo implementar si quieres vincular productos con la tabla `product_categories`
- Actualmente las categorías están hardcoded en el frontend

---

### **PASO 2: Verificar la Implementación**

#### 2.1 Verificar Columna Stock
```sql
-- Ejecutar en Supabase SQL Editor
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
```

**Resultado esperado:**
```
column_name  | data_type | column_default | is_nullable
-------------|-----------|----------------|------------
...
stock        | integer   | 0              | NO
...
```

#### 2.2 Verificar Políticas RLS
```sql
-- Ejecutar en Supabase SQL Editor
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'products'
ORDER BY cmd, policyname;
```

**Resultado esperado: 5 políticas**
1. Owners can view their own products (SELECT)
2. Clients can view active products (SELECT)
3. Owners can insert products (INSERT)
4. Owners can update products (UPDATE)
5. Owners can delete products (DELETE)

---

### **PASO 3: Probar la Funcionalidad**

#### 3.1 Crear Producto con Stock
1. Ir a `/restaurant/products`
2. Clic en "Agregar producto"
3. Llenar formulario incluyendo **Stock disponible**
4. Guardar
5. Verificar en la lista que el producto se creó

#### 3.2 Editar Stock de Producto
1. Ir a `/restaurant/products`
2. Clic en "Editar" en un producto
3. Cambiar el valor de **Stock disponible**
4. Guardar cambios
5. Verificar que el cambio se reflejó

#### 3.3 Verificar en Base de Datos
```sql
-- Ver productos con su stock
SELECT id, name, price, stock, active
FROM products
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 Estructura del Campo Stock

### Definición
```sql
stock INTEGER DEFAULT 0 NOT NULL CHECK (stock >= 0)
```

### Características
- **Tipo**: INTEGER (número entero)
- **Default**: 0 (cero unidades)
- **NOT NULL**: Siempre debe tener un valor
- **CHECK**: No puede ser negativo (>= 0)
- **Indexado**: Sí (para consultas rápidas)

### Uso en TypeScript
```typescript
interface ProductData {
  name: string;
  description?: string;
  price: number;
  business_id: string;
  image_url?: string;
  active?: boolean;
  stock?: number;  // ← Nuevo campo
}
```

---

## 🔄 Flujo de Datos

### Crear Producto
```
ProductAdd.tsx
  ↓ (formData.stock)
productService.createProduct()
  ↓ (stock: parseInt(formData.stock) || 0)
Supabase INSERT
  ↓
products table (stock column)
```

### Editar Producto
```
ProductEdit.tsx
  ↓ (load product.stock)
Display in form
  ↓ (user changes stock)
productService.updateProduct()
  ↓ (stock: parseInt(formData.stock) || 0)
Supabase UPDATE
  ↓
products table (stock column updated)
```

---

## ⚠️ Limitaciones Actuales

### Campo Categoría
- **Estado**: Presente en el formulario pero NO se guarda
- **Razón**: La tabla `products` no tiene columna `category_id`
- **Solución**: Ejecutar `sql/add_category_to_products_OPTIONAL.sql` si lo necesitas

### Validaciones
- ✅ Stock no puede ser negativo (constraint en BD)
- ✅ Stock debe ser número entero
- ✅ Stock por defecto es 0
- ⚠️ NO hay validación de stock al crear órdenes (pendiente)

---

## 🎯 Próximos Pasos Recomendados

### Fase 1: Control de Inventario
1. **Validar stock al crear orden**
   - Verificar que hay suficiente stock antes de confirmar pedido
   - Mostrar mensaje si producto agotado

2. **Actualizar stock automáticamente**
   - Restar stock cuando se confirma una orden
   - Sumar stock si se cancela una orden

3. **Alertas de stock bajo**
   - Notificar al restaurante cuando stock < 5 unidades
   - Marcar productos como "Agotado" cuando stock = 0

### Fase 2: Reportes
1. **Dashboard de inventario**
   - Productos con stock bajo
   - Productos más vendidos
   - Historial de movimientos de stock

2. **Exportar inventario**
   - Generar reporte en Excel/PDF
   - Incluir valorización del inventario

---

## 🐛 Troubleshooting

### Error: "column stock does not exist"
**Solución**: Ejecutar `sql/add_stock_to_products.sql`

### Error: "new row violates row-level security policy"
**Solución**: Ejecutar `sql/fix_product_policies.sql`

### Stock no se guarda al crear producto
**Verificar**:
1. Que la columna `stock` existe en la tabla
2. Que el formulario envía el valor de stock
3. Revisar logs en consola del navegador

### Stock no se actualiza al editar
**Verificar**:
1. Que las políticas RLS permiten UPDATE
2. Que el producto pertenece al usuario autenticado
3. Revisar logs en consola del navegador

---

## ✅ Checklist de Implementación

- [ ] Ejecutar `sql/add_stock_to_products.sql`
- [ ] Ejecutar `sql/fix_product_policies.sql`
- [ ] Verificar columna `stock` en tabla `products`
- [ ] Verificar políticas RLS
- [ ] Probar crear producto con stock
- [ ] Probar editar stock de producto
- [ ] Verificar datos en Supabase

---

## 📞 Soporte

Si encuentras algún problema:
1. Revisa los logs en consola del navegador (F12)
2. Verifica que los scripts SQL se ejecutaron correctamente
3. Confirma que las políticas RLS están activas
4. Revisa la sección de Troubleshooting arriba

---

**Última actualización**: $(date)
**Versión**: 1.0.0
