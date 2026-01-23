# Implementación del Registro e Inicio de Sesión de Usuarios

## 🔄 Secuencia Detallada de Registro y Login

### Flujo de Registro e Inicio de Sesión para Clientes

#### 1. Registro de Cliente
**Paso 1: Acceso al Formulario**
- Usuario navega a `/register`
- Renderiza `Register.tsx` con campos básicos

**Paso 2: Validación de Datos**
- Campos requeridos: `email`, `password`, `fullName`
- Validación frontend: formato email, fortaleza de contraseña
- Validación backend: unicidad de email

**Paso 3: Creación de Cuenta (Técnico)**
```typescript
// AuthContext.tsx - signUpClient
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName,
      user_role: 'client'
    }
  }
});

// Inserción en tabla profiles
await supabase.from('profiles').insert({
  user_id: data.user.id,
  full_name: fullName,
  user_role: 'client',
  created_at: new Date()
});
```

**Paso 4: Confirmación de Email**
- Supabase envía email de verificación automáticamente
- Usuario debe confirmar email para activar cuenta

**Paso 5: Activación Inmediata**
- Una vez confirmado el email, cuenta activa
- Redirección automática a dashboard de cliente

#### 2. Inicio de Sesión de Cliente
**Paso 1: Acceso al Login**
- Usuario navega a `/login`
- Renderiza `Login.tsx`

**Paso 2: Autenticación**
```typescript
// AuthContext.tsx - signIn
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

// Verificación de rol
const { data: profile } = await supabase
  .from('profiles')
  .select('user_role')
  .eq('user_id', data.user.id)
  .single();

if (profile.user_role !== 'client') {
  throw new Error('Acceso denegado');
}
```

**Paso 3: Establecimiento de Sesión**
- Token JWT almacenado automáticamente por Supabase
- Estado de autenticación actualizado en AuthContext
- Redirección a ruta protegida según rol

### Flujo de Registro e Inicio de Sesión para Propietarios

#### 1. Registro de Propietario
**Paso 1: Selección de Tipo de Usuario**
- Usuario navega a `/register`
- Selector muestra opciones: Cliente vs Propietario
- Selección de "Propietario" redirige a `/register-owner`

**Paso 2: Formulario Extendido**
- Campos adicionales: `businessName`, `businessAddress`, `phoneNumber`
- Campos opcionales: upload de documentos (licencia, identificación)

**Paso 3: Validación de Datos**
- Validación frontend: todos los campos requeridos
- Validación backend: unicidad de email y nombre de negocio

**Paso 4: Creación de Cuenta (Técnico)**
```typescript
// AuthContext.tsx - signUpOwner
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName,
      user_role: 'owner'
    }
  }
});

// Inserción en tabla profiles
const profileData = {
  user_id: data.user.id,
  full_name: fullName,
  user_role: 'owner',
  phone_number: phoneNumber,
  created_at: new Date()
};
await supabase.from('profiles').insert(profileData);

// Creación de negocio
const businessData = {
  name: businessName,
  address: businessAddress,
  owner_id: data.user.id,
  active: false, // Pendiente de aprobación
  subscription_status: 'pending'
};
const { data: business } = await supabase
  .from('businesses')
  .insert(businessData)
  .select()
  .single();

// Creación de colaborador
await supabase.from('collaborators').insert({
  business_id: business.id,
  user_id: data.user.id,
  role: 'owner',
  status: 'pending' // Pendiente de aprobación
});
```

**Paso 5: Confirmación de Email**
- Email de verificación enviado por Supabase

**Paso 6: Estado Pendiente**
- Redirección a `/owner/pending-approval`
- Página muestra instrucciones para pago y aprobación

**Paso 7: Proceso de Pago (Técnico)**
```typescript
// Integración con Stripe
const { clientSecret, error } = await createSubscription(
  businessId,
  'price_monthly_owner' // ID del precio en Stripe
);

// Renderizar Stripe Elements
<Elements stripe={stripePromise}>
  <CheckoutForm clientSecret={clientSecret} />
</Elements>
```

**Paso 8: Webhook de Pago Exitoso**
```typescript
// Supabase Edge Function - webhook handler
export async function handlePaymentSuccess(event: StripeEvent) {
  const { business_id } = event.data.object.metadata;

  // Actualizar suscripción
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      paid_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    })
    .eq('business_id', business_id);

  // Notificar administrador
  await sendAdminNotification(business_id, 'payment_completed');
}
```

**Paso 9: Aprobación Manual**
- Administrador revisa en panel de administración
- Verificación de documentos y datos
- Aprobación o rechazo manual

**Paso 10: Activación Final (Técnico)**
```typescript
// Al aprobar
await supabase
  .from('businesses')
  .update({ active: true })
  .eq('id', businessId);

await supabase
  .from('collaborators')
  .update({ status: 'approved' })
  .eq('business_id', businessId);

// Notificación al propietario
await sendEmail(ownerEmail, 'approval_notification');
```

#### 2. Inicio de Sesión de Propietario
**Paso 1: Acceso al Login**
- Usuario navega a `/login`
- Renderiza `Login.tsx`

**Paso 2: Autenticación Básica**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});
```

**Paso 3: Verificación de Estado**
```typescript
// Verificar rol y estado de aprobación
const { data: profile } = await supabase
  .from('profiles')
  .select('user_role')
  .eq('user_id', data.user.id)
  .single();

if (profile.user_role !== 'owner') {
  throw new Error('Acceso denegado');
}

// Verificar aprobación
const { data: collaborator } = await supabase
  .from('collaborators')
  .select('status, business_id')
  .eq('user_id', data.user.id)
  .single();

if (collaborator.status === 'pending') {
  redirect('/owner/pending-approval');
} else if (collaborator.status === 'rejected') {
  throw new Error('Cuenta rechazada');
} else if (collaborator.status === 'approved') {
  // Verificar suscripción activa
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, expires_at')
    .eq('business_id', collaborator.business_id)
    .single();

  if (subscription.status !== 'active' || new Date() > new Date(subscription.expires_at)) {
    redirect('/owner/setup-payment');
  }
}
```

**Paso 4: Establecimiento de Sesión**
- Sesión completa establecida
- Redirección a dashboard de propietario

### Aspectos Técnicos del Proceso

#### Gestión de Estados
- **Cliente**: `null` → `authenticated` (inmediato)
- **Propietario**: `null` → `pending_email` → `pending_payment` → `pending_approval` → `authenticated`

#### Seguridad
- **Hashing de Contraseñas**: Manejado automáticamente por Supabase Auth
- **JWT Tokens**: Expiración automática, refresh tokens
- **Rate Limiting**: Implementar en API routes para prevenir abuso
- **Validación de Datos**: Frontend y backend validation

#### Manejo de Errores
- **Errores de Validación**: Mensajes específicos por campo
- **Errores de Red**: Retry automático con exponential backoff
- **Errores de Autenticación**: Mensajes genéricos para seguridad
- **Errores de Pago**: Manejo específico por tipo de error de Stripe

#### Optimización de Performance
- **Lazy Loading**: Componentes de registro cargados bajo demanda
- **Caching**: Perfiles de usuario cacheados en AuthContext
- **Debounced Validation**: Validación en tiempo real sin sobrecargar API
- **Progressive Enhancement**: Funcionalidad básica sin JavaScript

#### Monitoreo y Logging
- **Eventos de Registro**: Log de intentos exitosos/fallidos
- **Métricas de Conversión**: Tasa de completación por paso
- **Alertas**: Notificaciones para pagos fallidos o rechazos
- **Auditoría**: Log completo de cambios de estado
```
Flujo Cliente: /register → Cuenta activa inmediatamente
Flujo Propietario: /register-owner → /pending-approval → Pago → Aprobación Manual → Activo
```

#### Ventajas
- **Claridad**: Usuarios saben exactamente qué esperar
- **Seguridad**: Validación rigurosa para propietarios
- **Escalabilidad**: Fácil de mantener y extender
- **Experiencia UX**: Simple para clientes, guiado para propietarios

#### Desventajas
- **Complejidad de Desarrollo**: Más páginas y lógica
- **Mantenimiento**: Dos flujos separados requieren sincronización

### Opción 2: Selector de Tipo en Registro Único

#### Arquitectura Propuesta
```
Registro Unificado: /register
├── Selector: ¿Cliente o Propietario?
├── Campos dinámicos basados en selección
└── Flujo condicional post-registro
```

#### Ventajas
- **Simplicidad**: Una sola página de registro
- **Mantenimiento**: Menos código duplicado
- **Flexibilidad**: Fácil agregar nuevos tipos de usuario

#### Desventajas
- **Confusión**: Formulario complejo con campos condicionales
- **UX Subóptima**: Experiencia diferente para cada tipo
- **Validación Compleja**: Lógica condicional en frontend

## 🗄️ Cambios Requeridos en Base de Datos

### Modificaciones a Tablas Existentes

#### Tabla `businesses`
```sql
ALTER TABLE businesses
ADD COLUMN active BOOLEAN DEFAULT FALSE,
ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'pending';
```

#### Tabla `collaborators`
```sql
ALTER TABLE collaborators
ADD COLUMN status VARCHAR(20) DEFAULT 'pending'; -- 'pending', 'approved', 'rejected'
```

### Nueva Tabla `subscriptions`
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  plan_type VARCHAR(50) NOT NULL DEFAULT 'monthly',
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  paid_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Nueva Tabla `business_documents` (Opcional)
```sql
CREATE TABLE business_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  document_type VARCHAR(50) NOT NULL, -- 'license', 'id', 'photos', etc.
  file_url TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Cambios en Código Frontend

### 1. Nuevas Páginas Requeridas

#### `src/presentation/pages/auth/RegisterOwner.tsx`
```typescript
// Formulario extendido con campos adicionales
- fullName, email, password (comunes)
- businessName, businessAddress (específicos)
- phoneNumber (para verificación SMS)
- document uploads (licencia, identificación, fotos)
```

#### `src/presentation/pages/auth/PendingApproval.tsx`
```typescript
// Página de estado para propietarios pendientes
- Estado actual del proceso
- Instrucciones de pago
- Información de contacto de soporte
- Progreso visual del proceso de aprobación
```

### 2. Modificaciones al AuthContext

```typescript
interface AuthContextType {
  // ... existing methods
  signUpOwner: (
    email: string,
    password: string,
    fullName: string,
    businessName: string,
    businessAddress: string,
    phoneNumber: string
  ) => Promise<{ error: AuthError | null }>;

  checkApprovalStatus: (userId: string) => Promise<'pending' | 'approved' | 'rejected'>;

  uploadBusinessDocuments: (
    businessId: string,
    documents: File[]
  ) => Promise<{ error: string | null }>;
}
```

### 3. Nuevas Rutas

```typescript
// routes.tsx additions
{
  path: "/register-owner",
  element: <RegisterOwner />,
},
{
  path: "/owner/pending-approval",
  element: (
    <ProtectedRoute allowedRoles={["owner"]}>
      <PendingApproval />
    </ProtectedRoute>
  ),
},
{
  path: "/owner/setup-payment",
  element: (
    <ProtectedRoute allowedRoles={["owner"]}>
      <SetupPayment />
    </ProtectedRoute>
  ),
}
```

### 4. Componentes de UI Reutilizables

#### Selector de Tipo de Usuario
```typescript
// src/presentation/components/auth/UserTypeSelector.tsx
interface UserTypeSelectorProps {
  onSelect: (type: 'client' | 'owner') => void;
  selected?: 'client' | 'owner';
}

export default function UserTypeSelector({ onSelect, selected }: UserTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <button
        onClick={() => onSelect('client')}
        className={`p-6 border-2 rounded-xl transition-all ${
          selected === 'client'
            ? 'border-amber-400 bg-amber-50'
            : 'border-gray-200 hover:border-amber-400'
        }`}
      >
        <User className="w-8 h-8 mx-auto mb-2 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Cliente</h3>
        <p className="text-sm text-gray-500">Quiero pedir comida</p>
      </button>

      <button
        onClick={() => onSelect('owner')}
        className={`p-6 border-2 rounded-xl transition-all ${
          selected === 'owner'
            ? 'border-amber-400 bg-amber-50'
            : 'border-gray-400'
        }`}
      >
        <Store className="w-8 h-8 mx-auto mb-2 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Propietario</h3>
        <p className="text-sm text-gray-500">Tengo un restaurante</p>
      </button>
    </div>
  );
}
```

## 💳 Integración de Sistema de Pagos

### ¿Por qué Stripe? (Recomendado)

Stripe es la pasarela de pagos recomendada por las siguientes razones:

#### ✅ Ventajas Técnicas
- **SDK Nativo para React/TypeScript**: `@stripe/stripe-js` y `@stripe/react-stripe-js` con tipos completos
- **Documentación Excelente**: Guías detalladas, ejemplos de código, y API reference completa
- **Webhooks Robustos**: Sistema de webhooks confiable para eventos de pago en tiempo real
- **Sandbox Completo**: Entorno de pruebas idéntico al de producción para desarrollo

#### 🔒 Seguridad y Cumplimiento
- **PCI DSS Nivel 1**: Cumplimiento completo con estándares de seguridad de pagos
- **Protección contra Fraude**: Machine learning avanzado para detección de transacciones sospechosas
- **Tokenización**: Datos sensibles nunca tocan tu servidor
- **Certificaciones**: SOC 2 Type II, ISO 27001, y otras certificaciones de seguridad

#### 🌍 Cobertura Global
- **140+ Países**: Soporte para transacciones internacionales
- **25+ Monedas**: Procesamiento en múltiples divisas
- **Métodos de Pago Locales**: Soporte para transferencias bancarias, wallets locales, etc.
- **Localización**: Interfaz adaptada a regulaciones locales

#### 💰 Modelo de Precios Competitivo
- **2.9% + $0.30 por transacción** (tarjetas de crédito/débito US)
- **Sin Costos Ocultos**: Precios transparentes sin setup fees
- **Sin Contrato**: Cancelación en cualquier momento
- **Descuentos por Volumen**: Precios reducidos para altos volúmenes

#### 🛠️ Características para Suscripciones
- **Suscripciones Recurrentes**: Manejo automático de pagos mensuales
- **Pruebas Gratuitas**: Períodos de prueba configurables
- **Actualizaciones/Flexibilidad**: Cambios de plan en tiempo real
- **Facturación Automática**: Generación y envío automático de facturas

#### 📊 Integración con el Proyecto
- **Compatible con Clean Architecture**: Se integra perfectamente en la Infrastructure Layer
- **TypeScript Support**: Definiciones de tipos completas
- **React Hooks**: `useStripe()` y `useElements()` para manejo de estado
- **Error Handling**: Manejo granular de errores con mensajes localizados

#### 🔄 Comparación con Alternativas

| Característica | Stripe | PayPal | MercadoPago | Local PSP |
|----------------|--------|--------|-------------|-----------|
| Facilidad de Integración | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Documentación | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Costos | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Seguridad | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Soporte Global | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ |
| Suscripciones | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

#### ⚠️ Consideraciones para Latinoamérica
- **Monedas Soportadas**: USD, ARS, BRL, CLP, COP, MXN, PEN, etc.
- **Métodos Locales**: Transferencias bancarias, PIX (Brasil), SPEI (México)
- **Cumplimiento Local**: Manejo de regulaciones específicas por país
- **Soporte en Español**: Documentación y soporte técnico disponible

### Stripe Integration (Recomendado)

#### Configuración Inicial
```typescript
// src/core/payments/stripe.ts
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export const createSubscription = async (
  businessId: string,
  priceId: string
): Promise<{ clientSecret: string | null; error: string | null }> => {
  try {
    const response = await fetch('/api/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, priceId }),
    });

    if (!response.ok) throw new Error('Failed to create subscription');

    const { clientSecret } = await response.json();
    return { clientSecret, error: null };
  } catch (error) {
    return { clientSecret: null, error: error.message };
  }
};
```

#### Webhook Handler (Backend - Supabase Edge Function)
```typescript
export async function handlePaymentSuccess(event: StripeEvent) {
  const { business_id } = event.data.object.metadata;

  // Actualizar estado de suscripción
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      paid_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
    })
    .eq('business_id', business_id);

  // Notificar al administrador para aprobación
  await sendAdminNotification(business_id, 'payment_completed');
}
```

## 🔐 Sistema de Aprobación Manual

### Panel de Administración Básico

#### `src/presentation/pages/admin/BusinessApprovals.tsx`
```typescript
export default function BusinessApprovals() {
  const [pendingBusinesses, setPendingBusinesses] = useState([]);

  const handleApproval = async (businessId: string, approved: boolean) => {
    try {
      if (approved) {
        await supabase
          .from('businesses')
          .update({ active: true })
          .eq('id', businessId);

        await supabase
          .from('collaborators')
          .update({ status: 'approved' })
          .eq('business_id', businessId);
      } else {
        await supabase
          .from('collaborators')
          .update({ status: 'rejected' })
          .eq('business_id', businessId);
      }

      // Actualizar lista local
      setPendingBusinesses(prev =>
        prev.filter(business => business.id !== businessId)
      );

      // Enviar notificación al propietario
      await sendNotification(businessId, approved);

    } catch (error) {
      console.error('Error updating business status:', error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Aprobaciones Pendientes</h1>

      <div className="space-y-4">
        {pendingBusinesses.map(business => (
          <div key={business.id} className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold">{business.name}</h3>
            <p className="text-gray-600">{business.address}</p>
            <p className="text-sm text-gray-500">Propietario: {business.owner_name}</p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleApproval(business.id, true)}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Aprobar
              </button>
              <button
                onClick={() => handleApproval(business.id, false)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 📱 Experiencia de Usuario Detallada

### Flujo de Cliente
1. **Acceso**: Usuario visita `/register`
2. **Registro**: Completa formulario básico (email, password, nombre)
3. **Activación**: Cuenta activa inmediatamente
4. **Acceso**: Redirección automática a aplicación completa

### Flujo de Propietario
1. **Acceso**: Usuario visita `/register` y selecciona "Propietario"
2. **Registro**: Completa formulario extendido con datos del negocio
3. **Documentos**: Upload de licencia, identificación, fotos del local
4. **Verificación**: Email/SMS verification
5. **Estado Pendiente**: Redirección a página de espera
6. **Pago**: Instrucciones para pago de cuota mensual
7. **Procesamiento**: Webhook actualiza estado de pago
8. **Aprobación**: Administrador revisa y aprueba manualmente
9. **Activación**: Notificación por email, acceso completo al panel

## 🧪 Estrategia de Testing

### Testing por Capas

#### Unit Tests
- `AuthContext.signUpOwner()` - Validación de parámetros
- `UserTypeSelector` - Interacciones de usuario
- Componentes de formulario - Validación de campos

#### Integration Tests
- Flujo completo de registro de propietario
- Integración con Stripe
- Webhook processing

#### E2E Tests
- Registro cliente → activación inmediata
- Registro propietario → pago → aprobación → activación
- Manejo de errores en cada paso

### Casos de Prueba Críticos

#### Registro Cliente
- ✅ Formulario válido → cuenta activa
- ❌ Email duplicado → error claro
- ❌ Contraseña débil → validación en tiempo real

#### Registro Propietario
- ✅ Formulario completo → estado pendiente
- ✅ Pago exitoso → notificación admin
- ❌ Pago fallido → retry con diferentes métodos
- ✅ Aprobación admin → activación completa
- ❌ Rechazo admin → email explicativo

## 🚀 Plan de Implementación por Fases

### Fase 1: Estructura Base (Semanas 1-2)
- [ ] Crear páginas RegisterOwner y PendingApproval
- [ ] Modificar AuthContext para signUpOwner
- [ ] Actualizar rutas y navegación
- [ ] Testing básico de componentes

### Fase 2: Base de Datos y Pagos (Semanas 3-4)
- [ ] Crear tabla subscriptions
- [ ] Modificar tablas existentes
- [ ] Integrar Stripe básico
- [ ] Implementar webhooks

### Fase 3: Sistema de Aprobación (Semanas 5-6)
- [ ] Crear panel de admin básico
- [ ] Implementar lógica de aprobación
- [ ] Sistema de notificaciones
- [ ] Testing de flujos completos

### Fase 4: Validación y Seguridad (Semanas 7-8)
- [ ] Upload de documentos
- [ ] Verificación email/SMS
- [ ] Rate limiting y CAPTCHA
- [ ] Testing de seguridad

### Fase 5: Optimización y Monitoreo (Semanas 9-10)
- [ ] Dashboard de métricas
- [ ] Optimización de UX
- [ ] Logging y monitoreo
- [ ] Testing de performance

## 📊 Métricas de Éxito

### KPIs Principales
- **Tasa de Conversión Cliente**: >85% (registro → cuenta activa)
- **Tasa de Conversión Propietario**: >60% (registro → cuenta activa)
- **Tiempo de Aprobación**: <24 horas promedio
- **Tasa de Pago Exitoso**: >90%

### Métricas de Calidad
- **Rechazo de Fraude**: >95% de intentos maliciosos bloqueados
- **Satisfacción de Usuario**: >4.5/5 en encuestas
- **Tiempo de Carga**: <2 segundos para páginas de registro

## 💰 Estimación de Costos

### Desarrollo (10 semanas)
- **Desarrollador Senior**: $8,000/semana × 10 = $80,000
- **Diseñador UX**: $4,000/semana × 4 = $16,000
- **QA Engineer**: $5,000/semana × 6 = $30,000
- **Total Desarrollo**: $126,000

### Infraestructura y Servicios
- **Stripe**: $0.30/transacción × 1,000 registros/mes = $300/mes
- **SMS Verification**: $0.05/mensaje × 500 = $25/mes
- **Email Service**: $20/mes
- **File Storage**: $5/mes
- **Total Servicios**: $350/mes

### Costos Operativos
- **Administrador de Aprobaciones**: $2,000/mes
- **Soporte al Cliente**: $3,000/mes
- **Total Operativo**: $5,000/mes

## 🔮 Recomendaciones Finales

### Implementación Recomendada
1. **Comenzar con Opción 1**: Flujos separados para claridad y seguridad
2. **Priorizar UX**: Experiencia simple para clientes, guiada para propietarios
3. **Implementar por Fases**: Comenzar con funcionalidad core, agregar validaciones posteriormente
4. **Monitorear Métricas**: Ajustar basado en datos reales de conversión

### Consideraciones Técnicas
- **Escalabilidad**: Diseño preparado para múltiples tipos de usuario futuros
- **Seguridad**: Validación en múltiples capas para prevenir fraude
- **Mantenibilidad**: Código modular y bien documentado
- **Performance**: Optimización de carga y caching

### Próximos Pasos
1. **Revisión de Requisitos**: Validar con stakeholders
2. **Prototipado**: Crear mockups de las nuevas páginas
3. **Estimación Detallada**: Refinar costos y timeline
4. **Inicio de Desarrollo**: Comenzar con Fase 1

---

**Fecha**: Enero 2025
**Versión**: 1.0.0
**Estado**: Documento de Análisis y Recomendaciones