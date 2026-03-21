# Plan de Implementación: Configuración de Delivery/Pickup por Restaurante

**Fecha:** 20 de Marzo de 2026  
**Estado:** Propuesto - Pendiente de Implementación  
**Prioridad:** Alta  

---

## Resumen Ejecutivo

Los restaurantes actualmente no pueden configurar si aceptan pedidos a domicilio, para recoger en el establecimiento, o ambos. El sistema aplica tarifas de delivery fijas sin considerar la configuración por restaurante.

**Objetivo:** Permitir que cada restaurante defina sus opciones de servicio (domicilio y/o recoger) y que los clientes solo puedan seleccionar opciones válidas según la configuración del restaurante.

---

## Estado Actual del Sistema

### Lo que existe:
| Componente | Estado | Detalle |
|------------|--------|---------|
| Campo `delivery_type` en órdenes | ✅ Existe | Acepta "pickup" o "delivery" |
| UI de selección delivery/pickup en Cart | ✅ Existe | Toggle entre opciones |
| Tarifa fija de delivery | ✅ Existe | $15 base + $5/km |
| Tarifa fija de pickup | ✅ Existe | $10 fijo |
| Configuración por restaurante | ❌ No existe | No hay campo `has_delivery` ni `has_pickup` |

### Estructura actual de `businesses`:
```typescript
// src/core/supabase/types.ts
interface Business {
  id, owner_id, owner_user_id, name, logo_url, address, phone,
  active, is_paused, created_at, updated_at
  // FALTAN: delivery_settings
}
```

### Estructura actual de `orders`:
```typescript
// Ya tiene delivery_type: "pickup" | "delivery"
```

---

## Arquitectura Propuesta

### 1. Nueva Estructura de Datos

#### Opción A: Campos individuales en `businesses` (Recomendada)
```sql
ALTER TABLE businesses ADD COLUMN has_delivery BOOLEAN DEFAULT true;
ALTER TABLE businesses ADD COLUMN has_pickup BOOLEAN DEFAULT true;
ALTER TABLE businesses ADD COLUMN delivery_fee NUMERIC DEFAULT 15;
ALTER TABLE businesses ADD COLUMN min_order_amount NUMERIC DEFAULT 0;
```

#### Opción B: JSONB para flexibilidad futura
```sql
ALTER TABLE businesses ADD COLUMN delivery_settings JSONB DEFAULT '{"hasDelivery":true,"hasPickup":true,"deliveryFee":15}';
```

**Recomendación:** Opción A por simplicidad y compatibilidad con queries directas.

---

### 2. Diagrama de Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                     PÁGINA RESTAURANTE                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ has_delivery│  │  has_pickup │  │    delivery_fee          │ │
│  │   [Toggle]  │  │   [Toggle]  │  │      [$____]             │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ min_order_amount                                            ││
│  │  [$____]                                                    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BASE DE DATOS                               │
│                    Tabla: businesses                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ has_delivery | has_pickup | delivery_fee | min_order_amount ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Home.tsx      │ │RestaurantDetail │ │    Cart.tsx     │
│ (Lista cards)   │ │   .tsx          │ │                 │
│                 │ │                 │ │                 │
│ Muestra badge   │ │ Muestra toggle  │ │ Filtra opciones │
│ "Domicilio" o   │ │ según config    │ │ solo válidas    │
│ "Recoger"       │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## Plan de Implementación Detallado

### Fase 1: Base de Datos y Tipos
**Archivos a modificar:**

| # | Archivo | Cambios |
|---|---------|---------|
| 1.1 | `supabase/migrations/` | Crear migración con nuevos campos |
| 1.2 | `src/core/supabase/types.ts` | Agregar tipos para delivery settings |

#### Migración SQL propuesta:
```sql
-- 001_add_delivery_settings.sql
ALTER TABLE businesses 
ADD COLUMN has_delivery BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN has_pickup BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN delivery_fee NUMERIC NOT NULL DEFAULT 15.00,
ADD COLUMN min_order_amount NUMERIC NOT NULL DEFAULT 0.00;

-- Comentarios para documentación
COMMENT ON COLUMN businesses.has_delivery IS 'Indica si el restaurante acepta pedidos a domicilio';
COMMENT ON COLUMN businesses.has_pickup IS 'Indica si el restaurante acepta pedidos para recoger';
COMMENT ON COLUMN businesses.delivery_fee IS 'Costo base de delivery en moneda local';
COMMENT ON COLUMN businesses.min_order_amount IS 'Monto mínimo para aceptar pedido a domicilio';
```

---

### Fase 2: Servicio de Negocio
**Archivos a modificar:**

| # | Archivo | Cambios |
|---|---------|---------|
| 2.1 | `src/core/services/businessService.ts` | Agregar métodos get/update delivery settings |

#### Nuevos métodos propuestos:
```typescript
// En businessService.ts

interface DeliverySettings {
  has_delivery: boolean;
  has_pickup: boolean;
  delivery_fee: number;
  min_order_amount: number;
}

export async function getDeliverySettings(businessId: string): Promise<DeliverySettings | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select('has_delivery, has_pickup, delivery_fee, min_order_amount')
    .eq('id', businessId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateDeliverySettings(
  businessId: string, 
  settings: Partial<DeliverySettings>
): Promise<void> {
  const { error } = await supabase
    .from('businesses')
    .update(settings)
    .eq('id', businessId);
  
  if (error) throw error;
}
```

---

### Fase 3: UI de Configuración del Restaurante
**Archivos a modificar:**

| # | Archivo | Cambios |
|---|---------|---------|
| 3.1 | `src/presentation/pages/settings/BusinessInfo.tsx` | Agregar sección de delivery |
| 3.2 | Crear `src/presentation/components/settings/DeliverySettings.tsx` | Componente reutilizable |

#### Componente DeliverySettings.tsx (propuesta):
```tsx
interface DeliverySettingsProps {
  currentSettings: {
    has_delivery: boolean;
    has_pickup: boolean;
    delivery_fee: number;
    min_order_amount: number;
  };
  onSave: (settings: Partial<DeliverySettings>) => Promise<void>;
}

export default function DeliverySettings({ currentSettings, onSave }: DeliverySettingsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Configuración de Entregas</h3>
      
      <div className="flex items-center gap-3">
        <input 
          type="checkbox" 
          id="has_delivery" 
          checked={currentSettings.has_delivery}
          onChange={(e) => onSave({ has_delivery: e.target.checked })}
        />
        <label htmlFor="has_delivery">
          Aceptamos pedidos a domicilio
        </label>
      </div>
      
      {currentSettings.has_delivery && (
        <>
          <div>
            <label>Costo de delivery:</label>
            <input 
              type="number" 
              value={currentSettings.delivery_fee}
              onChange={(e) => onSave({ delivery_fee: Number(e.target.value) })}
            />
          </div>
          <div>
            <label>Monto mínimo para delivery:</label>
            <input 
              type="number" 
              value={currentSettings.min_order_amount}
              onChange={(e) => onSave({ min_order_amount: Number(e.target.value) })}
            />
          </div>
        </>
      )}
      
      <div className="flex items-center gap-3">
        <input 
          type="checkbox" 
          id="has_pickup" 
          checked={currentSettings.has_pickup}
          onChange={(e) => onSave({ has_pickup: e.target.checked })}
        />
        <label htmlFor="has_pickup">
          Aceptamos pedidos para recoger en local
        </label>
      </div>
    </div>
  );
}
```

---

### Fase 4: Página de Detalle del Restaurante
**Archivos a modificar:**

| # | Archivo | Cambios |
|---|---------|---------|
| 4.1 | `src/presentation/pages/RestaurantDetail.tsx` | Mostrar badges de servicio disponible |

#### Propuesta de UI:
```tsx
// En RestaurantDetail.tsx
<div className="flex gap-2">
  {restaurant.has_delivery && (
    <span className="badge bg-green-100 text-green-800">
      🚗 Domicilio
    </span>
  )}
  {restaurant.has_pickup && (
    <span className="badge bg-blue-100 text-blue-800">
      🏃 Recoger
    </span>
  )}
  {!restaurant.has_delivery && !restaurant.has_pickup && (
    <span className="badge bg-red-100 text-red-800">
      ⚠️ Sin servicio disponible
    </span>
  )}
</div>
```

---

### Fase 5: Página del Carrito (Validación de Opciones)
**Archivos a modificar:**

| # | Archivo | Cambios |
|---|---------|---------|
| 5.1 | `src/core/context/CartContext.tsx` | Almacenar y usar delivery settings del restaurante |
| 5.2 | `src/presentation/pages/Cart.tsx` | Ocultar/mostrar opciones según configuración |

#### Lógica en CartContext.tsx:
```typescript
interface CartState {
  // ... existentes
  restaurantDeliverySettings?: {
    has_delivery: boolean;
    has_pickup: boolean;
    delivery_fee: number;
  };
}

// Cuando se añade producto del restaurante:
const fetchDeliverySettings = async (businessId: string) => {
  const settings = await getDeliverySettings(businessId);
  setCart(prev => ({
    ...prev,
    restaurantDeliverySettings: settings
  }));
};
```

#### Lógica en Cart.tsx:
```tsx
// En la sección de selección delivery/pickup
const availableOptions = [];

if (cart.restaurantDeliverySettings?.has_pickup) {
  availableOptions.push({
    type: 'pickup',
    label: 'Recoger en local',
    fee: 0 // o tarifa fija si aplica
  });
}

if (cart.restaurantDeliverySettings?.has_delivery) {
  availableOptions.push({
    type: 'delivery',
    label: 'Envío a domicilio',
    fee: cart.restaurantDeliverySettings.delivery_fee
  });
}

// Si solo hay una opción, ocultamos el selector y seleccionamos automáticamente
```

---

### Fase 6: Validación en Checkout
**Archivos a modificar:**

| # | Archivo | Cambios |
|---|---------|---------|
| 6.1 | `src/core/services/checkoutService.ts` | Validar opción de delivery válida |
| 6.2 | `src/core/context/CartContext.tsx` | Validación antes de proceder |

#### Validación en checkoutService.ts:
```typescript
export async function validateOrderItems(order: CartOrder): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Obtener configuración del restaurante
  const { data: business } = await supabase
    .from('businesses')
    .select('has_delivery, has_pickup, min_order_amount')
    .eq('id', order.restaurant.id)
    .single();

  if (!business) {
    errors.push('Restaurante no encontrado');
    return { valid: false, errors };
  }

  // Validar tipo de delivery seleccionado
  const deliveryType = order.deliveryOption?.type; // 'pickup' | 'delivery'
  
  if (deliveryType === 'delivery' && !business.has_delivery) {
    errors.push('Este restaurante no ofrece servicio a domicilio');
  }
  
  if (deliveryType === 'pickup' && !business.has_pickup) {
    errors.push('Este restaurante no ofrece servicio de recogida');
  }

  // Validar monto mínimo para delivery
  if (deliveryType === 'delivery' && business.min_order_amount > 0) {
    if (order.subtotal < business.min_order_amount) {
      errors.push(
        `El monto mínimo para delivery es $${business.min_order_amount}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## Lista Completa de Archivos a Modificar

| Fase | Archivo | Tipo de Cambio |
|------|---------|----------------|
| 1.1 | `supabase/migrations/001_add_delivery_settings.sql` | **NUEVO** |
| 1.2 | `src/core/supabase/types.ts` | Modificar tipo Business |
| 2.1 | `src/core/services/businessService.ts` | Agregar funciones |
| 3.1 | `src/presentation/pages/settings/BusinessInfo.tsx` | Agregar sección UI |
| 3.2 | `src/presentation/components/settings/DeliverySettings.tsx` | **NUEVO** |
| 4.1 | `src/presentation/pages/RestaurantDetail.tsx` | Mostrar badges |
| 5.1 | `src/core/context/CartContext.tsx` | Almacenar settings, validar |
| 5.2 | `src/presentation/pages/Cart.tsx` | UI de opciones |
| 6.1 | `src/core/services/checkoutService.ts` | Validación |

---

## Orden de Implementación Recomendado

```
Fase 1 (DB y Tipos)
    │
    ▼
Fase 2 (Servicio)
    │
    ▼
Fase 3 (Configuración UI) ─────────────────────┐
    │                                          │
    ▼                                          │
Fase 4 (Detalle Restaurante)                   │
    │                                          │
    ▼                                          │
Fase 5 (Carrito y Opciones) ◄──────────────────┘
    │
    ▼
Fase 6 (Checkout)
```

---

## Pruebas de Verificación

### Checklist de pruebas:

| # | Escenario | Resultado Esperado |
|---|-----------|-------------------|
| 1 | Restaurante con solo delivery | Carrito muestra solo opción domicilio |
| 2 | Restaurante con solo pickup | Carrito muestra solo opción recogida |
| 3 | Restaurante con ambos | Carrito muestra ambas opciones |
| 4 | Checkout con delivery en restaurante solo pickup | Error: "No ofrece domicilio" |
| 5 | Checkout con monto menor al mínimo | Error: "Monto mínimo $X" |
| 6 | Página detalle de restaurante | Muestra badges de servicios disponibles |
| 7 | Propietario configura servicios | Se guardan correctamente en BD |

---

## Consideraciones Adicionales

### Compatibilidad hacia atrás:
- El campo `has_delivery` y `has_pickup` tendrá `DEFAULT true` para no afectar restaurantes existentes
- Los campos `delivery_fee` y `min_order_amount` tendrán valores por defecto razonables

### Experiencia de usuario:
- Si un restaurante tiene ambas opciones deshabilitadas, mostrar mensaje de "Sin servicio disponible"
- En RestaurantDetail, si solo hay una opción, ocultarla y proceder automáticamente

### Validaciones frontend:
- No permitir checkout de delivery si `has_delivery = false`
- No permitir checkout de pickup si `has_pickup = false`
- Mostrar monto mínimo requerido si aplica

### Excepciones para colaboradores:
- Los propietarios/collaborators deben poder ver el restaurante aunque esté configurado sin servicio (para gestión)

---

## Métricas de Éxito

| Métrica | Antes | Después |
|---------|-------|---------|
| Restaurantes con configuración de delivery | 0% | 100% configurable |
| Intentos de pedido a domicilio inválido | Posibles | Bloqueados |
| Claridad del usuario sobre opciones | Confusa | Clara (badges) |
| Configuraciones de delivery específicas | No existen | Por restaurante |

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Migración afecta datos existentes | Baja | Alta | Usar DEFAULT values |
| Breaking changes en carrito | Media | Media | Mantener estructura de CartItem |
| Cache de datos antiguos | Baja | Baja | Invalidar cache al cargar |

---

*Documento generado para planificación de feature*
