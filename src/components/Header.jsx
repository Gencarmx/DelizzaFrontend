"use client"

import { useNavigate } from "react-router-dom"
import { ArrowLeft, ShoppingCart } from "lucide-react"
import { useApp } from "../context/AppContext"
import "../componentsCss/Header.css"

function Header({ title, showBack = false, showCart = false }) {
  const navigate = useNavigate()
  const { getCartCount } = useApp()
  const cartCount = getCartCount()

  return (
    <header className="header">
      {showBack && (
        <button className="header-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
      )}
      <h1 className="header-title">{title}</h1>
      {showCart && (
        <button className="header-btn cart-btn" onClick={() => navigate("/cart")}>
          <ShoppingCart size={24} />
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
      )}
    </header>
  )
}

export default Header
