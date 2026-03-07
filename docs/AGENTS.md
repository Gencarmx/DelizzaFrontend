# AGENTS.md — Delizza Frontend

## Project Overview

Delizza is a food delivery PWA built with React 19, TypeScript 5.9, and Vite 7.
Backend is Supabase (auth, database, storage, realtime). Styling via Tailwind CSS v4.
Package manager is **bun** (bun.lock). The app serves two roles: customers and restaurant owners.

## Commands

```bash
bun install                # Install dependencies
bun run dev                # Start Vite dev server (with PWA dev support)
bun run build              # TypeScript check (tsc -b) + Vite production build
bun run lint               # ESLint — flat config with TS, React Hooks, React Refresh
bun run preview            # Preview production build locally
bun run gen-types          # Regenerate Supabase DB types into src/core/supabase/types.ts
bun run generate-pwa-icons # Generate PWA icon assets
```

**TypeScript check only** (no build): `npx tsc -b`

**No test framework is configured.** There are no test files, no vitest/jest config.
If you add tests, configure vitest (already Vite-based) and add a `test` script.

## Architecture — Three-Layer Structure

```
src/
├── core/             # Layer 1: Business logic, state, data access, routing
│   ├── context/      #   React Context providers (Auth, Cart, Theme, Address, Notifications)
│   ├── hooks/        #   Core-level hooks (useCartSync)
│   ├── router/       #   Route definitions, ProtectedRoute, data loaders
│   ├── services/     #   Data access functions (Supabase queries)
│   └── supabase/     #   Supabase client singleton + auto-generated DB types
│
├── components/       # Layer 2: Reusable UI component library (context-free)
│   └── restaurant-ui/#   Design system: Button, Input, MetricCard, DataTable, etc.
│
└── presentation/     # Layer 3: Views, layouts, page components
    ├── pages/        #   Route-level page components (grouped: auth/, profile/, settings/, restaurantUI/)
    ├── components/   #   Feature-specific components (layout/, common/, printing/)
    ├── logic/        #   View-model hooks (useCartLogic, useEditProfileLogic)
    ├── layouts/      #   RootLayout (customer), RestaurantLayout (owner)
    └── styles/       #   global.css (Tailwind import + base styles)
```

### Dependency Rules (strict)

- `presentation/` may import from `core/` and `components/`. Never the reverse.
- `components/` is pure UI — no imports from `core/` or `presentation/`.
- `core/` must not import from `presentation/` or `components/`.

## Path Aliases

Defined in both `tsconfig.app.json` and `vite.config.ts`. Always use these instead of relative paths (except within the same directory group in `components/`).

| Alias              | Maps to               |
|--------------------|------------------------|
| `@core/*`          | `./src/core/*`         |
| `@presentation/*`  | `./src/presentation/*` |
| `@components/*`    | `./src/components/*`   |
| `@assets/*`        | `./src/assets/*`       |

## Code Style Guidelines

### File Naming

| Category       | Convention                          | Examples                                    |
|----------------|-------------------------------------|---------------------------------------------|
| Pages          | PascalCase                          | `Home.tsx`, `RestaurantDetail.tsx`           |
| Components     | PascalCase                          | `Header.tsx`, `MetricCard.tsx`              |
| Contexts       | PascalCase + `Context` suffix       | `AuthContext.tsx`, `CartContext.tsx`         |
| Services       | camelCase + `Service` suffix        | `productService.ts`, `orderService.ts`      |
| Hooks          | camelCase + `use` prefix            | `useCartSync.ts`, `usePWAInstall.ts`        |
| Logic (VMs)    | PascalCase (file), `useXxxLogic` (export) | `CartLogic.ts` exports `useCartLogic` |
| Barrel exports | `index.ts` (lowercase)              | Every grouped directory has one             |

### Imports

- **Use path aliases** (`@core/`, `@presentation/`, `@components/`, `@assets/`) for cross-layer imports.
- **Use `import type`** for type-only imports. This is enforced by `verbatimModuleSyntax: true`.
- **Ordering convention**: (1) React/third-party, (2) aliased internal imports, (3) relative imports, (4) CSS imports last.

```typescript
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import type { Database } from "@core/supabase/types";
import { supabase } from "@core/supabase/client";
import { useAuth } from "@core/context/AuthContext";
import "@presentation/styles/global.css";
```

### Components

- **Functional components only.** No class components.
- **`export default`** for pages and design system components.
- **Named exports** for context hooks (`useAuth`, `useCart`), layout components (`Header`, `BottomNav`), and service functions.

### Props Typing

- Use `interface` with a `Props` suffix: `ButtonProps`, `MetricCardProps`, `ProductModalProps`.
- Extend HTML attributes when wrapping native elements:

```typescript
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}
```

### Types vs Interfaces

- **`interface`**: Props, context types, custom data shapes (`AuthContextType`, `OrderWithItems`).
- **`type`**: Database-derived types, union types, simple aliases:

```typescript
type Product = Database['public']['Tables']['products']['Row'];
type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";
```

- Types are co-located in their respective files (services, contexts, components) and re-exported via barrel `index.ts` files.

### Context Pattern (State Management)

React Context is the only state management approach. Every context follows this pattern:

```typescript
const XxxContext = createContext<XxxContextType | undefined>(undefined);

export function XxxProvider({ children }: { children: React.ReactNode }) {
  // state + logic
  return <XxxContext.Provider value={value}>{children}</XxxContext.Provider>;
}

export function useXxx() {
  const context = useContext(XxxContext);
  if (context === undefined) throw new Error("useXxx must be used within XxxProvider");
  return context;
}
```

### Services (Data Access)

- All API calls use the **Supabase client** (`@core/supabase/client`). No fetch/axios.
- Functions are camelCase verbs: `getProductsByBusiness`, `createProduct`, `updateOrderStatus`.
- Return data directly or throw errors with user-friendly messages.

### View-Model Hooks

Page-level business logic is extracted into hooks in `presentation/logic/`:

```typescript
// presentation/logic/CartLogic.ts
export function useCartLogic() { /* state, handlers, computed values */ }

// presentation/pages/Cart.tsx — thin JSX wrapper
export default function Cart() {
  const { items, handleCheckout, ... } = useCartLogic();
  return ( /* JSX only */ );
}
```

### Error Handling

```typescript
// Pattern 1: throw user-friendly error
try {
  const { data, error } = await supabase.from('table').select('*');
  if (error) throw error;
  return data;
} catch (error) {
  console.error('Error fetching data:', error);
  throw new Error('Could not fetch data');
}

// Pattern 2: return { error } (auth operations)
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) return { error };
return { error: null };
```

### Styling

- **Tailwind CSS v4** utility classes inline. No CSS modules.
- **Dark mode**: `dark:` variant classes. Toggled via `ThemeContext` adding `.dark` class to `<html>`.
- **CSS files** only for print-specific components (`OrderTicket.css`, `PrintButton.css`).
- **Icons**: `lucide-react` exclusively.

### Language

- **UI text**: Spanish (this is a Spanish-market app).
- **Code identifiers**: English (variable names, function names, types).

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
VITE_BACKEND_URL="url_to_backend"
```

All env vars must be prefixed with `VITE_` to be accessible in client code.

## Key Files

| File | Purpose |
|------|---------|
| `src/main.tsx` | App entry point, provider nesting order |
| `src/core/router/routes.tsx` | All route definitions, role-based guards |
| `src/core/context/index.ts` | Barrel export for all context providers/hooks |
| `src/core/supabase/client.ts` | Supabase client singleton |
| `src/core/supabase/types.ts` | Auto-generated DB types (do not edit manually) |
| `src/presentation/styles/global.css` | Tailwind import + dark mode config + base styles |
| `src/components/restaurant-ui/index.ts` | Barrel export for the design system |
| `vite.config.ts` | Vite config with path aliases, PWA, Tailwind plugin |
| `tsconfig.app.json` | TS config with strict mode, path aliases, verbatimModuleSyntax |
| `eslint.config.js` | ESLint flat config (TS + React Hooks + React Refresh) |
