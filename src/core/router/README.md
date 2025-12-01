# React Router v7 Configuration

Este proyecto utiliza **React Router v7.9.6** con las siguientes características:

## 📁 Estructura de Archivos

```
src/
├── core/
│   └── router/
│       ├── routes.tsx       # Configuración de rutas
│       └── index.ts         # Exportaciones
├── presentation/
│   ├── layouts/
│   │   └── RootLayout.tsx   # Layout principal con Outlet
│   └── pages/
│       ├── Home.tsx         # Página principal
│       ├── About.tsx        # Página de ejemplo
│       └── NotFound.tsx     # Página 404
└── main.tsx                 # Punto de entrada con RouterProvider
```

## 🚀 Características de React Router v7

### 1. **createBrowserRouter**

En lugar de usar `<BrowserRouter>`, React Router v7 utiliza el patrón de data router con `createBrowserRouter`:

```tsx
const router = createBrowserRouter(routes);
```

### 2. **RouterProvider**

El router se proporciona a la aplicación mediante el componente `RouterProvider`:

```tsx
<RouterProvider router={router} />
```

### 3. **Rutas Anidadas**

Las rutas se definen como objetos con soporte para anidación:

```tsx
{
  path: "/",
  element: <RootLayout />,
  children: [
    { index: true, element: <Home /> },
    { path: "about", element: <About /> }
  ]
}
```

### 4. **Outlet Component**

Los layouts usan `<Outlet />` para renderizar rutas hijas:

```tsx
export default function RootLayout() {
  return (
    <div>
      <Outlet />
    </div>
  );
}
```

## 🔗 Navegación

### Link Component

Para navegación declarativa, usa el componente `Link`:

```tsx
import { Link } from "react-router";

<Link to="/about">About</Link>;
```

### useNavigate Hook

Para navegación programática:

```tsx
import { useNavigate } from "react-router";

const navigate = useNavigate();
navigate("/about");
```

## 📝 Cómo Agregar Nuevas Rutas

1. **Crear el componente de la página** en `src/presentation/pages/`:

```tsx
// src/presentation/pages/Contact.tsx
export default function Contact() {
  return <h1>Contact Page</h1>;
}
```

2. **Agregar la ruta** en `src/core/router/routes.tsx`:

```tsx
import Contact from "@presentation/pages/Contact";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    children: [
      // ... otras rutas
      {
        path: "contact",
        element: <Contact />,
      },
    ],
  },
];
```

## 🎯 Rutas Dinámicas

Para rutas con parámetros:

```tsx
{
  path: "users/:userId",
  element: <UserProfile />,
}
```

Acceder a los parámetros en el componente:

```tsx
import { useParams } from "react-router";

export default function UserProfile() {
  const { userId } = useParams();
  return <h1>User ID: {userId}</h1>;
}
```

## 🔒 Rutas Protegidas

Para crear rutas protegidas, puedes usar un componente wrapper:

```tsx
// src/core/router/ProtectedRoute.tsx
import { Navigate } from "react-router";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = false; // Tu lógica de autenticación

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

Luego en tus rutas:

```tsx
{
  path: "dashboard",
  element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
}
```

## 📚 Hooks Disponibles

- `useNavigate()` - Navegación programática
- `useParams()` - Acceder a parámetros de URL
- `useSearchParams()` - Manejar query strings
- `useLocation()` - Información sobre la ubicación actual
- `useMatch()` - Verificar si una ruta coincide

## 🎨 Diferencias con React Router v6

1. **Data Router Pattern**: Uso de `createBrowserRouter` en lugar de `<BrowserRouter>`
2. **RouterProvider**: Nuevo componente para proveer el router
3. **Mejor TypeScript Support**: Tipos más robustos
4. **Mejoras en Performance**: Optimizaciones internas

## 📖 Recursos

- [React Router v7 Docs](https://reactrouter.com/)
- [Migration Guide](https://reactrouter.com/en/main/upgrading/v6)
