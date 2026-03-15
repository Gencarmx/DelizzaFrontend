# 🛒 PLAN DE IMPLEMENTACIÓN - CARRITO DE COMPRAS PARA PRODUCCIÓN

## 📊 ESTADO ACTUAL DEL PROYECTO

### ✅ FUNCIONALIDADES IMPLEMENTADAS
- **CartContext** básico con localStorage
- **Interfaz de carrito** (Cart.tsx) - visualización y gestión básica
- **ProductModal** para agregar productos
- **Header** con contador de items
- **Operaciones CRUD** básicas del carrito
- **✅ FILTRADO DE PRODUCTOS POR COLABORADORES** - Owners y Sellers solo ven productos de sus restaurantes asignados
- **Sistema de colaboradores** integrado con políticas RLS reales

### ❌ FUNCIONALIDADES FALTANTES PARA PRODUCCIÓN
Sistema incompleto que requiere implementación de persistencia, pagos, órdenes y notificaciones.

---

## 🚀 FASE 1: BASE DE DATOS Y PERSISTENCIA (PRIORIDAD MÁXIMA)

### 1.1 Configuración de Tablas en Supabase
```sql
-- Crear tabla cart_items
CREATE TABLE cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10,2) NOT NULL,
  product_image TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla orders
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_option JSONB,
  delivery_address JSONB,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla order_items
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla user_addresses
CREATE TABLE user_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own cart items" ON cart_items
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own orders" ON orders
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own order items" ON order_items
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own addresses" ON user_addresses
  FOR ALL USING (auth.uid() = user_id);
```

### 1.2 Actualizar CartContext para Supabase
**Archivo:** `src/core/context/CartContext.tsx`
- [ ] Descomentar funciones de sincronización con Supabase
- [ ] Implementar `loadFromSupabase()` y `syncWithSupabase()`
- [ ] Agregar merge de carritos al login
- [ ] Mejorar manejo de errores de red

### 1.3 Crear Servicios de Base de Datos
**Archivos nuevos:**
- `src/core/services/cartService.ts`
- `src/core/services/orderService.ts`
- `src/core/services/addressService.ts`

---

## 💳 FASE 2: SISTEMA DE PAGOS Y CHECKOUT

### 2.1 Integración de MercadoPago/Stripe
```bash
npm install @mercadopago/sdk-react  # o stripe
```

### 2.2 Página de Checkout
**Archivo nuevo:** `src/presentation/pages/Checkout.tsx`
- [ ] Formulario de dirección de entrega
- [ ] Selección de método de pago
- [ ] Resumen del pedido
- [ ] Validación de datos
- [ ] Integración con API de pagos

### 2.3 Componentes de Pago
**Archivos nuevos:**
- `src/presentation/components/payment/PaymentForm.tsx`
- `src/presentation/components/payment/PaymentStatus.tsx`
- `src/presentation/components/address/AddressSelector.tsx`

### 2.4 API de Pagos
**Archivo nuevo:** `src/core/services/paymentService.ts`
- [ ] Crear preferencia de pago (MercadoPago)
- [ ] Webhook para confirmación de pago
- [ ] Manejo de estados de pago

---

## 📦 FASE 3: GESTIÓN DE ÓRDENES

### 3.1 Estados de Órdenes
```typescript
type OrderStatus =
  | 'pending'      // Esperando pago
  | 'paid'         // Pagado, esperando confirmación
  | 'confirmed'    // Confirmado por restaurante
  | 'preparing'    // En preparación
  | 'ready'        // Listo para entrega/recogida
  | 'delivered'    // Entregado
  | 'cancelled';   // Cancelado
```

### 3.2 API de Órdenes
**Archivo nuevo:** `src/core/services/orderService.ts`
- [ ] Crear orden desde checkout
- [ ] Actualizar estado de orden
- [ ] Obtener órdenes del usuario
- [ ] Cancelar orden

### 3.3 Historial de Órdenes
**Archivo nuevo:** `src/presentation/pages/OrderHistory.tsx`
- [ ] Lista de órdenes pasadas
- [ ] Detalles de cada orden
- [ ] Reordenar funcionalidad

---

## 🔔 FASE 4: NOTIFICACIONES PUSH

### 4.1 Configuración de Firebase
```bash
npm install firebase
```

### 4.2 Service Worker Personalizado
**Archivo nuevo:** `public/sw.js`
```javascript
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging.js');

const firebaseConfig = { /* config */ };
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
```

### 4.3 Context de Notificaciones
**Archivo nuevo:** `src/core/context/NotificationContext.tsx`
- [ ] Solicitar permisos
- [ ] Suscribir/desuscribir
- [ ] Enviar notificaciones de prueba

---

## 🔒 FASE 5: VALIDACIONES Y SEGURIDAD

### 5.1 Control de Inventario
- [ ] Validar stock disponible antes de agregar al carrito
- [ ] Actualizar inventario al confirmar orden
- [ ] Prevenir overselling

### 5.2 Validaciones de Precio
- [ ] Verificar que precios no cambien durante checkout
- [ ] Alertas de cambios de precio
- [ ] Recálculo automático del total

### 5.3 Rate Limiting
- [ ] Limitar operaciones del carrito por usuario
- [ ] Prevenir spam de creación de órdenes
- [ ] Validación de frecuencia de requests

---

## 🎨 FASE 6: MEJORAS DE UX

### 6.1 Funcionalidades Adicionales
- [ ] Sistema de cupones/descuentos
- [ ] Cálculo de IVA (16% México)
- [ ] Programa de puntos de fidelidad
- [ ] Horarios de entrega
- [ ] Notas especiales del pedido

### 6.2 Optimizaciones de Rendimiento
- [ ] Lazy loading de imágenes
- [ ] Paginación en listas largas
- [ ] Cache inteligente
- [ ] Optimización de re-renders

---

## 🧪 FASE 7: TESTING Y MONITOREO

### 7.1 Testing Unitario
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
```
- [ ] Tests para CartContext
- [ ] Tests para servicios
- [ ] Tests de integración

### 7.2 Testing E2E
```bash
npm install --save-dev @playwright/test
```
- [ ] Flujo completo de compra
- [ ] Testing de pagos
- [ ] Testing de notificaciones

### 7.3 Monitoreo
- [ ] Error tracking (Sentry)
- [ ] Analytics de conversión
- [ ] Métricas de performance

---

## 📋 CHECKLIST DE PRODUCCIÓN

### Base de Datos
- [ ] Todas las tablas creadas en Supabase
- [ ] Políticas RLS configuradas
- [ ] Índices de performance agregados
- [ ] Backups automáticos configurados

### APIs Externas
- [ ] MercadoPago/Stripe configurado
- [ ] Firebase Cloud Messaging configurado
- [ ] Servicio de email configurado
- [ ] API de mapas para distancias

### Seguridad
- [ ] Validación de todos los inputs
- [ ] Rate limiting implementado
- [ ] Sanitización de datos
- [ ] Encriptación de datos sensibles

### Documentación
- [ ] API documentation completa
- [ ] Guía de deployment
- [ ] Manual de usuario
- [ ] Runbook de incidentes

---

## 🎯 PRIORIDADES DE IMPLEMENTACIÓN

### 🔥 CRÍTICO (Implementar primero)
1. **Persistencia en Supabase** - Carritos se pierden al refrescar
2. **Sistema de pagos** - No se pueden procesar pedidos
3. **Gestión de órdenes** - No hay registro de pedidos
4. **Validaciones básicas** - Riesgo de errores de inventario

### ⚠️ IMPORTANTE (Implementar segundo)
1. **Notificaciones push** - Mejorar engagement
2. **Gestión de direcciones** - UX de delivery
3. **Historial de órdenes** - Retención de usuarios
4. **Control de inventario** - Prevenir problemas de stock

### 🎨 MEJORAS (Implementar último)
1. **Cupones y descuentos** - Aumentar conversión
2. **Programa de fidelidad** - Retención a largo plazo
3. **Analytics avanzado** - Optimización de negocio
4. **PWA offline** - Mejor experiencia móvil

---

## 📊 MÉTRICAS DE ÉXITO

### Funcionales
- [ ] **Tasa de conversión** > 75%
- [ ] **Tiempo promedio de checkout** < 2 minutos
- [ ] **Tasa de abandono de carrito** < 25%

### Técnicas
- [ ] **Uptime del sistema** > 99.5%
- [ ] **Tiempo de respuesta API** < 500ms
- [ ] **Error rate** < 1%

### de Negocio
- [ ] **Satisfacción del usuario** > 4.5/5
- [ ] **Repeat orders** > 30%
- [ ] **Valor promedio de pedido** aumentado en 15%

---

## 🚀 PLAN DE EJECUCIÓN INMEDIATA

### Semana 1: Base de Datos y Persistencia
1. **Día 1-2**: Crear todas las tablas en Supabase
2. **Día 3**: Actualizar CartContext para Supabase
3. **Día 4-5**: Implementar merge de carritos
4. **Día 6-7**: Testing de persistencia

### Semana 2: Sistema de Pagos
1. **Día 1-2**: Configurar MercadoPago
2. **Día 3**: Crear página de checkout
3. **Día 4-5**: Implementar flujo de pago
4. **Día 6-7**: Testing de pagos

### Semana 3: Órdenes y Notificaciones
1. **Día 1-2**: Sistema de órdenes
2. **Día 3**: Configurar Firebase
3. **Día 4-5**: Notificaciones push
4. **Día 6-7**: Testing integración

### Semana 4: Validaciones y UX
1. **Día 1-2**: Validaciones de producción
2. **Día 3**: Control de inventario
3. **Día 4-5**: Mejoras de UX
4. **Día 6-7**: Testing completo

---

## 🔧 DEPENDENCIAS TÉCNICAS

### Nuevas Dependencias Requeridas
```json
{
  "dependencies": {
    "@mercadopago/sdk-react": "^1.0.0",
    "firebase": "^9.22.0",
    "axios": "^1.13.2"
  },
  "devDependencies": {
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@playwright/test": "^1.35.0"
  }
}
```

### Variables de Entorno Nuevas
```env
# MercadoPago
VITE_MERCADOPAGO_PUBLIC_KEY=your_public_key
MERCADOPAGO_ACCESS_TOKEN=your_access_token

# Firebase
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Email Service (ej: SendGrid)
SENDGRID_API_KEY=your_sendgrid_key
```

---

## ⚠️ RIESGOS Y MITIGACIÓN

### Riesgos Técnicos
- **Dependencia de APIs externas**: Implementar fallbacks y retry logic
- **Problemas de concurrencia**: Usar transacciones en base de datos
- **Pérdida de datos**: Backups automáticos y validaciones

### Riesgos de Negocio
- **Fraude en pagos**: Validaciones y monitoreo de transacciones
- **Abandono de carrito**: Optimización del flujo de checkout
- **Problemas de inventario**: Alertas y validaciones en tiempo real

### Plan de Rollback
- **Por funcionalidad**: Feature flags para activar/desactivar
- **Por versión**: Capacidad de revertir a versión anterior
- **Por base de datos**: Scripts de rollback para migraciones

---

## 📞 SOPORTE Y MANTENIMIENTO

### Monitoreo Continuo
- Alertas automáticas para errores críticos
- Dashboard de métricas en tiempo real
- Logs centralizados para debugging

### Mantenimiento Programado
- Actualizaciones de dependencias mensuales
- Revisiones de seguridad trimestrales
- Optimizaciones de performance semestrales

---

## 🎉 CRITERIOS DE COMPLETACIÓN

### Funcionalidades Completadas
- [ ] Carrito persiste entre sesiones
- [ ] Checkout completo con pagos
- [ ] Órdenes registradas y trackeadas
- [ ] Notificaciones push funcionando
- [ ] Validaciones de producción activas
- [ ] Testing completo aprobado
- [ ] Documentación actualizada

### Métricas Alcanzadas
- [ ] 0 errores críticos en producción
- [ ] Tiempo de carga < 2 segundos
- [ ] Cobertura de tests > 80%
- [ ] Satisfacción del usuario > 4.5/5

---

*Este plan está diseñado para ser implementado de manera incremental, permitiendo releases frecuentes y feedback continuo del usuario.*
