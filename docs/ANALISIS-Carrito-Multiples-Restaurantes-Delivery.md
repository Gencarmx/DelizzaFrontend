# Análisis: Carrito con Múltiples Restaurantes y Opciones de Entrega Mixtas

**Fecha:** 20 de Marzo de 2026  
**Estado:** Análisis de Enfoques  
**Contexto:** Extensión del PLAN-Configuracion-Delivery-Pickup-Restaurantes.md

---

## Problema Identificado

**Escenario:**
Un cliente tiene en su carrito productos de 3 restaurantes:
- Restaurante A: Solo delivery (`has_delivery=true`, `has_pickup=false`)
- Restaurante B: Solo pickup (`has_delivery=false`, `has_pickup=true`)
- Restaurante C: Ambos (`has_delivery=true`, `has_pickup=true`)

**Pregunta:** ¿Cómo manejar la selección de método de entrega cuando cada restaurante tiene opciones diferentes?

- Para cada grupo de productos pertenecientes a un mismo restaurante se muestre la opcion de reparto o entrega en establecimiento
- segun lo que el restaurante en cuestion tenga disponible.
- Ejemplo, se realiza un pedido en dos restaurantes, se maneja por separado como actualmente se realiza y se muestra las diferentes
- opciones de entrega que tiene cada restaurante.

## Estado Actual del Sistema

### CartContext (simplificado):
```typescript
interface CartContextType {
  items: CartItem[];                    // Productos de cualquier restaurante
  deliveryOption: DeliveryOption;       // UNA sola opción para todo el carrito
  getOrdersByRestaurant: () => CartOrder[]; // Ya agrupa por restaurante
  hasMultipleRestaurants: () => boolean;
}
```

### checkoutService (simplificado):
```typescript
// Ya procesa pedidos múltiples por separado
processMultiRestaurantCheckout(orders: CartOrder[], checkoutData: CheckoutData)
```

**Observación:** El sistema **ya divide los pedidos por restaurante** (`getOrdersByRestaurant`), pero usa UNA sola `deliveryOption` para todos.

---

## Enfoques Posibles

### Enfoque A: Checkout Separado por Restaurante (Recomendado)
**Concepto:** Cuando hay productos de múltiples restaurantes, el checkout se realiza UNO a la vez, permitiendo diferentes opciones de entrega por restaurante.

#### Flujo:
```
┌──────────────────────────────────────────────────────────────┐
│                         CARRITO                              │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Restaurante A  │  │  Restaurante B  │  ┌─────────────┐ │
│  │  (Solo Delivery)│  │  (Solo Pickup) │  │ Restaurante C│ │
│  │                 │  │                 │  │  (Ambos)    │ │
│  │  [Delivery ✓]  │  │  [Pickup ✓]    │  │[Delivery ▼] │ │
│  │                 │  │                 │  │[Pickup]     │ │
│  │  Subtotal: $50  │  │  Subtotal: $30 │  │Subtotal: $40│ │
│  │                 │  │                 │  │             │ │
│  │  [Procesar]    │  │  [Procesar]    │  │[Procesar]  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│                                                              │
│  ⚠️ "Los pedidos se procesarán por separado"                │
└──────────────────────────────────────────────────────────────┘
```

#### Cambios requeridos:

**1. CartContext:**
```typescript
interface CartContextType {
  // ... existente
  getRestaurantDeliveryOptions: (restaurantId: string) => DeliveryOption[];
  setRestaurantDeliveryOption: (restaurantId: string, option: DeliveryOption) => void;
}
```

**2. UI del Carrito - Opción de selección por restaurante:**
```tsx
{ordersByRestaurant.map((order) => (
  <div key={order.restaurant.id} className="border rounded-xl p-4">
    <h3>{order.restaurant.name}</h3>
    
    {/* Opciones disponibles para este restaurante */}
    <DeliveryOptionsSelector 
      restaurantId={order.restaurant.id}
      availableOptions={getAvailableOptions(order.restaurant.id)}
      selectedOption={getSelectedOption(order.restaurant.id)}
      onChange={(opt) => setRestaurantDeliveryOption(order.restaurant.id, opt)}
    />
    
    {/* Mostrar dirección solo si eligió delivery */}
    {getSelectedOption(order.restaurant.id)?.type === 'delivery' && (
      <AddressSelector />
    )}
    
    <button onClick={() => handleCheckoutSingle(order)}>
      Procesar pedido
    </button>
  </div>
))}
```

**3. Lógica de validación:**
```typescript
function getAvailableOptions(restaurantId: string): DeliveryOption[] {
  const restaurant = getRestaurantConfig(restaurantId);
  const options: DeliveryOption[] = [];
  
  if (restaurant.has_delivery) options.push({ type: 'delivery' });
  if (restaurant.has_pickup) options.push({ type: 'pickup' });
  
  return options;
}
```

#### Pros:
- ✅ Cada restaurante puede tener su método de entrega independiente
- ✅ Claro y fácil de entender para el usuario
- ✅ Usa la infraestructura existente de `processMultiRestaurantCheckout`
- ✅ Flexible para cualquier combinación de opciones

#### Contras:
- ⚠️ Requiere cambios en la UI del carrito
- ⚠️ Más interacciones del usuario (varios checkouts)

---

### Enfoque B: Restringir a Un Solo Restaurante
**Concepto:** Si ya hay productos en el carrito de un restaurante, no permitir agregar de otro. Forzar a completar/un carrito antes de agregar de otro.

#### Flujo:
```
┌────────────────────────────────────────────┐
│           RESTAURANTE A                    │
│                                            │
│  [Producto 1] [Agregar al carrito]        │
│  [Producto 2] [Agregar al carrito]        │
│                                            │
└────────────────────────────────────────────┘
                    │
                    ▼ Al intentar agregar del Restaurante B:
┌────────────────────────────────────────────┐
│  ⚠️ Tu carrito tiene productos de          │
│     [Restaurante A]                        │
│                                            │
│  [Vaciar carrito y agregar]               │
│  [Cancelar]                                │
└────────────────────────────────────────────┘
```

#### Cambios requeridos:

**1. Modificar addToCart:**
```typescript
const addToCart = (item: ...) => {
  const currentRestaurantId = items[0]?.restaurant?.id;
  const newRestaurantId = item.restaurant?.id;
  
  if (currentRestaurantId && currentRestaurantId !== newRestaurantId) {
    // Mostrar modal de confirmación
    showReplaceCartModal({
      currentRestaurant: currentRestaurantId,
      newRestaurant: newRestaurantId,
      onConfirm: () => {
        clearCart();
        addItem(item);
      }
    });
    return;
  }
  
  addItem(item);
};
```

#### Pros:
- ✅ Simplifica enormemente la lógica
- ✅ No requiere cambios en checkout
- ✅ Mantiene la UX simple
- ✅ Compatible con la configuración de delivery existente

#### Contras:
- ⚠️ Puede frustrar al usuario que quiere comparar productos de diferentes restaurantes
- ⚠️ Reduce la conversión de ventas
- ⚠️ Mal experience para "modo explorar"

---

### Enfoque C: Opción Única Dominante (Pickup para todos)
**Concepto:** Si hay productos de múltiples restaurantes, usar la INTERSECCIÓN de opciones disponibles. Si algún restaurante no ofrece delivery, TODOS van como pickup.

#### Flujo:
```
┌─────────────────────────────────────────────────────────────┐
│  Restaurante A: Delivery ✅ | Pickup ✅                    │
│  Restaurante B: Delivery ❌ | Pickup ✅                    │
│  Restaurante C: Delivery ✅ | Pickup ✅                    │
│                          │                                  │
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  OPCIÓN COMÚN: Solo Pickup disponible               │ │
│  │  (Delivery no disponible porque Restaurante B       │ │
│  │   no ofrece ese servicio)                            │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Lógica:
```typescript
function getCommonDeliveryOptions(orders: CartOrder[]): DeliveryOption[] {
  const restaurantIds = orders.map(o => o.restaurant.id);
  const configs = getRestaurantConfigs(restaurantIds);
  
  const allHaveDelivery = configs.every(c => c.has_delivery);
  const allHavePickup = configs.every(c => c.has_pickup);
  
  const options: DeliveryOption[] = [];
  if (allHaveDelivery) options.push({ type: 'delivery' });
  if (allHavePickup) options.push({ type: 'pickup' });
  
  return options;
}
```

#### Pros:
- ✅ No requiere cambiar estructura del carrito
- ✅ Checkout simple
- ✅ Siempre usa la `deliveryOption` global

#### Contras:
- ⚠️ Limitante para el usuario (no puede elegir delivery aunque la mayoría lo ofrezca)
- ⚠️ Puede perder ventas (usuario prefiere delivery pero no puede)
- ⚠️ Menos flexible

---

## Comparación de Enfoques

| Criterio | Enfoque A (Separado) | Enfoque B (Restringir) | Enfoque C (Intersección) |
|----------|----------------------|------------------------|---------------------------|
| Complejidad de implementación | Media-Alta | Baja | Baja |
| Experiencia de usuario | Buena | Limitada | Limitada |
| Flexibilidad | Alta | Baja | Media |
| Compatibilidad multi-restaurante | Excelente | Nula | Parcial |
| Cambios en checkout | Mínimos | Ninguno | Ninguno |
| Cambios en CartContext | Medios | Ninguno | Ninguno |

---

## Recomendación

### Recomendado: **Enfoque A - Checkout Separado por Restaurante**

**Razones:**
1. **No limita al usuario** - Puede agregar productos de cualquier restaurante
2. **Flexible** - Maneja cualquier combinación de opciones de delivery
3. **Escalable** - Funciona con N restaurantes y cualquier configuración
4. **Compatible** - Usa la infraestructura existente de `processMultiRestaurantCheckout`

**Cambios mínimos requeridos:**
1. Agregar `deliveryOptionsByRestaurant` al CartContext
2. Modificar UI del Cart para mostrar selector por restaurante
3. Agregar función `handleCheckoutSingle(order)` 
4. Validar opciones disponibles antes de procesar

---

## Implementación Sugerida (Enfoque A)

### Paso 1: Modificar CartContext
```typescript
interface CartContextType {
  // ... existente
  
  // Nuevos campos
  deliveryOptionsByRestaurant: Record<string, DeliveryOption>;
  setDeliveryOptionForRestaurant: (restaurantId: string, option: DeliveryOption) => void;
  getDeliveryOptionForRestaurant: (restaurantId: string) => DeliveryOption;
}
```

### Paso 2: UI del Carrito
- Mostrar cada pedido de restaurante como una tarjeta independiente
- Cada tarjeta tiene su propio selector de delivery/pickup
- Cada tarjeta tiene su propio botón "Procesar"

### Paso 3: Lógica de Validación
```typescript
const handleCheckout = async (order: CartOrder) => {
  const restaurantConfig = await getRestaurantConfig(order.restaurant.id);
  const selectedOption = deliveryOptionsByRestaurant[order.restaurant.id];
  
  // Validar que la opción sea válida
  if (selectedOption.type === 'delivery' && !restaurantConfig.has_delivery) {
    alert('Este restaurante no ofrece delivery');
    return;
  }
  
  if (selectedOption.type === 'pickup' && !restaurantConfig.has_pickup) {
    alert('Este restaurante no ofrece pickup');
    return;
  }
  
  // Proceder con checkout
  await processCheckout(order, selectedOption);
};
```

---

## Decisión Pendiente

**¿Cuál enfoque prefieres implementar?**

1. **Enfoque A (Recomendado):** Checkout separado por restaurante
2. **Enfoque B:** Restringir a un solo restaurante
3. **Enfoque C:** Usar intersección de opciones

También puedes elegir una **combinación**: implementar Enfoque A para cuando hay múltiples restaurantes, pero mostrar un selector simple cuando hay un solo restaurante.

---

*Documento de análisis para revisión*
