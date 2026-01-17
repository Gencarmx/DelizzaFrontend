# Folder Structure Documentation

## 📁 Complete Project Structure

```
DelizzaFrontend/
├── public/                          # Static assets served directly
├── src/                             # Source code
│   ├── assets/                      # Application assets
│   ├── components/                  # Reusable UI components
│   ├── core/                        # Business logic and configuration
│   ├── presentation/                # UI layer (pages, layouts, styles)
│   ├── main.tsx                     # Application entry point
│   └── vite-env.d.ts               # Vite environment types
├── docs/                            # Project documentation
├── .gitignore                       # Git ignore rules
├── bun.lock                         # Bun lock file
├── eslint.config.js                 # ESLint configuration
├── index.html                       # HTML entry point
├── package.json                     # Dependencies and scripts
├── pwa-assets.config.ts            # PWA assets configuration
├── README.md                        # Project overview
├── tsconfig.json                    # TypeScript base config
├── tsconfig.app.json               # TypeScript app config
├── tsconfig.node.json              # TypeScript node config
└── vite.config.ts                  # Vite configuration
```

## 📂 Detailed Folder Responsibilities

### `/public` - Static Assets

**Purpose**: Contains static files served directly without processing.

**Contents**:
```
public/
├── apple-touch-icon-180x180.png    # iOS home screen icon
├── dlizza-64x64.png                # App icon 64x64
├── dlizza-192x192.png              # App icon 192x192
├── dlizza-512x512.png              # App icon 512x512
├── maskable-icon-512x512.png       # Maskable PWA icon
├── pwa-64x64.png                   # PWA icon 64x64
├── pwa-192x192.png                 # PWA icon 192x192
├── pwa-512x512.png                 # PWA icon 512x512
├── favicon.ico                      # Browser favicon
└── favicon.svg                      # SVG favicon
```

**Responsibilities**:
- Serve PWA icons in multiple sizes
- Provide favicons for browsers
- Store manifest-referenced assets
- No build processing required

**Access**: Files are accessible at `/filename.ext` in production.

---

### `/src` - Source Code Root

**Purpose**: Contains all application source code.

**Key Files**:
- `main.tsx` - Application entry point, renders root component
- `vite-env.d.ts` - TypeScript definitions for Vite environment variables

---

### `/src/assets` - Application Assets

**Purpose**: Contains images, fonts, and other assets that need build processing.

**Structure**:
```
assets/
└── images/
    └── react.svg                    # React logo (example)
```

**Responsibilities**:
- Store images used in components
- Store fonts and other media
- Assets are processed by Vite (optimization, hashing)

**Usage**:
```typescript
import logo from "@assets/images/react.svg";
<img src={logo} alt="Logo" />
```

**Path Alias**: `@assets` → `./src/assets`

---

### `/src/components` - Reusable UI Components

**Purpose**: Houses the Restaurant Admin UI component library and shared components.

**Structure**:
```
components/
└── restaurant-ui/                   # Restaurant admin UI library
    ├── index.ts                     # Barrel exports
    ├── badges/                      # Status badges
    │   └── StatusBadge/
    │       ├── index.ts
    │       └── StatusBadge.tsx
    ├── buttons/                     # Button components
    │   └── Button/
    │       ├── index.ts
    │       └── Button.tsx
    ├── cards/                       # Card components
    │   └── MetricCard/
    │       ├── index.ts
    │       └── MetricCard.tsx
    ├── charts/                      # Chart components
    │   ├── index.ts
    │   ├── ProductsBarChart/
    │   │   ├── index.ts
    │   │   └── ProductsBarChart.tsx
    │   └── SalesLineChart/
    │       ├── index.ts
    │       └── SalesLineChart.tsx
    ├── dropdowns/                   # Dropdown menus
    │   └── ActionDropdown/
    │       ├── index.ts
    │       └── ActionDropdown.tsx
    ├── forms/                       # Form inputs
    │   ├── Input/
    │   │   ├── index.ts
    │   │   └── Input.tsx
    │   ├── Select/
    │   │   ├── index.ts
    │   │   └── Select.tsx
    │   └── Textarea/
    │       ├── index.ts
    │       └── Textarea.tsx
    ├── modals/                      # Modal dialogs
    │   └── ConfirmModal/
    │       ├── index.ts
    │       └── ConfirmModal.tsx
    └── tables/                      # Data tables
        └── DataTable/
            ├── index.ts
            └── DataTable.tsx
```

**Responsibilities**:
- Provide reusable UI components for restaurant admin interface
- Implement consistent design system
- Export components via barrel pattern
- Maintain component isolation and reusability

**Component Organization Pattern**:
```
ComponentName/
├── index.ts              # Barrel export
└── ComponentName.tsx     # Component implementation
```

**Usage**:
```typescript
import { Button, Input, DataTable } from "@components/restaurant-ui";
```

**Path Alias**: `@components` → `./src/components`

---

### `/src/core` - Business Logic Layer

**Purpose**: Contains business logic, configuration, and core application concerns.

**Structure**:
```
core/
├── context/                         # React Context providers
│   ├── index.ts                     # Barrel exports
│   ├── AuthContext.tsx              # Authentication state
│   └── CartContext.tsx              # Shopping cart state
├── router/                          # Routing configuration
│   ├── index.ts                     # Barrel exports
│   ├── routes.tsx                   # Route definitions
│   ├── README.md                    # Router documentation
│   ├── DIAGRAMS.md                  # Route diagrams
│   └── loaders/                     # Route data loaders
│       └── productsLoader.ts        # Products data loader
└── supabase/                        # Supabase configuration
    ├── client.ts                    # Supabase client instance
    └── types.ts                     # Database types
```

#### `/src/core/context` - State Management

**Responsibilities**:
- Define global application state
- Provide context providers
- Implement state management logic
- Handle side effects (localStorage, API calls)

**Key Files**:

**`AuthContext.tsx`**:
- User authentication state
- Sign in/sign up/sign out methods
- Session management
- Supabase auth integration

**`CartContext.tsx`**:
- Shopping cart items
- Cart operations (add, remove, update)
- Delivery options
- Price calculations
- localStorage persistence

**Usage**:
```typescript
// In main.tsx
<AuthProvider>
  <CartProvider>
    <App />
  </CartProvider>
</AuthProvider>

// In components
const { user, signIn } = useAuth();
const { items, addToCart } = useCart();
```

#### `/src/core/router` - Routing Configuration

**Responsibilities**:
- Define application routes
- Configure nested routes
- Set up route loaders
- Manage navigation structure

**Key Files**:

**`routes.tsx`**:
- Route definitions using React Router v7
- Nested route configuration
- Layout assignments
- Route loaders

**`loaders/productsLoader.ts`**:
- Data fetching for products route
- Pre-load data before rendering
- Type-safe data loading

**Route Structure**:
```typescript
routes = [
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "cart", element: <Cart /> },
      // ... more customer routes
    ]
  },
  {
    path: "/restaurant",
    element: <RestaurantLayout />,
    children: [
      { path: "dashboard", element: <Dashboard /> },
      { path: "products", element: <ProductList /> },
      // ... more admin routes
    ]
  }
]
```

#### `/src/core/supabase` - Backend Configuration

**Responsibilities**:
- Configure Supabase client
- Define database types
- Provide type-safe database access

**Key Files**:

**`client.ts`**:
- Initialize Supabase client
- Configure authentication
- Export client instance

**`types.ts`**:
- Auto-generated database types
- Type-safe database queries
- Generated via `npm run gen-types`

**Path Alias**: `@core` → `./src/core`

---

### `/src/presentation` - Presentation Layer

**Purpose**: Contains all UI-related code including pages, layouts, and styles.

**Structure**:
```
presentation/
├── components/                      # Feature-specific components
│   ├── common/                      # Common components
│   │   ├── ProductModal/
│   │   │   ├── index.ts
│   │   │   └── ProductModal.tsx
│   │   └── PWABadge/
│   │       ├── index.ts
│   │       └── PWABadge.tsx
│   └── layout/                      # Layout components
│       ├── BottomNav.tsx            # Customer bottom navigation
│       ├── Header.tsx               # Customer header
│       ├── MainLayout.tsx           # Customer main layout
│       └── RestaurantBottomNav.tsx  # Restaurant bottom navigation
├── layouts/                         # Route layouts
│   ├── RestaurantLayout.tsx         # Restaurant admin layout
│   └── RootLayout.tsx               # Customer app layout
├── pages/                           # Page components
│   ├── index.ts                     # Barrel exports
│   ├── About.tsx                    # About page
│   ├── Account.tsx                  # User account page
│   ├── Activity.tsx                 # Order activity page
│   ├── Cart.tsx                     # Shopping cart page
│   ├── EditProfile.tsx              # Edit profile page
│   ├── Favorites.tsx                # Favorites page
│   ├── Home.tsx                     # Home page
│   ├── Login.tsx                    # Login page
│   ├── NotFound.tsx                 # 404 page
│   ├── Notifications.tsx            # Notifications page
│   ├── PaymentMethods.tsx           # Payment methods page
│   ├── Products.tsx                 # Products listing page
│   ├── Register.tsx                 # Registration page
│   ├── SavedAddresses.tsx           # Saved addresses page
│   ├── Settings.tsx                 # Settings page
│   ├── UserProfile.tsx              # User profile page
│   └── restaurantUI/                # Restaurant admin pages
│       ├── index.ts
│       ├── Dashboard.tsx            # Analytics dashboard
│       ├── Orders.tsx               # Orders management
│       ├── ProductAdd.tsx           # Add product form
│       ├── ProductEdit.tsx          # Edit product form
│       └── ProductList.tsx          # Products table
└── styles/                          # Global styles
    └── global.css                   # Global CSS with Tailwind
```

#### `/src/presentation/components` - UI Components

**Responsibilities**:
- Feature-specific components
- Common reusable components
- Layout components (headers, navigation)

**Organization**:
- `common/` - Shared across features (modals, badges)
- `layout/` - Navigation and layout components

#### `/src/presentation/layouts` - Route Layouts

**Responsibilities**:
- Define page layouts
- Wrap routes with common UI
- Provide navigation structure

**Key Files**:

**`RootLayout.tsx`**:
- Customer-facing app layout
- Includes Header and BottomNav
- Uses `<Outlet />` for child routes

**`RestaurantLayout.tsx`**:
- Restaurant admin layout
- Includes RestaurantBottomNav
- Uses `<Outlet />` for admin routes

#### `/src/presentation/pages` - Page Components

**Responsibilities**:
- Implement page-level components
- Handle page-specific logic
- Coordinate between contexts and UI

**Customer Pages**:
- `Home.tsx` - Product browsing
- `Cart.tsx` - Shopping cart
- `Account.tsx` - User account
- `Login.tsx` / `Register.tsx` - Authentication
- `Favorites.tsx` - Saved favorites
- `Activity.tsx` - Order history
- `Settings.tsx` - App settings
- `PaymentMethods.tsx` - Payment management
- `SavedAddresses.tsx` - Address management

**Restaurant Admin Pages** (`restaurantUI/`):
- `Dashboard.tsx` - Analytics and metrics
- `ProductList.tsx` - Product management table
- `ProductAdd.tsx` - Add new product
- `ProductEdit.tsx` - Edit existing product
- `Orders.tsx` - Order management

#### `/src/presentation/styles` - Global Styles

**Responsibilities**:
- Define global CSS
- Import Tailwind CSS
- Set CSS variables
- Configure base styles

**Key Files**:

**`global.css`**:
```css
@import "tailwindcss";

:root {
  /* CSS variables */
}

/* Global styles */
```

**Path Alias**: `@presentation` → `./src/presentation`

---

### `/docs` - Documentation

**Purpose**: Contains project documentation files.

**Structure**:
```
docs/
├── ARCHITECTURE.md              # Architecture overview
├── FOLDER_STRUCTURE.md          # This file
├── PRESENTATION_LAYER.md        # Presentation layer details
├── STATE_MANAGEMENT.md          # State management guide
└── STYLING_GUIDE.md             # Styling conventions
```

**Responsibilities**:
- Document architecture decisions
- Explain folder structure
- Provide development guidelines
- Maintain technical documentation

---

## 🎯 Path Aliases Reference

Configured in `vite.config.ts` and `tsconfig.app.json`:

| Alias | Path | Usage |
|-------|------|-------|
| `@core` | `./src/core` | Business logic, contexts, routing |
| `@infrastructure` | `./src/infrastructure` | External services (future) |
| `@presentation` | `./src/presentation` | Pages, layouts, styles |
| `@components` | `./src/components` | Reusable UI components |
| `@assets` | `./src/assets` | Images, fonts, media |
| `@shared` | `./src/shared` | Shared utilities (future) |

**Example Usage**:
```typescript
import { useAuth } from "@core/context/AuthContext";
import Home from "@presentation/pages/Home";
import { Button } from "@components/restaurant-ui";
import logo from "@assets/images/logo.svg";
```

---

## 📋 File Naming Conventions

### Components
- **PascalCase** for component files: `Button.tsx`, `ProductModal.tsx`
- **PascalCase** for component folders: `Button/`, `ProductModal/`
- **index.ts** for barrel exports

### Pages
- **PascalCase** for page files: `Home.tsx`, `Dashboard.tsx`
- Match route names when possible

### Utilities & Configs
- **camelCase** for utility files: `formatDate.ts`, `apiClient.ts`
- **kebab-case** for config files: `vite.config.ts`, `eslint.config.js`

### Types & Interfaces
- **PascalCase** for type files: `types.ts`
- **PascalCase** for interfaces: `interface User {}`
- **PascalCase** for types: `type ButtonVariant = ...`

---

## 🔄 Import/Export Patterns

### Barrel Exports (index.ts)

**Purpose**: Simplify imports by re-exporting from a single file.

**Pattern**:
```typescript
// src/components/restaurant-ui/buttons/Button/index.ts
export { default } from "./Button";
export type { ButtonProps } from "./Button";

// Usage
import { Button } from "@components/restaurant-ui";
```

### Named Exports

**Preferred for**:
- Utility functions
- Constants
- Multiple exports from one file

**Pattern**:
```typescript
// utils.ts
export const formatDate = () => {};
export const formatPrice = () => {};

// Usage
import { formatDate, formatPrice } from "./utils";
```

### Default Exports

**Preferred for**:
- React components
- Single primary export

**Pattern**:
```typescript
// Button.tsx
export default function Button() {}

// Usage
import Button from "./Button";
```

---

## 🚀 Adding New Features

### Adding a New Page

1. Create page component in `src/presentation/pages/`
2. Add route in `src/core/router/routes.tsx`
3. Add navigation link if needed
4. Update barrel exports if applicable

### Adding a New Component

1. Create component folder in appropriate location
2. Create component file with TypeScript types
3. Create `index.ts` for barrel export
4. Add to parent `index.ts` if part of a library

### Adding a New Context

1. Create context file in `src/core/context/`
2. Define context type and provider
3. Export from `src/core/context/index.ts`
4. Wrap app in provider in `main.tsx`

---

## 📊 Folder Size Guidelines

### Keep Folders Focused
- **Small folders** (< 10 files) - Easy to navigate
- **Medium folders** (10-20 files) - Consider subcategories
- **Large folders** (> 20 files) - Split into subfolders

### Current Folder Sizes
- `/src/presentation/pages/` - 17 files (✅ Good)
- `/src/components/restaurant-ui/` - 8 categories (✅ Good)
- `/src/core/` - 3 subfolders (✅ Good)

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: Development Team
