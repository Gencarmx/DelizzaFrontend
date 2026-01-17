# State Management Documentation

## 📐 Overview

This application uses **React Context API** for global state management, providing a simple, type-safe, and performant solution for sharing state across components without prop drilling.

## 🎯 State Management Strategy

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Application                         │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │            AuthProvider (Global)                │    │
│  │  - User authentication state                    │    │
│  │  - Session management                           │    │
│  │  - Sign in/out methods                          │    │
│  │                                                  │    │
│  │  ┌──────────────────────────────────────────┐  │    │
│  │  │       CartProvider (Global)              │  │    │
│  │  │  - Shopping cart items                   │  │    │
│  │  │  - Cart operations                       │  │    │
│  │  │  - Delivery options                      │  │    │
│  │  │  - Price calculations                    │  │    │
│  │  │                                           │  │    │
│  │  │  ┌────────────────────────────────────┐ │  │    │
│  │  │  │      RouterProvider                 │ │  │    │
│  │  │  │  - All page components              │ │  │    │
│  │  │  │  - Access to both contexts          │ │  │    │
│  │  │  └────────────────────────────────────┘ │  │    │
│  │  └──────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Provider Hierarchy

```typescript
// src/main.tsx
<StrictMode>
  <AuthProvider>
    <CartProvider>
      <RouterProvider router={router} />
    </CartProvider>
  </AuthProvider>
</StrictMode>
```

**Why This Order?**
1. **AuthProvider** - Outermost because authentication affects everything
2. **CartProvider** - Needs auth context for user-specific carts (future)
3. **RouterProvider** - Innermost, all routes have access to both contexts

## 🔐 AuthContext

### Location
`src/core/context/AuthContext.tsx`

### Purpose
Manages user authentication state and provides authentication methods throughout the application.

### State Structure

```typescript
interface AuthContextType {
  user: User | null;              // Current authenticated user
  session: Session | null;        // Current session
  loading: boolean;               // Loading state during auth checks
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}
```

### Implementation Details

#### Provider Setup

```typescript
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ... methods implementation
}
```

#### Authentication Methods

**Sign Up**:
```typescript
const signUp = async (email: string, password: string, fullName: string) => {
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) return { error };
    return { error: null };
  } catch (error) {
    return { error: error as AuthError };
  }
};
```

**Sign In**:
```typescript
const signIn = async (email: string, password: string) => {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error };
    return { error: null };
  } catch (error) {
    return { error: error as AuthError };
  }
};
```

**Sign Out**:
```typescript
const signOut = async () => {
  await supabase.auth.signOut();
};
```

### Usage in Components

```typescript
import { useAuth } from "@core/context/AuthContext";

export default function Login() {
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await signIn(email, password);
    
    if (error) {
      console.error("Login failed:", error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Protected Routes (Future Implementation)

```typescript
// Example protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

### Auth State Persistence

- **Supabase** handles session persistence automatically
- Sessions stored in localStorage by Supabase client
- Auto-refresh of expired tokens
- Automatic session restoration on page reload

## 🛒 CartContext

### Location
`src/core/context/CartContext.tsx`

### Purpose
Manages shopping cart state, delivery options, and provides cart operations throughout the application.

### State Structure

```typescript
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  restaurant?: string;
}

interface DeliveryOption {
  type: "pickup" | "delivery";
  address?: string;
  distance?: number;  // in kilometers
}

interface CartContextType {
  items: CartItem[];
  deliveryOption: DeliveryOption;
  addToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  setDeliveryOption: (option: DeliveryOption) => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getDeliveryFee: () => number;
  getTotal: () => number;
}
```

### Implementation Details

#### Provider Setup

```typescript
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>({
    type: "pickup",
  });

  // Load from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    const savedDelivery = localStorage.getItem("deliveryOption");
    
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error("Error loading cart:", error);
      }
    }
    
    if (savedDelivery) {
      try {
        setDeliveryOption(JSON.parse(savedDelivery));
      } catch (error) {
        console.error("Error loading delivery option:", error);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem("deliveryOption", JSON.stringify(deliveryOption));
  }, [deliveryOption]);

  // ... methods implementation
}
```

#### Cart Operations

**Add to Cart**:
```typescript
const addToCart = (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
  setItems((prevItems) => {
    const existingItem = prevItems.find((i) => i.id === item.id);
    
    if (existingItem) {
      // Update quantity if item exists
      return prevItems.map((i) =>
        i.id === item.id
          ? { ...i, quantity: i.quantity + (item.quantity || 1) }
          : i
      );
    }
    
    // Add new item
    return [...prevItems, { ...item, quantity: item.quantity || 1 }];
  });
};
```

**Update Quantity**:
```typescript
const updateQuantity = (id: string, quantity: number) => {
  if (quantity <= 0) {
    removeFromCart(id);
    return;
  }
  
  setItems((prevItems) =>
    prevItems.map((item) =>
      item.id === id ? { ...item, quantity } : item
    )
  );
};
```

**Remove from Cart**:
```typescript
const removeFromCart = (id: string) => {
  setItems((prevItems) => prevItems.filter((item) => item.id !== id));
};
```

**Clear Cart**:
```typescript
const clearCart = () => {
  setItems([]);
};
```

#### Price Calculations

**Get Total Items**:
```typescript
const getTotalItems = () => {
  return items.reduce((total, item) => total + item.quantity, 0);
};
```

**Get Subtotal**:
```typescript
const getSubtotal = () => {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
};
```

**Get Delivery Fee**:
```typescript
const getDeliveryFee = () => {
  if (deliveryOption.type === "pickup") {
    return 0;
  }
  
  // Base delivery fee
  const baseFee = 20;
  
  // Additional fee per kilometer
  const perKmFee = 5;
  
  // Distance in kilometers (default 0)
  const distance = deliveryOption.distance || 0;
  
  // Total: $20 base + $5 per km
  return baseFee + (perKmFee * distance);
};
```

**Example Delivery Fees**:
- Pickup: $0
- Delivery 3km: $20 + ($5 × 3) = $35
- Delivery 10km: $20 + ($5 × 10) = $70

**Get Total**:
```typescript
const getTotal = () => {
  return getSubtotal() + getDeliveryFee();
};
```

### Usage in Components

**Adding to Cart**:
```typescript
import { useCart } from "@core/context/CartContext";

export default function ProductModal({ product }) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: quantity
    });
  };

  return (
    <button onClick={handleAddToCart}>
      Add to Cart
    </button>
  );
}
```

**Displaying Cart**:
```typescript
import { useCart } from "@core/context/CartContext";

export default function Cart() {
  const {
    items,
    updateQuantity,
    removeFromCart,
    getSubtotal,
    getDeliveryFee,
    getTotal
  } = useCart();

  return (
    <div>
      {items.map(item => (
        <CartItem
          key={item.id}
          item={item}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
        />
      ))}
      
      <div>
        <p>Subtotal: ${getSubtotal()}</p>
        <p>Delivery: ${getDeliveryFee()}</p>
        <p>Total: ${getTotal()}</p>
      </div>
    </div>
  );
}
```

**Setting Delivery Option**:
```typescript
const { setDeliveryOption } = useCart();

// Pickup
setDeliveryOption({ type: "pickup" });

// Delivery
setDeliveryOption({
  type: "delivery",
  address: "123 Main St",
  distance: 5  // 5 kilometers
});
```

### Persistence Strategy

#### Current: localStorage

**Advantages**:
- ✅ Works offline
- ✅ No backend required
- ✅ Fast access
- ✅ Simple implementation

**Limitations**:
- ❌ Not synced across devices
- ❌ Lost if browser data cleared
- ❌ Limited to 5-10MB

#### Future: Supabase Integration

The code is prepared for Supabase integration (currently commented out):

```typescript
/**
 * SUPABASE INTEGRATION (Prepared for future use)
 * 
 * To enable:
 * 1. Create 'cart_items' table in Supabase
 * 2. Configure RLS policies
 * 3. Uncomment syncWithSupabase functions
 * 4. Call syncWithSupabase after cart operations
 */

const syncWithSupabase = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Delete existing items
  await supabase.from("cart_items").delete().eq("user_id", user.id);

  // Insert current items
  const itemsToInsert = items.map(item => ({
    user_id: user.id,
    product_id: item.id,
    product_name: item.name,
    product_price: item.price,
    product_image: item.image,
    quantity: item.quantity,
  }));

  if (itemsToInsert.length > 0) {
    await supabase.from("cart_items").insert(itemsToInsert);
  }
};
```

**Benefits of Supabase Integration**:
- ✅ Synced across devices
- ✅ Persistent across sessions
- ✅ User-specific carts
- ✅ Real-time updates possible

## 🔄 Data Flow Patterns

### Read Flow

```
Component Renders
    ↓
useContext Hook
    ↓
Access Context Value
    ↓
Display Data
```

**Example**:
```typescript
const { user } = useAuth();
return <p>Welcome, {user?.email}</p>;
```

### Write Flow

```
User Action
    ↓
Event Handler
    ↓
Context Method
    ↓
State Update
    ↓
Side Effects (localStorage, API)
    ↓
Re-render Components
```

**Example**:
```typescript
const { addToCart } = useCart();

const handleClick = () => {
  addToCart(product);  // Triggers state update and localStorage save
};
```

## 🎯 Best Practices

### Context Usage

**DO**:
- ✅ Use context for truly global state
- ✅ Keep context focused (separate concerns)
- ✅ Provide TypeScript types
- ✅ Handle loading states
- ✅ Implement error handling

**DON'T**:
- ❌ Use context for local component state
- ❌ Create too many contexts
- ❌ Put everything in one context
- ❌ Forget to handle edge cases

### Performance Optimization

**Memoization**:
```typescript
const value = useMemo(() => ({
  user,
  session,
  signIn,
  signOut
}), [user, session]);
```

**Selective Subscriptions**:
```typescript
// Only subscribe to what you need
const { user } = useAuth();  // Not the entire context
```

**Split Contexts**:
```typescript
// Good: Separate contexts for different concerns
<AuthProvider>
  <CartProvider>
    <App />
  </CartProvider>
</AuthProvider>

// Bad: One massive context
<AppProvider>  // Contains auth, cart, settings, etc.
  <App />
</AppProvider>
```

### Error Handling

```typescript
const signIn = async (email: string, password: string) => {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error };
    return { error: null };
  } catch (error) {
    // Handle unexpected errors
    console.error("Unexpected error:", error);
    return { error: error as AuthError };
  }
};
```

### Type Safety

```typescript
// Always define context type
interface AuthContextType {
  user: User | null;
  // ... other properties
}

// Throw error if used outside provider
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

## 🧪 Testing Contexts

### Mock Provider

```typescript
// test-utils.tsx
export function MockAuthProvider({ children, value }) {
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// In tests
<MockAuthProvider value={{ user: mockUser, signIn: jest.fn() }}>
  <ComponentToTest />
</MockAuthProvider>
```

### Test Context Methods

```typescript
test("addToCart adds item to cart", () => {
  const { result } = renderHook(() => useCart(), {
    wrapper: CartProvider
  });

  act(() => {
    result.current.addToCart({
      id: "1",
      name: "Test Product",
      price: 100,
      image: "test.jpg"
    });
  });

  expect(result.current.items).toHaveLength(1);
  expect(result.current.items[0].name).toBe("Test Product");
});
```

## 🚀 Future Enhancements

### Planned Features

1. **Optimistic Updates**
   - Update UI immediately
   - Sync with backend in background
   - Rollback on error

2. **Real-time Sync**
   - WebSocket integration
   - Live cart updates across devices
   - Real-time order status

3. **Offline Support**
   - Queue actions when offline
   - Sync when connection restored
   - Conflict resolution

4. **Advanced Caching**
   - Cache API responses
   - Invalidate on mutations
   - Background refresh

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
