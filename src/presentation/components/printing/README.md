# 🖨️ Sistema de Impresión de Tickets

Sistema de impresión de tickets para pedidos de restaurante, optimizado para impresoras térmicas (58mm y 80mm).

## 📁 Estructura

```
printing/
├── OrderTicket/
│   ├── OrderTicket.tsx      # Componente del ticket
│   └── OrderTicket.css       # Estilos del ticket
├── PrintButton/
│   ├── PrintButton.tsx       # Botón de impresión
│   └── PrintButton.css       # Estilos del botón
├── types.ts                  # Tipos compartidos
├── index.ts                  # Exportaciones
└── README.md                 # Esta documentación
```

## 🚀 Uso

### Importación

```typescript
import { PrintButton } from '@presentation/components/printing';
```

### Uso Básico

```typescript
<PrintButton 
  order={order}
  variant="icon"  // o "button"
/>
```

### Con Información del Negocio

```typescript
<PrintButton 
  order={order}
  businessName="Mi Restaurante"
  businessAddress="Calle Principal #123"
  businessPhone="555-1234"
  variant="button"
/>
```

## 📋 Props

### PrintButton

| Prop | Tipo | Requerido | Default | Descripción |
|------|------|-----------|---------|-------------|
| `order` | `Order` | ✅ | - | Objeto del pedido a imprimir |
| `businessName` | `string` | ❌ | "Mi Restaurante" | Nombre del restaurante |
| `businessAddress` | `string` | ❌ | "Dirección del restaurante" | Dirección del restaurante |
| `businessPhone` | `string` | ❌ | "Teléfono" | Teléfono del restaurante |
| `variant` | `"icon" \| "button"` | ❌ | "icon" | Estilo del botón |
| `className` | `string` | ❌ | "" | Clases CSS adicionales |

### Order Type

```typescript
interface Order {
  id: string;
  fullId: string;
  customer: string;
  items: string;
  total: number;
  status: "pending" | "completed" | "cancelled" | "in_progress" | "ready" | "preparing";
  date: string;
  paymentMethod: string;
  originalStatus?: string;
}
```

## 🖨️ Compatibilidad con Impresoras

### Impresoras Térmicas Soportadas

- ✅ **80mm** (ancho estándar) - Recomendado
- ✅ **58mm** (ancho compacto)

### Configuración de Impresora

1. **Windows:**
   - Panel de Control → Dispositivos e Impresoras
   - Configurar impresora térmica como predeterminada
   - Ajustar tamaño de papel a 80mm o 58mm

2. **macOS:**
   - Preferencias del Sistema → Impresoras y Escáneres
   - Agregar impresora térmica
   - Configurar tamaño de papel personalizado

3. **Linux:**
   - CUPS → Administración de impresoras
   - Configurar impresora térmica
   - Ajustar tamaño de papel

## 🎨 Formato del Ticket

El ticket incluye:

```
================================
      NOMBRE DEL RESTAURANTE
      Dirección del restaurante
           Teléfono
================================
Pedido #: ABC123
Fecha: 01/01/2024 12:00
Cliente: Juan Pérez
Pago: Efectivo
================================
Cant.  Producto         Precio
--------------------------------
2      Hamburguesa      $10.00
1      Papas Fritas     $5.00
================================
TOTAL:                  $25.00
================================
    ¡Gracias por su compra!
         Vuelva pronto
--------------------------------
Estado: Listo para Entrega
```

## 💡 Características

- ✅ **Sin dependencias externas** - Usa API nativa del navegador
- ✅ **Responsive** - Se adapta a 58mm y 80mm
- ✅ **Modo oscuro** - Soporte completo
- ✅ **Optimizado** - CSS específico para impresión
- ✅ **Fuente monoespaciada** - Alineación perfecta
- ✅ **Vista previa** - El usuario puede ver antes de imprimir

## 🔧 Personalización

### Modificar Estilos del Ticket

Edita `OrderTicket/OrderTicket.css`:

```css
/* Cambiar ancho del ticket */
@media print {
  .order-ticket {
    width: 58mm; /* o 80mm */
  }
}

/* Cambiar fuente */
.order-ticket {
  font-family: 'Tu Fuente', monospace;
}
```

### Agregar Información Adicional

Edita `OrderTicket/OrderTicket.tsx`:

```typescript
{/* Agregar sección personalizada */}
<div className="ticket-custom">
  <p>Información adicional</p>
</div>
```

## 🐛 Solución de Problemas

### El ticket no se imprime

1. Verifica que la impresora esté configurada correctamente
2. Asegúrate de que el navegador tenga permisos para imprimir
3. Revisa que la impresora esté encendida y conectada

### El formato se ve mal

1. Verifica el ancho de papel configurado (58mm o 80mm)
2. Ajusta los estilos en `OrderTicket.css`
3. Prueba con diferentes navegadores

### Los caracteres se cortan

1. Reduce el tamaño de fuente en `@media print`
2. Ajusta el ancho de las columnas
3. Usa nombres de productos más cortos

## 📝 Notas

- El sistema usa `window.open()` para crear una ventana de impresión
- Los estilos están inline en el HTML generado para garantizar compatibilidad
- El ticket se cierra automáticamente después de imprimir
- Compatible con todos los navegadores modernos

## 🔄 Actualizaciones Futuras

- [ ] Soporte para códigos QR
- [ ] Impresión de códigos de barras
- [ ] Plantillas personalizables
- [ ] Impresión automática sin diálogo
- [ ] Soporte para impresoras ESC/POS directamente
