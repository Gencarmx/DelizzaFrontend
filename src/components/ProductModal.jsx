"use client"

import { useState } from "react"
import { X } from "lucide-react"
import QuantitySelector from "./QuantitySelector"
import { useApp } from "../context/AppContext"
import "../componentsCss/ProductModal.css"

function ProductModal({ product, onClose }) {
  const { addToCart } = useApp()
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState("")

  const handleAddToCart = () => {
    addToCart(product, quantity, notes)
    alert("Producto agregado al carrito")
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content product-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="modal-image-container">
          <img src={product.image || "/placeholder.svg"} alt={product.name} className="modal-image" />
        </div>

        <div className="modal-body">
          <h2 className="modal-title">{product.name}</h2>
          <p className="modal-description">{product.description}</p>

          {product.ingredients && (
            <div className="modal-ingredients">
              {product.ingredients.map((ingredient, idx) => (
                <div key={idx} className="ingredient-item">
                  ◦ {ingredient}
                </div>
              ))}
            </div>
          )}

          <div className="modal-quantity">
            <QuantitySelector value={quantity} onChange={setQuantity} />
          </div>

          <div className="modal-notes">
            <input
              type="text"
              className="notes-input"
              placeholder="Agrega una nota"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <span className="modal-price">${product.price * quantity}</span>
            <button className="add-to-cart-btn" onClick={handleAddToCart}>
              Agregar al carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductModal
