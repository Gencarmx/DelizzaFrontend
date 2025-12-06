"use client"

import { Heart } from "lucide-react"
import { useApp } from "../context/AppContext"
import "../componentsCss/ProductCard.css"

function ProductCard({ product, onClick }) {
  const { favorites, toggleFavorite } = useApp()
  const isFavorite = favorites.includes(product.id)

  const handleFavoriteClick = (e) => {
    e.stopPropagation()
    toggleFavorite(product.id)
  }

  return (
    <div className="product-card" onClick={onClick}>
      <div className="product-image-container">
        <img src={product.image || "/placeholder.svg"} alt={product.name} className="product-image" />
        <button className={`favorite-btn ${isFavorite ? "active" : ""}`} onClick={handleFavoriteClick}>
          <Heart size={20} fill={isFavorite ? "#ff3d00" : "none"} />
        </button>
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <div className="product-meta">
          <span className="product-delivery">Envío: ${product.deliveryCost}</span>
          <span className="product-time">{product.deliveryTime} min</span>
          {product.rating && (
            <span className="product-rating">
              <span className="star">★</span> {product.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductCard
