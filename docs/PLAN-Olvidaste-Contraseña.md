# Plan de Implementación: Funcionalidad "Olvidaste tu Contraseña"

**Fecha:** 20 de Marzo de 2026  
**Estado:** Propuesto - Pendiente de Implementación  
**Prioridad:** Media  

---

## Resumen Ejecutivo

La funcionalidad de recuperación de contraseña **no está completamente implementada**. Aunque existe el enlace "¿Olvidaste tu contraseña?" en la página de Login (que apunta a `/forgot-password`), no existen:
- La página de solicitud de recuperación
- La página de establecimiento de nueva contraseña
- Las rutas correspondientes
- Los métodos en AuthContext

**Supabase ya está configurado** y tiene la infraestructura necesaria para enviar emails de recuperación.

---

## Estado Actual del Sistema

### Lo que existe ✅

| Componente | Estado | Ubicación |
|------------|--------|-----------|
| Enlace "Olvidaste tu contraseña" | ✅ Existe | `Login.tsx:217-225` |
| Cliente Supabase configurado | ✅ Configurado | `src/core/supabase/client.ts` |
| `detectSessionInUrl` habilitado | ✅ Activo | Necesario para reset token |
| Infraestructura AuthContext | ✅ Existe | `src/core/context/AuthContext.tsx` |

### Lo que falta ❌

| Componente | Estado | Notas |
|------------|--------|-------|
| Página ForgotPassword | ❌ Falta | Solicitar email de recuperación |
| Página ResetPassword | ❌ Falta | Establecer nueva contraseña |
| Rutas `/forgot-password` y `/reset-password` | ❌ Falta | Definir en `routes.tsx` |
| Método `forgotPassword` en AuthContext | ❌ Falta | Enviar email de reset |
| Método `updatePassword` en AuthContext | ❌ Falta | Actualizar contraseña |
| Configuración Site URL en Supabase | ❌ Falta | Requerido para emails |
| Plantilla de email personalizada | ⚠️ Opcional | Usar default de Supabase |

---

## Arquitectura del Flujo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FLUJO DE RECUPERACIÓN                         │
└─────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────────────┐     ┌─────────────────────────┐
  │  Login   │────▶│  ForgotPassword  │────▶│  Email Enviado          │
  │  Page    │     │  Page            │     │  (bandeja del usuario)   │
  └──────────┘     └──────────────────┘     └───────────┬─────────────┘
       │                    │                          │
       │ "Olvidaste         │ Ingresa email            │ Link en email
       │  tu contraseña"    │ Solicita reset           │ with token
       ▼                    ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   Supabase Auth                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ 1. generateResetToken(email)                                    │   │
│   │ 2. Envía email con enlace:                                      │   │
│   │    frontend.com/reset-password?token=xxx&email=yyy               │   │
│   │ 3. Token expira en 60 minutos                                    │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     ResetPassword Page                                  │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ 1. Lee token y email de URL                                     │   │
│   │ 2. Muestra formulario: Nueva contraseña + Confirmar              │   │
│   │ 3. Llama updateUser({ password: newPassword })                  │   │
│   │ 4. Redirige a Login con mensaje de éxito                        │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Parte 1: Configuración de Supabase Dashboard

### 1.1 URL Configuration

**Ubicación:** Supabase Dashboard > Authentication > URL Configuration

**Configurar:**

| Campo | Valor | Notas |
|-------|-------|-------|
| **Site URL** | `http://localhost:5173` | Para desarrollo |
| **Site URL (Producción)** | `https://tu-dominio.com` | Para producción |
| **Redirect URLs** | `http://localhost:5173/*` | Permite wildcard para desarrollo |
| **Redirect URLs (Producción)** | `https://tu-dominio.com/*` | Para producción |

**Pasos:**
1. Ir a Supabase Dashboard
2. Authentication > URL Configuration
3. En "Redirect URLs" agregar:
   ```
   http://localhost:5173/reset-password
   https://tu-dominio.com/reset-password
   ```

### 1.2 Email Templates (Opcional pero Recomendado)

**Ubicación:** Supabase Dashboard > Authentication > Email Templates

**Template de Reset Password (Español):**

```
Asunto: Restablece tu contraseña - Delizza

---

Hola,

Recibimos una solicitud para restablecer la contraseña de tu cuenta en Delizza.

Haz clic en el siguiente botón para crear una nueva contraseña:

<a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Restablecer contraseña</a>

Si no solicitaste este correo, puedes ignorarlo de manera segura. Este enlace expira en 60 minutos.

¡Nos vemos pronto!

El equipo de Delizza

---

Este es un correo automático. Por favor no respondas a este mensaje.
```

**Variables disponibles:**
- `{{ .ConfirmationURL }}` - URL completa con token
- `{{ .Token }}` - Solo el token
- `{{ .Email }}` - Email del usuario

### 1.3 Configuración de Email (si no está configurado)

**Ubicación:** Supabase Dashboard > Authentication > Providers > Email

**Verificar que esté habilitado:**
- [x] Enable Email provider
- [ ] Disable Sign Up (mantenerlo desmarcado para permitir nuevos registros)
- [x] Allow manual linking (opcional)

---

## Parte 2: Frontend - AuthContext

### 2.1 Métodos a Agregar

**Archivo:** `src/core/context/AuthContext.tsx`

**Método `forgotPassword`:**
```typescript
/**
 * Envía un email de recuperación de contraseña al usuario
 */
forgotPassword: async (email: string): Promise<{ error: AuthError | null }> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { error };
}
```

**Método `updatePassword`:**
```typescript
/**
 * Actualiza la contraseña del usuario (después de reset)
 */
updatePassword: async (newPassword: string): Promise<{ error: AuthError | null }> => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { error };
}
```

### 2.2 Interfaz Actualizada

```typescript
interface AuthContextType {
  // ... métodos existentes
  forgotPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
}
```

---

## Parte 3: Frontend - Nuevas Páginas

### 3.1 Página ForgotPassword

**Archivo:** `src/presentation/pages/auth/ForgotPassword.tsx`

**Funcionalidades:**
- Input para email
- Validación de formato de email
- Llamada a `forgotPassword` del AuthContext
- Mensaje de éxito/error
- Enlace a Login

**Esquema del componente:**
```tsx
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await forgotPassword(email);

    if (error) {
      setError(error.message);
    } else {
      setIsSuccess(true);
    }
    setIsLoading(false);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Revisa tu correo
            </h2>
            <p className="text-gray-600 mb-6">
              Te enviamos un enlace para restablecer tu contraseña a <strong>{email}</strong>.
              Revisa tu bandeja de entrada y sigue las instrucciones.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="text-amber-500 hover:text-amber-600 font-medium"
            >
              Volver a iniciar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ... formulario de solicitud
}
```

### 3.2 Página ResetPassword

**Archivo:** `src/presentation/pages/auth/ResetPassword.tsx`

**Funcionalidades:**
- Lee token y email de URL (`?token=xxx&email=yyy`)
- Muestra formulario: Nueva contraseña + Confirmar
- Validaciones: min 8 caracteres, contraseñas coincidentes
- Llama a `updatePassword` del AuthContext
- Redirige a Login tras éxito

**Esquema del componente:**
```tsx
export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  // Obtener token y email de URL
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error } = await updatePassword(password);

    if (error) {
      setError(error.message);
    } else {
      setIsSuccess(true);
      // Redirigir después de 3 segundos
      setTimeout(() => navigate("/login"), 3000);
    }
    setIsLoading(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Enlace de restablecimiento inválido o expirado.</p>
        <Link to="/forgot-password">Solicitar nuevo enlace</Link>
      </div>
    );
  }

  // ... formulario
}
```

---

## Parte 4: Rutas

### 4.1 Agregar Rutas

**Archivo:** `src/core/router/routes.tsx`

**Importaciones a agregar:**
```typescript
import { ForgotPassword, ResetPassword } from "@presentation/pages/auth";
```

**Rutas a agregar:**
```typescript
{
  path: "/forgot-password",
  element: <ForgotPassword />,
},
{
  path: "/reset-password",
  element: <ResetPassword />,
},
```

### 4.2 Actualizar Exports

**Archivo:** `src/presentation/pages/auth/index.ts`

```typescript
export { default as Login } from "./Login";
export { default as Register } from "./Register";
export { default as RegisterOwner } from "./RegisterOwner";
export { default as PendingApproval } from "./PendingApproval";
export { default as ForgotPassword } from "./ForgotPassword";     // NUEVO
export { default as ResetPassword } from "./ResetPassword";       // NUEVO
```

---

## Lista Completa de Archivos

### Archivos a Modificar

| # | Archivo | Cambios |
|---|---------|---------|
| 1 | `src/core/context/AuthContext.tsx` | Agregar `forgotPassword` y `updatePassword` |
| 2 | `src/core/router/routes.tsx` | Agregar rutas `/forgot-password` y `/reset-password` |
| 3 | `src/presentation/pages/auth/index.ts` | Exportar nuevos componentes |

### Archivos a Crear

| # | Archivo | Propósito |
|---|---------|-----------|
| 1 | `src/presentation/pages/auth/ForgotPassword.tsx` | Página de solicitud de reset |
| 2 | `src/presentation/pages/auth/ResetPassword.tsx` | Página de nueva contraseña |

---

## Configuración de Supabase Dashboard (Lista de Verificación)

```
□ Authentication > URL Configuration > Site URL
  └─ http://localhost:5173 (desarrollo)
  └─ https://tu-dominio.com (producción)

□ Authentication > URL Configuration > Redirect URLs
  └─ http://localhost:5173/*
  └─ https://tu-dominio.com/*

□ Authentication > Email Templates > Reset password (opcional)
  └─ Personalizar template en español
```

---

## Orden de Implementación

```
1. Configurar Supabase Dashboard
   │
   ├─□ Site URL
   ├─□ Redirect URLs
   └─□ Email template (opcional)
        │
        ▼
2. Modificar AuthContext
   │
   ├─□ Agregar forgotPassword()
   └─□ Agregar updatePassword()
        │
        ▼
3. Crear ForgotPassword.tsx
   │
   └─□ Formulario de solicitud
        │
        ▼
4. Crear ResetPassword.tsx
   │
   └─□ Formulario de nueva contraseña
        │
        ▼
5. Agregar Rutas
   │
   ├─□ routes.tsx
   └─□ auth/index.ts
        │
        ▼
6. Pruebas
   │
   ├─□ Probar flujo completo
   ├─□ Verificar emails
   └─□ Verificar expiración de token
```

---

## Pruebas de Verificación

### Checklist de pruebas:

| # | Escenario | Resultado Esperado |
|---|-----------|-------------------|
| 1 | Click en "¿Olvidaste tu contraseña?" | Redirige a `/forgot-password` |
| 2 | Ingresar email válido y enviar | Muestra mensaje de éxito |
| 3 | Recibir email de Supabase | Contiene enlace con token |
| 4 | Click en enlace del email | Abre `/reset-password?token=xxx&email=yyy` |
| 5 | Ingresar nueva contraseña | Muestra mensaje de éxito |
| 6 | Usar token expirado | Muestra error de token inválido |
| 7 | Usar token ya usado | Muestra error de token inválido |
| 8 | Contraseñas no coinciden | Muestra error de validación |

---

## Consideraciones de Seguridad

| Aspecto | Implementación |
|---------|----------------|
| Expiración de token | 60 minutos (default de Supabase) |
| Token de un solo uso | Supabase lo maneja automáticamente |
| Rate limiting | Supabase limita intentos de reset |
| HTTPS | Requerido en producción para seguridad |
| Validación de email | Verificar formato antes de enviar |

---

## Estados de Error Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "Invalid token" | Token expirado o ya usado | Solicitar nuevo enlace |
| "Email not found" | Email no registrado | Mostrar mismo mensaje (seguridad) |
| "Redirect URL mismatch" | URL no autorizada en Supabase | Agregar URL en dashboard |
| Email no llega | Filtros de spam / email incorrecto | Verificar bandeja, revisar spam |

---

## Variables de Entorno Necesarias

**Archivo:** `.env` (ya configurado)

```bash
VITE_SUPABASE_URL="https://czaiyunauxgfvdmvqxsw.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

**Nota:** La funcionalidad de reset password solo requiere las variables existentes. No se necesitan nuevas variables de entorno.

---

## Métricas de Éxito

| Métrica | Antes | Después |
|---------|-------|---------|
| Usuarios que pueden recuperar contraseña | 0% | 100% |
| Página de recuperación | No existe | Funcional |
| Seguridad de contraseña | Manual | Forzada (min 8 chars) |

---

*Documento generado para planificación de implementación*
