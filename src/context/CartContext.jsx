"use client"

import { createContext, useContext, useState, useEffect } from "react"

const CartContext = createContext()

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([])
  const [deliveryType, setDeliveryType] = useState("delivery") // 'delivery' or 'pickup'

  useEffect(() => {
    // Load cart from localStorage
    const savedCart = localStorage.getItem("cart")
    if (savedCart) {
      setCartItems(JSON.parse(savedCart))
    }
  }, [])

  useEffect(() => {
    // Save cart to localStorage
    localStorage.setItem("cart", JSON.stringify(cartItems))
  }, [cartItems])

  const addToCart = (item) => {
    const existingItem = cartItems.find(
      (cartItem) => cartItem.id === item.id && cartItem.restaurantId === item.restaurantId,
    )

    if (existingItem) {
      setCartItems(
        cartItems.map((cartItem) =>
          cartItem.id === item.id && cartItem.restaurantId === item.restaurantId
            ? { ...cartItem, quantity: cartItem.quantity + item.quantity }
            : cartItem,
        ),
      )
    } else {
      setCartItems([...cartItems, item])
    }
  }

  const removeFromCart = (itemId, restaurantId) => {
    setCartItems(cartItems.filter((item) => !(item.id === itemId && item.restaurantId === restaurantId)))
  }

  const updateQuantity = (itemId, restaurantId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId, restaurantId)
      return
    }

    setCartItems(
      cartItems.map((item) =>
        item.id === itemId && item.restaurantId === restaurantId ? { ...item, quantity } : item,
      ),
    )
  }

  const clearCart = () => {
    setCartItems([])
  }

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0)
  }

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    deliveryType,
    setDeliveryType,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
