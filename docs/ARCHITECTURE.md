# Architecture Documentation

## 📐 Overview

This project implements **Clean Architecture** principles to create a scalable, maintainable, and testable Progressive Web Application (PWA) for a food delivery platform.

## 🏗️ Architectural Layers

The application is organized into three main layers following the Dependency Rule:

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  (UI Components, Pages, Hooks, Context, Routing)        │
│                                                          │
│  Dependencies: ↓ Core, ↓ Infrastructure                 │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                    │
│     (External Services, API Clients, Storage)           │
│                                                          │
│  Dependencies: ↓ Core                                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                       Core Layer                         │
│   (Business Logic, Domain Entities, Use Cases)          │
│                                                          │
│  Dependencies: None (Pure business logic)                │
└─────────────────────────────────────────────────────────┘
```

### The Dependency Rule

**Inner layers should not depend on outer layers.**

- ✅ Presentation can import from Core and Infrastructure
- ✅ Infrastructure can import from Core
- ❌ Core cannot import from Presentation or Infrastructure
- ❌ Infrastructure cannot import from Presentation

## 📦 Layer Responsibilities

### 1. Core Layer (`src/core/`)

**Purpose**: Contains business logic and domain rules independent of frameworks and UI.

**Responsibilities**:
- Define domain entities and business rules
- Implement use cases and application logic
- Provide interfaces (ports) for external dependencies
- Manage routing configuration
- Define context providers for state management

**Key Components**:
- `context/` - React Context providers (AuthContext, CartContext)
- `router/` - Route definitions and loaders
- `supabase/` - Supabase client configuration and types

**Independence**: This layer has no dependencies on React components or external libraries (except for necessary infrastructure like Supabase client).

### 2. Infrastructure Layer (`src/components/restaurant-ui/`)

**Purpose**: Implements external concerns and provides reusable UI components.

**Responsibilities**:
- Reusable UI component library (Restaurant Admin UI)
- External service integrations
- Data persistence mechanisms
- Third-party library wrappers

**Key Components**:
- `buttons/` - Button components with variants
- `cards/` - Card components for metrics and data display
- `forms/` - Form input components (Input, Select, Textarea)
- `tables/` - Data table components
- `charts/` - Chart components using Recharts
- `modals/` - Modal dialog components
- `badges/` - Status badge components
- `dropdowns/` - Dropdown menu components

### 3. Presentation Layer (`src/presentation/`)

**Purpose**: Handles all UI concerns and user interactions.

**Responsibilities**:
- Render UI components and pages
- Handle user input and events
- Manage local component state
- Coordinate between Core and Infrastructure layers
- Implement responsive layouts

**Key Components**:
- `pages/` - Page components for routes
- `components/` - Feature-specific and common components
- `layouts/` - Layout components with navigation
- `styles/` - Global styles and CSS

## 🔄 Data Flow

### Authentication Flow

```
User Action (Login)
    ↓
Presentation Layer (Login.tsx)
    ↓
Core Layer (AuthContext.signIn)
    ↓
Infrastructure (Supabase Client)
    ↓
External Service (Supabase Auth)
    ↓
Core Layer (Update Auth State)
    ↓
Presentation Layer (Re-render with new state)
```

### Shopping Cart Flow

```
User Action (Add to Cart)
    ↓
Presentation Layer (ProductModal)
    ↓
Core Layer (CartContext.addToCart)
    ↓
Local State Update
    ↓
Infrastructure (localStorage persistence)
    ↓
Presentation Layer (Re-render cart UI)
```

## 🎯 Design Patterns

### 1. Context Provider Pattern

Used for global state management without prop drilling.

**Implementation**:
```typescript
// Core Layer - Define context and provider
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // ... logic
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Presentation Layer - Consume context
const { user, signIn } = useAuth();
```

**Benefits**:
- Centralized state management
- Type-safe with TypeScript
- Easy to test and mock

### 2. Barrel Export Pattern

Simplifies imports by re-exporting from index files.

**Implementation**:
```typescript
// src/components/restaurant-ui/index.ts
export { default as Button } from "./buttons/Button";
export { default as Input } from "./forms/Input";

// Usage
import { Button, Input } from "@components/restaurant-ui";
```

**Benefits**:
- Cleaner import statements
- Easier refactoring
- Better encapsulation

### 3. Compound Component Pattern

Used in complex components like DataTable and forms.

**Implementation**:
```typescript
// Flexible, composable components
<DataTable columns={columns} data={data}>
  <DataTable.Header />
  <DataTable.Body />
</DataTable>
```

### 4. Render Props Pattern

Used in DataTable for custom cell rendering.

**Implementation**:
```typescript
const columns = [
  {
    key: "status",
    header: "Status",
    render: (item) => <StatusBadge status={item.status} />
  }
];
```

## 🛠️ Technology Stack

### Core Technologies
- **React 19.2.3** - UI library with latest features
- **TypeScript 5.9.3** - Type safety and developer experience
- **Vite 7.1.9** - Fast build tool and dev server

### Routing & Navigation
- **React Router 7.9.6** - Client-side routing with data router pattern
- Nested routes with layouts
- Route loaders for data fetching
- Type-safe navigation

### State Management
- **React Context API** - Global state management
- **localStorage** - Client-side persistence
- **Supabase** - Backend state (optional, prepared for integration)

### Styling
- **Tailwind CSS 4.1.17** - Utility-first CSS framework
- **@tailwindcss/vite** - Vite plugin for Tailwind
- Mobile-first responsive design
- Custom design system

### Backend & Data
- **Supabase 2.89.0** - Backend as a Service
- **@supabase/supabase-js** - Supabase client
- Authentication and database
- Real-time subscriptions (prepared)

### UI Components & Icons
- **Lucide React 0.562.0** - Icon library
- **Recharts 3.6.0** - Chart library for analytics

### PWA
- **vite-plugin-pwa 1.1.0** - PWA plugin for Vite
- **workbox-core & workbox-window** - Service worker utilities
- Offline-first capabilities
- Auto-update functionality

## 🔐 Security Considerations

### Authentication
- Supabase Auth handles secure authentication
- JWT tokens managed by Supabase client
- Row Level Security (RLS) policies on database

### Data Validation
- TypeScript provides compile-time type checking
- Runtime validation in form components
- Sanitization of user inputs

### API Security
- Environment variables for sensitive data
- HTTPS-only in production
- CORS configuration via Supabase

## 📱 Progressive Web App (PWA)

### Features
- **Installable** - Can be installed on devices
- **Offline-first** - Works without internet connection
- **Auto-update** - Service worker updates automatically
- **App-like** - Standalone display mode
- **Responsive** - Works on all screen sizes

### Service Worker Strategy
```typescript
// vite.config.ts
workbox: {
  globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
}
```

## 🎨 UI Architecture

### Two UI Systems

#### 1. Customer-Facing UI
- **Location**: `src/presentation/pages/`
- **Layout**: `RootLayout` with bottom navigation
- **Purpose**: Food ordering, cart, user profile
- **Routes**: `/`, `/favorites`, `/cart`, `/account`, etc.

#### 2. Restaurant Admin UI
- **Location**: `src/components/restaurant-ui/` + `src/presentation/pages/restaurantUI/`
- **Layout**: `RestaurantLayout` with admin navigation
- **Purpose**: Product management, orders, analytics
- **Routes**: `/restaurant/dashboard`, `/restaurant/products`, etc.

### Component Hierarchy

```
App (main.tsx)
├── AuthProvider (Global auth state)
│   └── CartProvider (Global cart state)
│       └── RouterProvider
│           ├── RootLayout (Customer UI)
│           │   ├── Header
│           │   ├── Pages (Home, Cart, etc.)
│           │   └── BottomNav
│           └── RestaurantLayout (Admin UI)
│               ├── Pages (Dashboard, Products, etc.)
│               └── RestaurantBottomNav
```

## 🔧 Configuration

### Path Aliases

Configured in `vite.config.ts` and `tsconfig.app.json`:

```typescript
{
  "@core": "./src/core",
  "@infrastructure": "./src/infrastructure",
  "@presentation": "./src/presentation",
  "@components": "./src/components",
  "@assets": "./src/assets",
  "@shared": "./src/shared"
}
```

**Benefits**:
- Cleaner imports
- Easier refactoring
- Better IDE support
- Consistent code style

### Environment Variables

```typescript
// src/vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}
```

## 📊 Performance Optimizations

### Build Optimizations
- **Code splitting** - Automatic route-based splitting
- **Tree shaking** - Remove unused code
- **Minification** - Compress JavaScript and CSS
- **Asset optimization** - Optimize images and fonts

### Runtime Optimizations
- **React 19 features** - Automatic batching, transitions
- **Lazy loading** - Load components on demand
- **Memoization** - Prevent unnecessary re-renders
- **Virtual scrolling** - For large lists (prepared)

### Caching Strategy
- **Service Worker** - Cache static assets
- **localStorage** - Cache user preferences and cart
- **Supabase** - Server-side caching (when integrated)

## 🧪 Testing Strategy (Prepared)

### Unit Tests
- Test business logic in Core layer
- Test utility functions
- Test context providers

### Integration Tests
- Test component interactions
- Test routing and navigation
- Test form submissions

### E2E Tests
- Test critical user flows
- Test PWA functionality
- Test offline capabilities

## 🚀 Deployment Architecture

### Build Process
```bash
npm run build
# 1. TypeScript compilation
# 2. Vite bundling
# 3. PWA manifest generation
# 4. Service worker generation
# 5. Asset optimization
```

### Production Structure
```
dist/
├── assets/          # Bundled JS, CSS
├── icons/           # PWA icons
├── index.html       # Entry point
├── manifest.json    # PWA manifest
└── sw.js           # Service worker
```

## 📈 Scalability Considerations

### Code Organization
- **Modular architecture** - Easy to add new features
- **Separation of concerns** - Clear responsibilities
- **Reusable components** - DRY principle
- **Type safety** - Catch errors early

### Performance
- **Lazy loading** - Load code on demand
- **Code splitting** - Smaller initial bundles
- **Caching** - Reduce network requests
- **Optimistic updates** - Better UX

### Maintainability
- **Clean Architecture** - Easy to understand and modify
- **TypeScript** - Self-documenting code
- **Consistent patterns** - Predictable codebase
- **Documentation** - Clear guidelines

## 🔄 Future Enhancements

### Planned Features
1. **Real-time updates** - WebSocket integration with Supabase
2. **Push notifications** - PWA notifications for orders
3. **Advanced analytics** - More detailed restaurant insights
4. **Multi-language** - i18n support
5. **Dark mode** - Theme switching
6. **Accessibility** - WCAG 2.1 compliance

### Technical Improvements
1. **Testing** - Comprehensive test coverage
2. **CI/CD** - Automated deployment pipeline
3. **Monitoring** - Error tracking and analytics
4. **Performance** - Further optimizations
5. **Security** - Enhanced security measures

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
