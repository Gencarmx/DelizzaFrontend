"use client"

import { useNavigate } from "react-router-dom"
import { Clock, Star, ChevronRight } from "lucide-react"
import "./RestaurantList.css"

const RestaurantList = () => {
  const navigate = useNavigate()

  const restaurants = [
    {
      id: 1,
      name: "China food express",
      deliveryFee: 40,
      time: "25 min",
      rating: 4.8,
      image:
        "https://replicate.delivery/xezq/at5JI4NJ0IrnJpRYJJt5LPYkaTWW2yr6OMebhZIyEEEZTD4KA/tmpjcd4sp2a.jpeg",
    },
    {
      id: 2,
      name: "Kinich",
      deliveryFee: 37,
      time: "20 min",
      rating: 4.4,
      image:
        "https://replicate.delivery/xezq/ehCHZkGBuXVRSaCvFdYbbg8ddF79jrKE2S0xJhoRsgbXTD4KA/tmp8n_h63jl.jpeg",
    },
  ]

  return (
    <div className="restaurant-section">
      <div className="section-header">
        <h2 className="section-title">Restaurantes</h2>
        <button className="see-more">
          Ver mas
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="restaurant-list">
        {restaurants.map((restaurant) => (
          <div
            key={restaurant.id}
            className="restaurant-card-horizontal"
            onClick={() => navigate(`/restaurant/${restaurant.id}`)}
          >
            <img
              src={restaurant.image || "/placeholder.svg"}
              alt={restaurant.name}
              className="restaurant-image-horizontal"
            />
            <div className="restaurant-info-horizontal">
              <h3 className="restaurant-name">{restaurant.name}</h3>
              <div className="restaurant-meta">
                <div className="meta-item">
                  <span className="label">Envío:</span>
                  <span className="value">${restaurant.deliveryFee}</span>
                </div>
                <div className="meta-item">
                  <Clock size={14} />
                  <span className="value">{restaurant.time}</span>
                </div>
                <div className="meta-item">
                  <Star size={14} fill="var(--star-yellow)" color="var(--star-yellow)" />
                  <span className="value">{restaurant.rating}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RestaurantList
