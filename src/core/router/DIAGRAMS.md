# 🗺️ Estructura de Rutas - React Router v7

## Diagrama de Rutas

```mermaid
graph TD
    A[RouterProvider] --> B[RootLayout]
    B --> C[Outlet]

    C --> D[Home /]
    C --> E[About /about]
    C --> F[UserProfile /user/:userId]
    C --> G[Products /products]
    C --> H[NotFound /*]

    D --> D1[Navigation Links]
    D --> D2[PWA Badge]

    F --> F1[useParams Hook]
    F --> F2[Navigate Back Button]

    G --> G1[useLoaderData Hook]
    G --> G2[productsLoader]

    H --> H1[404 Message]
    H --> H2[Link to Home]

    style A fill:#4CAF50
    style B fill:#2196F3
    style C fill:#FF9800
    style D fill:#9C27B0
    style E fill:#9C27B0
    style F fill:#9C27B0
    style G fill:#9C27B0
    style H fill:#F44336
```

## Flujo de Navegación

```mermaid
sequenceDiagram
    participant User
    participant Router
    participant Loader
    participant Component

    User->>Router: Click Link to /products
    Router->>Loader: Execute productsLoader()
    Loader->>Loader: Fetch data (500ms delay)
    Loader-->>Router: Return products data
    Router->>Component: Render Products with data
    Component->>User: Display products list
```

## Estructura de Archivos

```
src/
├── main.tsx
│   └── createBrowserRouter(routes)
│       └── RouterProvider
│
├── core/
│   └── router/
│       ├── routes.tsx
│       │   └── RouteObject[]
│       │       ├── path: "/"
│       │       ├── element: <RootLayout />
│       │       └── children: [...]
│       │
│       ├── loaders/
│       │   └── productsLoader.ts
│       │       └── async function
│       │
│       └── index.ts
│           └── export { routes }
│
└── presentation/
    ├── layouts/
    │   └── RootLayout.tsx
    │       └── <Outlet />
    │
    └── pages/
        ├── Home.tsx
        │   └── <Link> components
        ├── About.tsx
        ├── UserProfile.tsx
        │   ├── useParams()
        │   └── useNavigate()
        ├── Products.tsx
        │   └── useLoaderData()
        └── NotFound.tsx
```

## Hooks Utilizados

```mermaid
graph LR
    A[React Router Hooks] --> B[useParams]
    A --> C[useNavigate]
    A --> D[useLoaderData]
    A --> E[useLocation]
    A --> F[useSearchParams]

    B --> B1[UserProfile.tsx]
    C --> C1[UserProfile.tsx]
    D --> D1[Products.tsx]

    style A fill:#4CAF50
    style B fill:#2196F3
    style C fill:#2196F3
    style D fill:#2196F3
    style E fill:#9E9E9E
    style F fill:#9E9E9E
```

## Ciclo de Vida de una Ruta con Loader

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading: User clicks link
    Loading --> FetchingData: Router calls loader
    FetchingData --> RenderingComponent: Data received
    RenderingComponent --> Displayed: Component mounted
    Displayed --> [*]: Navigation complete

    FetchingData --> Error: Loader fails
    Error --> ErrorBoundary: Show error
    ErrorBoundary --> [*]
```

## Comparación: Antes vs Después

### Antes (Sin Router)

```
main.tsx
  └── <Home />
```

### Después (Con React Router v7)

```
main.tsx
  └── <RouterProvider>
        └── <RootLayout>
              └── <Outlet>
                    ├── <Home />
                    ├── <About />
                    ├── <UserProfile />
                    ├── <Products />
                    └── <NotFound />
```

## Patrones de Rutas

### 1. Ruta Estática

```
/about → <About />
```

### 2. Ruta Dinámica

```
/user/:userId → <UserProfile />
  ├── /user/123
  ├── /user/456
  └── /user/abc
```

### 3. Ruta con Loader

```
/products → loader() → <Products />
```

### 4. Ruta Catch-All

```
/* → <NotFound />
```

## Arquitectura de Capas

```mermaid
graph TB
    subgraph "Presentation Layer"
        A[Pages]
        B[Layouts]
    end

    subgraph "Core Layer"
        C[Router Config]
        D[Loaders]
        E[Actions]
    end

    subgraph "Infrastructure Layer"
        F[API Calls]
        G[Services]
    end

    A --> C
    B --> C
    C --> D
    C --> E
    D --> F
    E --> F
    F --> G

    style A fill:#9C27B0
    style B fill:#9C27B0
    style C fill:#2196F3
    style D fill:#2196F3
    style E fill:#2196F3
    style F fill:#4CAF50
    style G fill:#4CAF50
```

---

**Leyenda de Colores**:

- 🟢 Verde: Router/Provider
- 🔵 Azul: Layouts/Core
- 🟣 Morado: Pages/Components
- 🟠 Naranja: Outlet
- 🔴 Rojo: Error/404
