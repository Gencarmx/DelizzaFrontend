import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
// import { supabase } from "@core/supabase/client";

/**
 * CONFIGURACIÓN DE SUPABASE PARA PERSISTENCIA:
 * 
 * Para habilitar la persistencia del carrito con Supabase, necesitas:
 * 
 * 1. Crear una tabla 'cart_items' en Supabase con la siguiente estructura:
 *    - id: uuid (primary key)
 *    - user_id: uuid (foreign key a auth.users)
 *    - product_id: text
 *    - product_name: text
 *    - product_price: numeric
 *    - product_image: text
 *    - quantity: integer
 *    - created_at: timestamp
 *    - updated_at: timestamp
 * 
 * 2. Configurar las políticas RLS (Row Level Security):
 *    - Enable RLS en la tabla
 *    - Crear política para SELECT: auth.uid() = user_id
 *    - Crear política para INSERT: auth.uid() = user_id
 *    - Crear política para UPDATE: auth.uid() = user_id
 *    - Crear política para DELETE: auth.uid() = user_id
 * 
 * 3. Descomentar las líneas relacionadas con Supabase en este archivo:
 *    - Import de supabase (línea 2)
 *    - useEffect para cargar items desde Supabase
 *    - Funciones saveToSupabase, loadFromSupabase, syncWithSupabase
 * 
 * 4. Modificar las funciones addToCart, updateQuantity, removeFromCart
 *    para que llamen a syncWithSupabase después de actualizar el estado local
 * 
 * NOTA: El sistema funciona completamente sin Supabase usando localStorage
 */

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  restaurant?: string;
}

export interface DeliveryOption {
  type: "pickup" | "delivery";
  address?: string;
  distance?: number; // en kilómetros
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

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>({
    type: "pickup",
  });

  // Cargar carrito desde localStorage al iniciar
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    const savedDelivery = localStorage.getItem("deliveryOption");
    
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error("Error loading cart from localStorage:", error);
      }
    }
    
    if (savedDelivery) {
      try {
        setDeliveryOption(JSON.parse(savedDelivery));
      } catch (error) {
        console.error("Error loading delivery option from localStorage:", error);
      }
    }

    // TODO: Descomentar para cargar desde Supabase cuando esté configurado
    // loadFromSupabase();
  }, []);

  // Guardar carrito en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem("deliveryOption", JSON.stringify(deliveryOption));
  }, [deliveryOption]);

  /**
   * FUNCIÓN PARA SINCRONIZAR CON SUPABASE (Descomentarla cuando esté configurado)
   * 
   * const syncWithSupabase = async () => {
   *   const { data: { user } } = await supabase.auth.getUser();
   *   if (!user) return;
   * 
   *   // Eliminar items existentes del usuario
   *   await supabase.from("cart_items").delete().eq("user_id", user.id);
   * 
   *   // Insertar items actuales
   *   const itemsToInsert = items.map(item => ({
   *     user_id: user.id,
   *     product_id: item.id,
   *     product_name: item.name,
   *     product_price: item.price,
   *     product_image: item.image,
   *     quantity: item.quantity,
   *   }));
   * 
   *   if (itemsToInsert.length > 0) {
   *     await supabase.from("cart_items").insert(itemsToInsert);
   *   }
   * };
   * 
   * const loadFromSupabase = async () => {
   *   const { data: { user } } = await supabase.auth.getUser();
   *   if (!user) return;
   * 
   *   const { data, error } = await supabase
   *     .from("cart_items")
   *     .select("*")
   *     .eq("user_id", user.id);
   * 
   *   if (error) {
   *     console.error("Error loading cart from Supabase:", error);
   *     return;
   *   }
   * 
   *   if (data && data.length > 0) {
   *     const loadedItems: CartItem[] = data.map(item => ({
   *       id: item.product_id,
   *       name: item.product_name,
   *       price: item.product_price,
   *       quantity: item.quantity,
   *       image: item.product_image,
   *     }));
   *     setItems(loadedItems);
   *   }
   * };
   */

  const addToCart = (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id);
      
      if (existingItem) {
        return prevItems.map((i) =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + (item.quantity || 1) }
            : i
        );
      }
      
      return [...prevItems, { ...item, quantity: item.quantity || 1 }];
    });
    
    // TODO: Descomentar para sincronizar con Supabase
    // syncWithSupabase();
  };

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
    
    // TODO: Descomentar para sincronizar con Supabase
    // syncWithSupabase();
  };

  const removeFromCart = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
    
    // TODO: Descomentar para sincronizar con Supabase
    // syncWithSupabase();
  };

  const clearCart = () => {
    setItems([]);
    
    // TODO: Descomentar para sincronizar con Supabase
    // syncWithSupabase();
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getSubtotal = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  /**
   * CÁLCULO DE COSTO DE ENVÍO:
   * 
   * Esta función calcula el costo de envío basado en el tipo de entrega seleccionado.
   * 
   * LÓGICA:
   * - Si el tipo es "pickup" (recoger en persona): $0 de envío
   * - Si el tipo es "delivery" (envío a domicilio):
   *   * Costo base: $20 pesos
   *   * Costo por distancia: $5 pesos por cada kilómetro desde el restaurante
   *   * Fórmula: $20 + ($5 × distancia_en_km)
   * 
   * EJEMPLO:
   * - Distancia de 3 km: $20 + ($5 × 3) = $35 pesos
   * - Distancia de 10 km: $20 + ($5 × 10) = $70 pesos
   * 
   * NOTA: La distancia debe ser proporcionada en el objeto deliveryOption.distance
   * cuando el usuario selecciona una dirección de entrega.
   */
  const getDeliveryFee = () => {
    if (deliveryOption.type === "pickup") {
      return 0;
    }
    
    // Costo base de envío a domicilio
    const baseFee = 20;
    
    // Costo adicional por kilómetro
    const perKmFee = 5;
    
    // Distancia en kilómetros (por defecto 0 si no se especifica)
    const distance = deliveryOption.distance || 0;
    
    // Cálculo total: $20 base + $5 por cada km
    return baseFee + (perKmFee * distance);
  };

  const getTotal = () => {
    return getSubtotal() + getDeliveryFee();
  };

  const value: CartContextType = {
    items,
    deliveryOption,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    setDeliveryOption,
    getTotalItems,
    getSubtotal,
    getDeliveryFee,
    getTotal,
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
