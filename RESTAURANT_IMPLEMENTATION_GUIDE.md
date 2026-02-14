# 🏪 RESTAURANT IMPLEMENTATION GUIDE
## Guía de Implementación para Funcionalidades de Restaurantes - MVP

### 📋 **VISIÓN GENERAL**
Este documento establece las pautas y procedimientos para implementar completamente las funcionalidades de restaurantes en el MVP de Delizza. El enfoque está en crear un sistema operativo completo para restaurantes sin integración de pagos online para usuarios.

---

## 🎯 **OBJETIVOS DEL MVP**

### Objetivos Principales
- ✅ **Gestión completa de productos** (CRUD con imágenes)
- ✅ **Recepción y gestión de pedidos** en tiempo real
- ✅ **Dashboard operativo** con métricas reales
- ✅ **Sistema de comisiones** para monetización
- ✅ **Notificaciones en tiempo real** para nuevos pedidos

### Alcance del MVP
- **Usuarios pagan en efectivo** directamente al restaurante
- **Restaurantes pagan comisión** a la plataforma (5% por pedido)
- **Sin integración de pagos online** complejos
- **Enfoque en operaciones diarias** del restaurante

---

## 📁 **ESTRUCTURA DE ARCHIVOS**

### Servicios Nuevos Requeridos
```
src/core/services/
├── productService.ts          # Gestión de productos
├── businessService.ts         # Gestión de restaurantes
├── orderService.ts           # Gestión de pedidos
├── analyticsService.ts       # Analytics y métricas
├── commissionService.ts      # Sistema de comisiones
└── notificationService.ts    # Notificaciones
```

### Páginas Nuevas Requeridas
```
src/presentation/pages/restaurantUI/
├── BusinessProfile.tsx       # Perfil del restaurante
├── CommissionReport.tsx      # Reporte de comisiones
└── Collaborators.tsx         # Gestión de colaboradores (post-MVP)
```

### Componentes Nuevos Requeridos
```
src/presentation/components/restaurant/
├── ProductImageUpload.tsx    # Subida de imágenes
├── OrderStatusBadge.tsx      # Estados de pedidos
├── CommissionSummary.tsx     # Resumen de comisiones
└── RealTimeNotifications.tsx # Notificaciones en tiempo real
```

---

## 🚀 **FASES DE IMPLEMENTACIÓN**

### **FASE 1: CONECTIVIDAD CON BASE DE DATOS**
**Duración estimada:** 1 semana
**Prioridad:** Crítica

#### 1.1 Servicios de Productos
**Responsable:** Desarrollador Backend
**Archivos:** `src/core/services/productService.ts`

**Funcionalidades requeridas:**
```typescript
// Interfaces
interface ProductData {
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  stock_quantity?: number;
  is_active: boolean;
}

// Funciones requeridas
getProductsByBusiness(businessId: string): Promise<Product[]>
createProduct(businessId: string, data: ProductData): Promise<Product>
updateProduct(productId: string, data: Partial<ProductData>): Promise<Product>
deleteProduct(productId: string): Promise<void>
uploadProductImage(file: File): Promise<string>
```

#### 1.2 Servicios de Órdenes
**Responsable:** Desarrollador Backend
**Archivos:** `src/core/services/orderService.ts`

**Funcionalidades requeridas:**
```typescript
// Estados de pedidos MVP
type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

// Funciones requeridas
getOrdersByBusiness(businessId: string, filters?: OrderFilters): Promise<Order[]>
updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order>
getOrderDetails(orderId: string): Promise<OrderDetails>
markOrderAsPaid(orderId: string): Promise<Order> // Para pagos en efectivo
cancelOrder(orderId: string, reason: string): Promise<Order>
```

#### 1.3 Servicios de Analytics
**Responsable:** Desarrollador Backend
**Archivos:** `src/core/services/analyticsService.ts`

**Funcionalidades requeridas:**
```typescript
getBusinessMetrics(businessId: string, period: DateRange): Promise<BusinessMetrics>
getSalesChartData(businessId: string, period: Period): Promise<ChartData[]>
getTopProducts(businessId: string, limit: number): Promise<ProductSales[]>
getCommissionSummary(businessId: string, period: DateRange): Promise<CommissionSummary>
```

### **FASE 2: SISTEMA DE COMISIONES**
**Duración estimada:** 3 días
**Prioridad:** Alta

#### 2.1 Cálculo de Comisiones
**Responsable:** Desarrollador Backend
**Archivos:** `src/core/services/commissionService.ts`

**Reglas de comisión:**
- **5%** del total de cada pedido completado
- **Cálculo automático** al marcar pedido como completado
- **Acumulación mensual** por restaurante
- **Mínimo mensual:** $500 MXN

**Funcionalidades requeridas:**
```typescript
calculateCommission(orderTotal: number): number // Retorna 5% del total
getMonthlyCommission(businessId: string, year: number, month: number): Promise<CommissionData>
getPendingCommissions(businessId: string): Promise<CommissionData[]>
markCommissionAsPaid(commissionId: string): Promise<void>
```

#### 2.2 Reporte de Comisiones
**Responsable:** Desarrollador Frontend
**Archivos:** `src/presentation/pages/restaurantUI/CommissionReport.tsx`

**Secciones requeridas:**
- Resumen mensual de comisiones
- Detalle por pedido
- Estado de pagos (pendiente/pagado)
- Exportación a PDF

### **FASE 3: ACTUALIZACIÓN DE PÁGINAS EXISTENTES**
**Duración estimada:** 1 semana
**Prioridad:** Crítica

#### 3.1 Dashboard.tsx
**Cambios requeridos:**
- [ ] Reemplazar datos mock con llamadas reales a `analyticsService`
- [ ] Agregar sección de comisiones pendientes
- [ ] Integrar notificaciones en tiempo real
- [ ] Actualización automática cada 5 minutos

#### 3.2 ProductList.tsx
**Cambios requeridos:**
- [ ] Conectar con `productService.getProductsByBusiness()`
- [ ] Implementar eliminación real con confirmación
- [ ] Funcionalidad de duplicar productos
- [ ] Gestión de estados (activo/inactivo)
- [ ] Paginación para muchos productos

#### 3.3 ProductAdd.tsx
**Cambios requeridos:**
- [ ] Implementar `productService.createProduct()`
- [ ] Subida real de imágenes a Supabase Storage
- [ ] Validación completa de campos
- [ ] Asociación automática con restaurante del usuario

#### 3.4 ProductEdit.tsx
**Cambios requeridos:**
- [ ] Cargar datos reales con `productService.getProductById()`
- [ ] Implementar `productService.updateProduct()`
- [ ] Manejo de cambios en imagen
- [ ] Validación de permisos

#### 3.5 Orders.tsx
**Cambios requeridos:**
- [ ] Conectar con `orderService.getOrdersByBusiness()`
- [ ] Implementar actualización de estados
- [ ] Filtros por estado, fecha y búsqueda
- [ ] Vista detallada de pedidos
- [ ] Marcar pedidos como pagados en efectivo

### **FASE 4: NOTIFICACIONES EN TIEMPO REAL**
**Duración estimada:** 2 días
**Prioridad:** Alta

#### 4.1 Integración con Supabase Realtime
**Archivos existentes:** `src/presentation/logic/useRealtimeNotifications.ts`

**Cambios requeridos:**
- [ ] Conectar con órdenes reales (no mock)
- [ ] Suscripción automática por restaurante
- [ ] Manejo de desconexiones y reconexiones
- [ ] Alertas sonoras y visuales

#### 4.2 Notificaciones en Dashboard
**Archivos existentes:** `src/presentation/pages/restaurantUI/Dashboard.tsx`

**Funcionalidades:**
- [ ] Notificación flotante para nuevos pedidos
- [ ] Contador de pedidos pendientes
- [ ] Auto-ocultar después de 10 segundos
- [ ] Click para marcar como leído

### **FASE 5: PERFIL DEL RESTAURANTE**
**Duración estimada:** 3 días
**Prioridad:** Media

#### 5.1 Página de Perfil
**Archivos nuevos:** `src/presentation/pages/restaurantUI/BusinessProfile.tsx`

**Secciones requeridas:**
- Información básica (nombre, dirección, teléfono)
- Horarios de atención
- Tipos de entrega disponibles
- Configuración de zona de entrega

#### 5.2 Servicio de Perfil
**Archivos nuevos:** `src/core/services/businessProfileService.ts`

**Funcionalidades:**
```typescript
updateBusinessProfile(businessId: string, data: BusinessProfileData): Promise<Business>
getBusinessHours(businessId: string): Promise<BusinessHours[]>
updateBusinessHours(businessId: string, hours: BusinessHours[]): Promise<void>
```

---

## 🔧 **ESTÁNDARES DE DESARROLLO**

### **Convenciones de Código**
- **TypeScript estricto** habilitado
- **Interfaces** para todos los tipos de datos
- **Error handling** con try/catch en todas las llamadas API
- **Loading states** en todas las operaciones asíncronas
- **Validación de permisos** en el frontend y backend

### **Estructura de Respuestas API**
```typescript
// Respuesta exitosa
{
  success: true,
  data: T,
  message?: string
}

// Respuesta de error
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

### **Manejo de Errores**
- **Errores de red:** Reintento automático (3 veces)
- **Errores de validación:** Mensajes específicos por campo
- **Errores de permisos:** Redirección o mensaje claro
- **Errores inesperados:** Logging y mensaje genérico

### **Testing Obligatorio**
- **Unit tests** para servicios (mínimo 80% cobertura)
- **Integration tests** para flujos críticos
- **E2E tests** para operaciones principales
- **Testing manual** antes de cada deploy

---

## 📊 **MÉTRICAS Y KPIs**

### **Métricas Técnicas**
- ✅ **Tiempo de carga** < 2 segundos
- ✅ **Error rate** < 1%
- ✅ **Uptime** > 99%
- ✅ **Cobertura de tests** > 80%

### **Métricas de Negocio**
- ✅ **Restaurantes activos** gestionando productos
- ✅ **Pedidos procesados** correctamente
- ✅ **Comisiones calculadas** automáticamente
- ✅ **Notificaciones** funcionando en tiempo real

### **Métricas de Usuario**
- ✅ **Satisfacción del restaurante** > 4.5/5
- ✅ **Tiempo de respuesta** a pedidos < 5 minutos
- ✅ **Facilidad de uso** del panel de administración

---

## 🚨 **RIESGOS Y MITIGACIÓN**

### **Riesgos Técnicos**
- **Dependencia de Supabase:** Implementar caching offline básico
- **Problemas de concurrencia:** Transacciones en base de datos
- **Pérdida de datos:** Backups automáticos

### **Riesgos de Negocio**
- **Adopción baja:** Demo y capacitación para restaurantes
- **Problemas de UX:** Testing con usuarios reales
- **Concerns de pricing:** Comunicación clara de comisiones

### **Plan de Rollback**
- **Por funcionalidad:** Feature flags para activar/desactivar
- **Por versión:** Capacidad de revertir cambios
- **Por base de datos:** Scripts de rollback preparados

---

## 📅 **CRONOGRAMA DETALLADO**

### **Semana 1: Base de Datos y Servicios**
- Día 1-2: Servicios de productos
- Día 3-4: Servicios de órdenes
- Día 5: Servicios de analytics
- Día 6-7: Testing de servicios

### **Semana 2: Sistema de Comisiones**
- Día 1-2: Lógica de comisiones
- Día 3: Reporte de comisiones
- Día 4-5: Testing de comisiones

### **Semana 3: Páginas de Productos**
- Día 1-2: ProductList funcional
- Día 3: ProductAdd funcional
- Día 4: ProductEdit funcional
- Día 5: Testing de productos

### **Semana 4: Órdenes y Dashboard**
- Día 1-2: Orders funcional
- Día 3: Dashboard con datos reales
- Día 4: Notificaciones en tiempo real
- Día 5: Testing integración

### **Semana 5: Perfil y Testing Final**
- Día 1-2: Perfil del restaurante
- Día 3-4: Testing completo
- Día 5: Preparación para deploy

---

## 🔗 **DEPENDENCIAS Y REQUISITOS**

### **Dependencias Nuevas**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.4",
    "react-hook-form": "^7.45.4",
    "react-query": "^3.39.3",
    "jspdf": "^2.5.1",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@playwright/test": "^1.35.0"
  }
}
```

### **Variables de Entorno**
```env
# Supabase (ya configurado)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Configuración de comisiones
VITE_COMMISSION_RATE=0.05
VITE_MIN_MONTHLY_COMMISSION=500
```

---

## ✅ **CRITERIOS DE ACEPTACIÓN**

### **Por Funcionalidad**
- [ ] **Productos:** CRUD completo con imágenes
- [ ] **Pedidos:** Gestión completa de estados
- [ ] **Dashboard:** Métricas en tiempo real
- [ ] **Comisiones:** Cálculo y reporte automático
- [ ] **Notificaciones:** Alertas en tiempo real

### **Por Calidad**
- [ ] **Performance:** < 2s en todas las operaciones
- [ ] **Usabilidad:** Flujos intuitivos
- [ ] **Accesibilidad:** Navegación por teclado
- [ ] **Responsive:** Funciona en móvil y desktop

### **Por Testing**
- [ ] **Unit tests:** > 80% cobertura
- [ ] **Integration tests:** Flujos críticos
- [ ] **E2E tests:** Operaciones principales
- [ ] **Testing manual:** Aprobado por QA

---

## 📞 **COMUNICACIÓN Y SEGUIMIENTO**

### **Daily Standups**
- **Horario:** 9:00 AM diario
- **Duración:** 15 minutos
- **Formato:** Qué hice, qué haré, impedimentos

### **Revisiones de Código**
- **Pull Requests:** Obligatorios para todo código nuevo
- **Revisores:** Al menos 1 desarrollador senior
- **Aprobación:** Requiere aprobación antes de merge

### **Reporting de Progreso**
- **Semanal:** Resumen de avances y riesgos
- **Métricas:** Burndown chart actualizado
- **Demo:** Funcionalidades completadas cada viernes

---

## 🆘 **PROCEDIMIENTOS DE EMERGENCIA**

### **Rollback de Código**
1. Identificar el commit problemático
2. Revertir cambios en rama principal
3. Comunicar a stakeholders
4. Re-desplegar versión anterior

### **Problemas de Base de Datos**
1. Verificar backups automáticos
2. Evaluar impacto en usuarios
3. Implementar solución temporal
4. Planear fix permanente

### **Incidentes de Producción**
1. Alertar al equipo inmediatamente
2. Evaluar impacto y urgencia
3. Implementar solución temporal
4. Documentar causa raíz y fix

---

*Este documento debe ser actualizado semanalmente con los avances y ajustes necesarios durante el desarrollo del MVP.*
