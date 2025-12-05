"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Trash2, Minus, Plus, ChevronDown } from "lucide-react"
import { useCart } from "../context/CartContext"
import "./Cart.css"

const Cart = () => {
  const navigate = useNavigate()
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart, deliveryType, setDeliveryType } =
    useCart()

  const [paymentMethod, setPaymentMethod] = useState("card")

  const subtotal = getCartTotal()
  const iva = Math.round(subtotal * 0.16)
  const deliveryFee = deliveryType === "delivery" ? 20 : 0
  const total = subtotal + iva + deliveryFee

  const handleOrder = () => {
    alert("¡Pedido realizado con éxito!")
    clearCart()
    navigate("/")
  }

  if (cartItems.length === 0) {
    return (
      <div className="page">
        <div className="cart-header">
          <button className="back-button-inline" onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </button>
          <h1 className="page-title">Tu pedido</h1>
        </div>
        <div className="empty-cart">
          <p className="empty-text">Tu carrito está vacío</p>
          <button className="browse-button" onClick={() => navigate("/")}>
            Explorar restaurantes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="cart-header">
        <button className="back-button-inline" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="page-title">Tu pedido</h1>
      </div>

      <div className="cart-content">
        <div className="cart-items">
          {cartItems.map((item) => (
            <div key={`${item.id}-${item.restaurantId}`} className="cart-item">
              <div className="cart-item-info">
                <img src={item.image || "/placeholder.svg"} alt={item.name} className="cart-item-image" />
                <div className="cart-item-details">
                  <h3 className="cart-item-name">{item.name}</h3>
                  <p className="cart-item-restaurant">{item.restaurantName}</p>
                  {item.note && <p className="cart-item-note">Nota: {item.note}</p>}
                </div>
              </div>
              <div className="cart-item-actions">
                <div className="cart-quantity-control">
                  <button
                    className="quantity-btn"
                    onClick={() => updateQuantity(item.id, item.restaurantId, item.quantity - 1)}
                  >
                    {item.quantity === 1 ? <Trash2 size={16} /> : <Minus size={16} />}
                  </button>
                  <span className="quantity">{item.quantity}</span>
                  <button
                    className="quantity-btn"
                    onClick={() => updateQuantity(item.id, item.restaurantId, item.quantity + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <span className="cart-item-price">${item.price * item.quantity}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="order-summary">
          <div className="summary-row">
            <span className="summary-label">Subtotal</span>
            <span className="summary-value">${subtotal}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">IVA</span>
            <span className="summary-value">${iva}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Tarifa de entrega</span>
            <span className="summary-value">${deliveryFee}</span>
          </div>
          <div className="summary-row total">
            <span className="summary-label">Total</span>
            <span className="summary-value">${total}</span>
          </div>
        </div>

        <div className="delivery-type-section">
          <h3 className="section-title-small">Tipo de entrega</h3>
          <div className="delivery-toggle">
            <button
              className={`toggle-button ${deliveryType === "delivery" ? "active" : ""}`}
              onClick={() => setDeliveryType("delivery")}
            >
              A domicilio
            </button>
            <button
              className={`toggle-button ${deliveryType === "pickup" ? "active" : ""}`}
              onClick={() => setDeliveryType("pickup")}
            >
              Recolección
            </button>
          </div>
        </div>

        <div className="payment-section">
          <h3 className="section-title-small">Método de pago</h3>
          <div className="payment-selector">
            <img src="https://replicate.delivery/xezq/e9mO1egDEVocREePfPSr7U24idpuXf1cRyceMp46PTJPspBcF/tmpiewc04nn.jpeg" alt="Visa card" className="payment-icon" />
            <span className="payment-number">**** **** **** 2398</span>
            <span className="payment-label">(Tarjeta)</span>
            <ChevronDown size={20} />
          </div>
        </div>

        <div className="address-section">
          <h3 className="section-title-small">Direccion de entrega</h3>
          <div className="address-display">Calle 25 x 41, Izamal, Yucatan</div>
        </div>

        <button className="order-button" onClick={handleOrder}>
          <div className="order-button-logo">
            <span className="order-logo-text">D</span>
          </div>
          Realizar pedido
        </button>
      </div>
    </div>
  )
}

export default Cart
