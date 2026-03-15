import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@core/context/AuthContext";
import { useCartSync } from "@core/hooks/useCartSync";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  restaurant?: {
    id: string;
    name: string;
  };
}

export interface DeliveryOption {
  type: "pickup" | "delivery";
  address?: string;
  distance?: number; // en kilómetros
}

export interface CartOrder {
  restaurant: {
    id: string;
    name: string;
  };
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

interface CartContextType {
  items: CartItem[];
  deliveryOption: DeliveryOption;
  isLoading: boolean;
  addToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  clearCartByRestaurantId: (restaurantId: string) => void;
  setDeliveryOption: (option: DeliveryOption) => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getDeliveryFee: () => number;
  getTotal: () => number;
  getOrdersByRestaurant: () => CartOrder[];
  hasMultipleRestaurants: () => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Clave de localStorage para los items del carrito
const CART_LOCAL_KEY = "cart";
const DELIVERY_LOCAL_KEY = "deliveryOption";

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<CartItem[]>(() => {
    // Inicializar desde localStorage
    try {
      const saved = localStorage.getItem(CART_LOCAL_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>(() => {
    try {
      const saved = localStorage.getItem(DELIVERY_LOCAL_KEY);
      return saved ? JSON.parse(saved) : { type: "pickup" };
    } catch {
      return { type: "pickup" };
    }
  });

  // ── Sincronización con Supabase ──────────────────────────────────────────
  // Carga desde Supabase al iniciar sesión, guarda con debounce en cada cambio,
  // y escucha Realtime para actualizaciones desde otros dispositivos.
  useCartSync({
    authUserId: user?.id ?? null,
    items,
    setItems,
    setIsLoading,
  });

  // ── Persistencia local de delivery option ───────────────────────────────
  useEffect(() => {
    localStorage.setItem(DELIVERY_LOCAL_KEY, JSON.stringify(deliveryOption));
  }, [deliveryOption]);

  // ── Persistencia local del carrito (fallback para usuarios no autenticados) ─
  useEffect(() => {
    localStorage.setItem(CART_LOCAL_KEY, JSON.stringify(items));
  }, [items]);

  // ── Acciones del carrito ─────────────────────────────────────────────────

  const addToCart = (
    item: Omit<CartItem, "quantity"> & { quantity?: number },
  ) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id);

      if (existingItem) {
        return prevItems.map((i) =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + (item.quantity || 1) }
            : i,
        );
      }

      return [...prevItems, { ...item, quantity: item.quantity || 1 }];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, quantity } : item)),
    );
  };

  const removeFromCart = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const clearCartByRestaurantId = (restaurantId: string) => {
    setItems((prevItems) =>
      prevItems.filter((item) => item.restaurant?.id !== restaurantId),
    );
  };

  // ── Calcs ────────────────────────────────────────────────────────────────

  const getTotalItems = () =>
    items.reduce((total, item) => total + item.quantity, 0);

  const getSubtotal = () =>
    items.reduce((total, item) => total + item.price * item.quantity, 0);

  /**
   * Costo de envío:
   * - pickup: $0
   * - delivery: $20 base + $5 por km
   */
  const getDeliveryFee = () => {
    if (deliveryOption.type === "pickup") {
      return 10;
    }

    // Costo base de envío a domicilio
    const baseFee = 15;

    // Costo adicional por kilómetro
    const perKmFee = 5;

    // Distancia en kilómetros (por defecto 0 si no se especifica)
    const distance = deliveryOption.distance || 0;

    // Cálculo total: $15 base + $5 por cada km
    return baseFee + (perKmFee * distance);
  };

  const getTotal = () => getSubtotal() + getDeliveryFee();

  const getOrdersByRestaurant = (): CartOrder[] => {
    const restaurantGroups = items.reduce(
      (acc, item) => {
        if (!item.restaurant) return acc;
        const restaurantId = item.restaurant.id;
        if (!acc[restaurantId]) {
          acc[restaurantId] = {
            restaurant: item.restaurant,
            items: [],
            subtotal: 0,
            deliveryFee: getDeliveryFee(),
            total: 0,
          };
        }
        acc[restaurantId].items.push(item);
        acc[restaurantId].subtotal += item.price * item.quantity;
        acc[restaurantId].total =
          acc[restaurantId].subtotal + acc[restaurantId].deliveryFee;
        return acc;
      },
      {} as Record<string, CartOrder>,
    );
    return Object.values(restaurantGroups);
  };

  const hasMultipleRestaurants = (): boolean => {
    const restaurantIds = items
      .map((item) => item.restaurant?.id)
      .filter(Boolean);
    return new Set(restaurantIds).size > 1;
  };

  const value: CartContextType = {
    items,
    deliveryOption,
    isLoading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    clearCartByRestaurantId,
    setDeliveryOption,
    getTotalItems,
    getSubtotal,
    getDeliveryFee,
    getTotal,
    getOrdersByRestaurant,
    hasMultipleRestaurants,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
