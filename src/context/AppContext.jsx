"use client"

import { createContext, useContext, useState } from "react"
import { cartInitial, addresses, paymentMethods, user } from "../data/mockData"

const AppContext = createContext()

export function AppProvider({ children }) {
  const [cart, setCart] = useState(cartInitial)
  const [currentUser, setCurrentUser] = useState(user)
  const [savedAddresses, setSavedAddresses] = useState(addresses)
  const [savedPaymentMethods, setSavedPaymentMethods] = useState(paymentMethods)
  const [currentAddress, setCurrentAddress] = useState(addresses.find((a) => a.isDefault))
  const [favorites, setFavorites] = useState([])

  const addToCart = (product, quantity = 1, notes = "") => {
    const existingItem = cart.find((item) => item.id === product.id)

    if (existingItem) {
      setCart(
        cart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + quantity, notes } : item)),
      )
    } else {
      setCart([...cart, { ...product, quantity, notes }])
    }
  }

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId))
  }

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
    } else {
      setCart(cart.map((item) => (item.id === productId ? { ...item, quantity } : item)))
    }
  }

  const clearCart = () => {
    setCart([])
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getCartCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0)
  }

  const toggleFavorite = (itemId) => {
    if (favorites.includes(itemId)) {
      setFavorites(favorites.filter((id) => id !== itemId))
    } else {
      setFavorites([...favorites, itemId])
    }
  }

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    currentUser,
    setCurrentUser,
    savedAddresses,
    setSavedAddresses,
    currentAddress,
    setCurrentAddress,
    savedPaymentMethods,
    setSavedPaymentMethods,
    favorites,
    toggleFavorite,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }
  return context
}
