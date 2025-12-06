"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Trash2, ChevronDown } from "lucide-react"
import Header from "../components/Header"
import QuantitySelector from "../components/QuantitySelector"
import { useApp } from "../context/AppContext"
import "../pagesCss/Cart.css"

function Cart() {
  const navigate = useNavigate()
  const { cart, updateCartQuantity, removeFromCart, getCartTotal, currentAddress, savedPaymentMethods } = useApp()
  const [deliveryType, setDeliveryType] = useState("delivery")

  const subtotal = getCartTotal()
  const iva = Math.round(subtotal * 0.16)
  const deliveryFee = deliveryType === "delivery" ? 20 : 0
  const total = subtotal + iva + deliveryFee

  const handleCheckout = () => {
    alert("Pedido realizado con éxito")
    navigate("/")
  }

  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <Header title="Tu pedido" showBack={true} />
        <div className="empty-cart">
          <h2>Tu carrito está vacío</h2>
          <p>Agrega productos para continuar</p>
          <button className="btn-primary" onClick={() => navigate("/")}>
            Ver restaurantes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="cart-page">
      <Header title="Tu pedido" showBack={true} />

      <div className="cart-content">
        <div className="delivery-type-toggle">
          <button
            className={`type-btn ${deliveryType === "delivery" ? "active" : ""}`}
            onClick={() => setDeliveryType("delivery")}
          >
            Entrega a domicilio
          </button>
          <button
            className={`type-btn ${deliveryType === "pickup" ? "active" : ""}`}
            onClick={() => setDeliveryType("pickup")}
          >
            Recolección
          </button>
        </div>

        <div className="cart-items">
          {cart.map((item) => (
            <div key={item.id} className="cart-item">
              <div className="item-header">
                <h3 className="item-restaurant">{item.name}</h3>
                <button className="delete-btn" onClick={() => removeFromCart(item.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="item-content">
                <img src={item.image || "/placeholder.svg"} alt={item.name} className="item-image" />
                <div className="item-details">
                  <h4 className="item-name">{item.description || item.name}</h4>
                  {item.ingredients && (
                    <ul className="item-ingredients">
                      {item.ingredients.map((ing, idx) => (
                        <li key={idx}>{ing}</li>
                      ))}
                    </ul>
                  )}
                  <div className="item-footer">
                    <span className="item-price">${item.price}</span>
                  </div>
                </div>
              </div>
              <div className="item-quantity">
                <QuantitySelector
                  value={item.quantity}
                  onChange={(newQty) => updateCartQuantity(item.id, newQty)}
                  min={0}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>${subtotal}</span>
          </div>
          <div className="summary-row">
            <span>Iva</span>
            <span>${iva}</span>
          </div>
          <div className="summary-row">
            <span>Tarifa de entrega</span>
            <span>${deliveryFee}</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>${total}</span>
          </div>
        </div>

        <div className="checkout-section">
          <div className="checkout-field">
            <label>Metodo de pago</label>
            <div className="payment-selector">
              <div className="payment-info">
                <span className="payment-type">VISA</span>
                <span>**** **** **** {savedPaymentMethods[0]?.last4 || "2398"}</span>
              </div>
              <ChevronDown size={20} />
            </div>
          </div>

          <div className="checkout-field">
            <label>Direccion de entrega</label>
            <input
              type="text"
              className="address-input"
              value={currentAddress?.address || "Calle 25 x 41, Izamal, Yucatan"}
              readOnly
            />
          </div>

          <button className="checkout-btn" onClick={handleCheckout}>
            <div className="logo-btn-circle">
              <span>D</span>
            </div>
            Realizar pedido
          </button>
        </div>
      </div>
    </div>
  )
}

export default Cart
