"use client"

import { useNavigate } from "react-router-dom"
import { Heart } from "lucide-react"
import { useApp } from "../context/AppContext"
import "../componentsCss/RestaurantCard.css"

function RestaurantCard({ restaurant }) {
  const navigate = useNavigate()
  const { favorites, toggleFavorite } = useApp()
  const isFavorite = favorites.includes(restaurant.id)

  const handleFavoriteClick = (e) => {
    e.stopPropagation()
    toggleFavorite(restaurant.id)
  }

  return (
    <div className="restaurant-card" onClick={() => navigate(`/restaurant/${restaurant.id}`)}>
      <img src={restaurant.image || "/placeholder.svg"} alt={restaurant.name} className="restaurant-image" />
      <div className="restaurant-info">
        <div className="restaurant-header">
          <h3 className="restaurant-name">{restaurant.name}</h3>
          <button className={`favorite-icon ${isFavorite ? "active" : ""}`} onClick={handleFavoriteClick}>
            <Heart size={18} fill={isFavorite ? "#ff3d00" : "none"} />
          </button>
        </div>
        <div className="restaurant-meta">
          <span>Envío: ${restaurant.deliveryCost}</span>
          <span className="rating">
            <span className="star">★</span> {restaurant.rating.toFixed(1)}
          </span>
          <span>{restaurant.deliveryTime} Min</span>
        </div>
      </div>
    </div>
  )
}

export default RestaurantCard
