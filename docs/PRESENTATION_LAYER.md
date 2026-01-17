# Presentation Layer Documentation

## 📐 Overview

The Presentation Layer (`src/presentation/`) is responsible for all UI concerns, user interactions, and visual representation of data. It follows a component-based architecture using React 19 and TypeScript.

## 🏗️ Layer Structure

```
presentation/
├── components/          # Feature-specific and common components
├── layouts/            # Route layout wrappers
├── pages/              # Page-level components
└── styles/             # Global styles and CSS
```

## 📦 Components Organization

### Common Components (`components/common/`)

Reusable components shared across multiple features.

#### ProductModal

**Location**: `src/presentation/components/common/ProductModal/`

**Purpose**: Display product details in a modal dialog.

**Features**:
- Product image display
- Product information (name, price, description)
- Quantity selector
- Add to cart functionality
- Close/dismiss actions

**Usage**:
```typescript
import ProductModal from "@presentation/components/common/ProductModal";

<ProductModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  product={selectedProduct}
/>
```

**Props**:
```typescript
interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    description?: string;
    restaurant?: string;
  } | null;
}
```

#### PWABadge

**Location**: `src/presentation/components/common/PWABadge/`

**Purpose**: Display PWA update notification badge.

**Features**:
- Detects service worker updates
- Shows update notification
- Triggers app reload on update
- Auto-dismisses after action

**Usage**:
```typescript
import PWABadge from "@presentation/components/common/PWABadge";

<PWABadge />
```

**Behavior**:
- Appears when new version is available
- User can click to reload and update
- Integrates with Vite PWA plugin

### Layout Components (`components/layout/`)

Components that define the application's layout structure.

#### Header

**Location**: `src/presentation/components/layout/Header.tsx`

**Purpose**: Top navigation bar for customer-facing app.

**Features**:
- App branding/logo
- Location selector
- Search functionality
- User profile access
- Responsive design

**Usage**:
```typescript
import { Header } from "@presentation/components/layout/Header";

<Header />
```

#### BottomNav

**Location**: `src/presentation/components/layout/BottomNav.tsx`

**Purpose**: Bottom navigation for customer-facing app.

**Features**:
- 4 main navigation items
- Active state indication
- Icon + label display
- Mobile-optimized

**Navigation Items**:
1. **Home** - Browse products
2. **Favorites** - Saved items
3. **Activity** - Order history
4. **Account** - User profile

**Usage**:
```typescript
import { BottomNav } from "@presentation/components/layout/BottomNav";

<BottomNav />
```

**Implementation**:
```typescript
const location = useLocation();
const isActive = (path: string) => location.pathname === path;

<Link to="/" className={isActive("/") ? "active" : ""}>
  <Home />
  <span>Inicio</span>
</Link>
```

#### RestaurantBottomNav

**Location**: `src/presentation/components/layout/RestaurantBottomNav.tsx`

**Purpose**: Bottom navigation for restaurant admin interface.

**Features**:
- Admin-specific navigation
- Active state indication
- Icon + label display
- Consistent with customer nav style

**Navigation Items**:
1. **Dashboard** - Analytics and metrics
2. **Products** - Product management
3. **Orders** - Order management
4. **Settings** - Restaurant settings

**Usage**:
```typescript
import { RestaurantBottomNav } from "@presentation/components/layout/RestaurantBottomNav";

<RestaurantBottomNav />
```

#### MainLayout

**Location**: `src/presentation/components/layout/MainLayout.tsx`

**Purpose**: Main layout wrapper for customer-facing pages.

**Structure**:
```typescript
export function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
```

**Features**:
- Fixed header at top
- Scrollable content area
- Fixed bottom navigation
- Proper spacing for fixed elements

## 🎯 Layouts

### RootLayout

**Location**: `src/presentation/layouts/RootLayout.tsx`

**Purpose**: Root layout for customer-facing routes.

**Implementation**:
```typescript
export default function RootLayout() {
  return <MainLayout />;
}
```

**Routes Using This Layout**:
- `/` - Home
- `/favorites` - Favorites
- `/activity` - Activity
- `/account` - Account
- `/cart` - Shopping cart
- `/products` - Products listing
- All customer-facing routes

### RestaurantLayout

**Location**: `src/presentation/layouts/RestaurantLayout.tsx`

**Purpose**: Layout for restaurant admin routes.

**Implementation**:
```typescript
export default function RestaurantLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pb-20">
        <Outlet />
      </main>
      <RestaurantBottomNav />
    </div>
  );
}
```

**Routes Using This Layout**:
- `/restaurant/dashboard` - Dashboard
- `/restaurant/products` - Product list
- `/restaurant/products/add` - Add product
- `/restaurant/products/edit/:id` - Edit product
- `/restaurant/orders` - Orders
- All restaurant admin routes

**Differences from RootLayout**:
- No header (pages have their own headers)
- Different bottom navigation
- Admin-focused styling

## 📄 Pages

### Customer-Facing Pages

#### Home (`Home.tsx`)

**Route**: `/`

**Purpose**: Main landing page with product browsing.

**Features**:
- Category filters
- Product grid display
- Product cards with images
- Quick add to cart
- Product modal on click
- Search functionality

**State Management**:
```typescript
const [selectedProduct, setSelectedProduct] = useState(null);
const [selectedCategory, setSelectedCategory] = useState("all");
```

**Key Components Used**:
- `ProductModal` - Product details
- `Heart` icon - Favorites
- `Star` icon - Ratings
- `Clock` icon - Delivery time

#### Cart (`Cart.tsx`)

**Route**: `/cart`

**Purpose**: Shopping cart and checkout.

**Features**:
- Cart items list
- Quantity adjustment (+/-)
- Remove items
- Delivery option selection (pickup/delivery)
- Price breakdown (subtotal, delivery, total)
- Checkout button

**Context Integration**:
```typescript
const { items, updateQuantity, removeFromCart, getTotal } = useCart();
```

**Calculations**:
- Subtotal: Sum of all items
- Delivery fee: Based on delivery option
- Total: Subtotal + delivery fee

#### Favorites (`Favorites.tsx`)

**Route**: `/favorites`

**Purpose**: Display saved favorite products.

**Features**:
- Favorite products grid
- Remove from favorites
- Quick add to cart
- Product ratings
- Delivery time estimates

**State**: Currently uses mock data (prepared for backend integration)

#### Activity (`Activity.tsx`)

**Route**: `/activity`

**Purpose**: Order history and status tracking.

**Features**:
- Order list with status
- Status badges (completed, pending, cancelled)
- Order details (items, total, date)
- Order status icons
- Chronological ordering

**Order Statuses**:
- ✅ Completed (green)
- ⏱️ Pending (yellow)
- ❌ Cancelled (red)

#### Account (`Account.tsx`)

**Route**: `/account`

**Purpose**: User account management hub.

**Features**:
- User profile display
- Navigation to sub-pages
- Settings access
- Logout functionality

**Menu Items**:
- Edit Profile
- Payment Methods
- Saved Addresses
- Notifications
- Settings

**Navigation**:
```typescript
<Link to="/edit-profile">
  <User />
  <span>Editar Perfil</span>
</Link>
```

#### Login (`Login.tsx`)

**Route**: `/login`

**Purpose**: User authentication.

**Features**:
- Email/password form
- Password visibility toggle
- Form validation
- Error handling
- Link to registration
- Remember me option

**Authentication Flow**:
```typescript
const { signIn } = useAuth();

const handleSubmit = async (e) => {
  e.preventDefault();
  const { error } = await signIn(email, password);
  if (!error) navigate("/");
};
```

#### Register (`Register.tsx`)

**Route**: `/register`

**Purpose**: New user registration.

**Features**:
- Full name input
- Email input
- Password input with toggle
- Password confirmation
- Form validation
- Terms acceptance
- Link to login

**Registration Flow**:
```typescript
const { signUp } = useAuth();

const handleSubmit = async (e) => {
  e.preventDefault();
  const { error } = await signUp(email, password, fullName);
  if (!error) navigate("/");
};
```

#### Products (`Products.tsx`)

**Route**: `/products`

**Purpose**: Product listing with data loader.

**Features**:
- Server-side data loading
- Product grid display
- Category filtering
- Search functionality

**Data Loading**:
```typescript
// Uses React Router loader
export default function Products() {
  const products = useLoaderData<Product[]>();
  return <ProductGrid products={products} />;
}
```

**Loader**:
```typescript
// src/core/router/loaders/productsLoader.ts
export async function productsLoader() {
  const { data } = await supabase.from("products").select("*");
  return data;
}
```

#### Settings (`Settings.tsx`)

**Route**: `/settings`

**Purpose**: App settings and preferences.

**Features**:
- Notification settings
- Language preferences
- Theme selection
- Privacy settings
- About app
- Version info

#### Other Customer Pages

**EditProfile** (`/edit-profile`):
- Update user information
- Change profile picture
- Update contact details

**PaymentMethods** (`/payment-methods`):
- Manage payment cards
- Add new payment method
- Set default payment

**SavedAddresses** (`/saved-addresses`):
- Manage delivery addresses
- Add new address
- Set default address

**Notifications** (`/notifications`):
- View notifications
- Mark as read
- Notification preferences

**UserProfile** (`/user/:userId`):
- View user profile
- User's public information
- Dynamic route parameter

**NotFound** (`/*`):
- 404 error page
- Navigation back to home
- Helpful error message

### Restaurant Admin Pages

#### Dashboard (`restaurantUI/Dashboard.tsx`)

**Route**: `/restaurant/dashboard`

**Purpose**: Analytics and business metrics overview.

**Features**:
- 4 metric cards with trends
- Sales line chart (weekly)
- Top products bar chart
- Recent orders table
- Real-time data (prepared)

**Metrics Displayed**:
1. **Daily Sales** - Revenue with trend
2. **Total Orders** - Order count with trend
3. **New Customers** - Customer acquisition
4. **Average Ticket** - Average order value

**Charts**:
- `SalesLineChart` - 7-day sales trend
- `ProductsBarChart` - Top 5 products

**Components Used**:
```typescript
import MetricCard from "@components/restaurant-ui/cards/MetricCard";
import SalesLineChart from "@components/restaurant-ui/charts/SalesLineChart";
import ProductsBarChart from "@components/restaurant-ui/charts/ProductsBarChart";
import DataTable from "@components/restaurant-ui/tables/DataTable";
```

#### ProductList (`restaurantUI/ProductList.tsx`)

**Route**: `/restaurant/products`

**Purpose**: Product management table.

**Features**:
- Searchable product table
- Status badges (active/inactive)
- Stock level indicators
- Action dropdown per row
- Add product button
- Delete confirmation modal
- Bulk actions (prepared)

**Table Columns**:
- Image thumbnail
- Product ID
- Name
- Category
- Price
- Stock (color-coded)
- Status
- Actions

**Actions**:
- Edit product
- Duplicate product
- Delete product

**Search Implementation**:
```typescript
const [searchTerm, setSearchTerm] = useState("");

const filteredProducts = products.filter(product =>
  product.name.toLowerCase().includes(searchTerm.toLowerCase())
);
```

#### ProductAdd (`restaurantUI/ProductAdd.tsx`)

**Route**: `/restaurant/products/add`

**Purpose**: Add new product form.

**Features**:
- Image upload with preview
- Form validation
- Required field indicators
- Helper text
- Category selection
- Status selection
- Price and stock inputs
- Description textarea
- Cancel/Save buttons

**Form Fields**:
```typescript
interface ProductForm {
  image: File | null;
  name: string;
  category: string;
  status: "active" | "inactive";
  price: number;
  stock: number;
  description: string;
}
```

**Validation**:
- Required fields: name, category, price, stock
- Price must be positive
- Stock must be non-negative
- Image recommended but optional

**Components Used**:
```typescript
import Button from "@components/restaurant-ui/buttons/Button";
import Input from "@components/restaurant-ui/forms/Input";
import Select from "@components/restaurant-ui/forms/Select";
import Textarea from "@components/restaurant-ui/forms/Textarea";
```

#### ProductEdit (`restaurantUI/ProductEdit.tsx`)

**Route**: `/restaurant/products/edit/:productId`

**Purpose**: Edit existing product.

**Features**:
- Pre-filled form with existing data
- Same validation as ProductAdd
- Image preview of current product
- Update confirmation
- Cancel changes option

**Data Loading**:
```typescript
const { productId } = useParams();
const [product, setProduct] = useState(null);

useEffect(() => {
  // Load product data
  const loadProduct = async () => {
    const data = await fetchProduct(productId);
    setProduct(data);
  };
  loadProduct();
}, [productId]);
```

#### Orders (`restaurantUI/Orders.tsx`)

**Route**: `/restaurant/orders`

**Purpose**: Order management interface.

**Features**:
- Orders table
- Status filtering
- Search by customer/order ID
- Status badges
- Order details view
- Status update actions

**Order Statuses**:
- Pending
- Preparing
- Ready
- Delivered
- Cancelled

## 🎨 Styling Approach

### Tailwind CSS Integration

All presentation components use Tailwind CSS utility classes.

**Global Styles** (`styles/global.css`):
```css
@import "tailwindcss";

:root {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
  line-height: 1.5;
  font-weight: 400;
}

/* Ensure form elements inherit font */
button, input, optgroup, select, textarea {
  font-family: inherit;
}
```

### Common Patterns

**Card Pattern**:
```typescript
<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
  {/* Card content */}
</div>
```

**Button Pattern**:
```typescript
<button className="bg-amber-400 hover:bg-amber-500 text-white rounded-xl px-4 py-2.5 font-semibold transition-all">
  Click Me
</button>
```

**Input Pattern**:
```typescript
<input className="w-full rounded-xl px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
```

### Responsive Design

**Mobile-First Approach**:
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>
```

**Breakpoints**:
- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px
- `2xl:` - 1536px

## 🔄 Data Flow in Presentation Layer

### Component → Context → Backend

```
User Interaction (Button Click)
    ↓
Component Handler (onClick)
    ↓
Context Method (addToCart)
    ↓
State Update (setItems)
    ↓
Side Effect (localStorage.setItem)
    ↓
Re-render (React updates UI)
```

### Example: Adding to Cart

```typescript
// In ProductModal.tsx
const { addToCart } = useCart();

const handleAddToCart = () => {
  addToCart({
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.image,
    quantity: quantity
  });
  onClose();
};
```

## 🧩 Component Composition

### Example: Dashboard Page

```typescript
export default function Dashboard() {
  return (
    <div className="p-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard {...salesMetric} />
        <MetricCard {...ordersMetric} />
        <MetricCard {...customersMetric} />
        <MetricCard {...avgTicketMetric} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SalesLineChart data={salesData} />
        <ProductsBarChart data={productsData} />
      </div>

      {/* Recent Orders Table */}
      <DataTable columns={columns} data={orders} />
    </div>
  );
}
```

## 🎯 Best Practices

### Component Design

1. **Single Responsibility**: Each component has one clear purpose
2. **Composition over Inheritance**: Build complex UIs from simple components
3. **Props Interface**: Always define TypeScript interfaces for props
4. **Default Props**: Provide sensible defaults when appropriate

### State Management

1. **Local State**: Use `useState` for component-specific state
2. **Context**: Use context for shared state (auth, cart)
3. **Derived State**: Calculate values from existing state
4. **Side Effects**: Use `useEffect` for side effects

### Performance

1. **Memoization**: Use `useMemo` for expensive calculations
2. **Callbacks**: Use `useCallback` for event handlers
3. **Lazy Loading**: Load components on demand
4. **Code Splitting**: Split routes automatically

### Accessibility

1. **Semantic HTML**: Use appropriate HTML elements
2. **ARIA Labels**: Add labels for screen readers
3. **Keyboard Navigation**: Support keyboard interactions
4. **Focus Management**: Manage focus appropriately

## 📱 Mobile Optimization

### Touch Targets

Minimum touch target size: 44x44px

```typescript
<button className="min-h-[44px] min-w-[44px]">
  <Icon />
</button>
```

### Viewport

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### Safe Areas

```typescript
<div className="pb-safe">
  {/* Content respects device safe areas */}
</div>
```

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
