"use client"

import { ShoppingCart } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useCart } from "../context/CartContext"
import "./Header.css"

const Header = ({ showCart = true, title }) => {
  const navigate = useNavigate()
  const { getCartCount } = useCart()
  const cartCount = getCartCount()

  return (
    <header className="header">
      <div className="header-content">
        {title ? (
          <h1 className="header-title">{title}</h1>
        ) : (
          <div className="logo-container">
            <div className="logo">
              <span className="logo-text">D</span>
            </div>
            <span className="brand-name">LIZZA</span>
            <span className="brand-subtitle">DELIVERY APP</span>
          </div>
        )}
        {showCart && (
          <button className="cart-button" onClick={() => navigate("/cart")}>
            <ShoppingCart size={24} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        )}
      </div>
    </header>
  )
}

export default Header
