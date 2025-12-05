"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Heart, Star, Clock } from "lucide-react"
import Header from "../components/Header"
import BottomNav from "../components/BottomNav"
import "./Favorites.css"

const Favorites = () => {
  const navigate = useNavigate()
  const [favorites] = useState([
    {
      id: 1,
      name: "Tio hamburguesas",
      price: 30,
      rating: 4.3,
      time: "35 min",
      image:
        "https://replicate.delivery/xezq/uMu9N3nHpH4gI1JaX4Cw4Umm0w1hfdyJ2am6DMPl60AXTD4KA/tmpp9xiciva.jpeg",
      type: "restaurant",
    },
    {
      id: 2,
      name: "China food express",
      price: 40,
      rating: 4.8,
      time: "25 min",
      image:
        "https://replicate.delivery/xezq/at5JI4NJ0IrnJpRYJJt5LPYkaTWW2yr6OMebhZIyEEEZTD4KA/tmpjcd4sp2a.jpeg",
      type: "restaurant",
    },
    {
      id: 3,
      name: "Sushi roll",
      price: 35,
      rating: 3.0,
      time: "40 min",
      image: "https://replicate.delivery/xezq/ZCXAIYAcdPocBZsICffZy5MLzyWXlVYP2Tj8mIoHvTm1mGwVA/tmptzrlcvou.jpeg",
      type: "product",
    },
  ])

  return (
    <div className="page">
      <Header showCart={false} title="Favoritos" />
      <div className="container">
        {favorites.length === 0 ? (
          <div className="empty-state">
            <Heart size={64} color="var(--text-gray)" />
            <p className="empty-text">No tienes favoritos aún</p>
            <button className="browse-button" onClick={() => navigate("/")}>
              Explorar restaurantes
            </button>
          </div>
        ) : (
          <div className="favorites-grid">
            {favorites.map((item) => (
              <div
                key={item.id}
                className="favorite-card"
                onClick={() => item.type === "restaurant" && navigate(`/restaurant/${item.id}`)}
              >
                <div className="favorite-image">
                  <img src={item.image || "/placeholder.svg"} alt={item.name} />
                  <button className="favorite-button active">
                    <Heart size={20} fill="var(--primary-yellow)" color="var(--primary-yellow)" />
                  </button>
                </div>
                <div className="favorite-info">
                  <h3 className="favorite-name">{item.name}</h3>
                  <div className="favorite-details">
                    <Star size={14} fill="var(--star-yellow)" color="var(--star-yellow)" />
                    <span className="rating">{item.rating}</span>
                    <span className="separator">•</span>
                    <span className="price">Envío: ${item.price}</span>
                    <span className="separator">•</span>
                    <Clock size={14} />
                    <span className="time">{item.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}

export default Favorites
