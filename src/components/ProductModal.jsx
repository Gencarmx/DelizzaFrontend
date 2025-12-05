"use client"

import { useState } from "react"
import { X, Minus, Plus } from "lucide-react"
import { useCart } from "../context/CartContext"
import "./ProductModal.css"

const ProductModal = ({ product, onClose }) => {
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState("")
  const { addToCart } = useCart()

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      note: note,
      image: product.image,
      restaurantId: product.restaurantId,
      restaurantName: product.restaurantName,
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="product-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="modal-image">
          <img src={product.image || "/placeholder.svg"} alt={product.name} />
        </div>

        <div className="modal-content">
          <h2 className="modal-title">Combo familiar</h2>
          <p className="modal-description">
            3 hamburguesas con carne de res, queso, lechuga, jitomate, mayonesa, catsup y cebolla. Acompañadas de papas
            a la francesa y aderezos
          </p>

          <div className="quantity-selector">
            <button className="quantity-button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
              <Minus size={20} />
            </button>
            <span className="quantity-display">{quantity}</span>
            <button className="quantity-button" onClick={() => setQuantity(quantity + 1)}>
              <Plus size={20} />
            </button>
          </div>

          <input
            type="text"
            placeholder="Agrega una nota"
            className="note-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="modal-footer">
            <span className="modal-price">${product.price * quantity}</span>
            <button className="add-to-cart-button" onClick={handleAddToCart}>
              Agregar al carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductModal
