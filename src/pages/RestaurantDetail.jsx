"use client"

import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Star, Clock } from "lucide-react"
import ProductModal from "../components/ProductModal"
import BottomNav from "../components/BottomNav"
import Header from "../components/Header"
import "./RestaurantDetail.css"

const RestaurantDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [deliveryType, setDeliveryType] = useState("delivery")
  const [selectedProduct, setSelectedProduct] = useState(null)

  const restaurant = {
    id: Number.parseInt(id),
    name: id === "1" ? "China food express" : "Tio hamburguesas",
    deliveryFee: id === "1" ? 40 : 30,
    time: id === "1" ? "25 min" : "35 min",
    rating: id === "1" ? 4.8 : 4.3,
    image:
      id === "1"
        ? "https://replicate.delivery/xezq/monQhT7Oi9oKENXzcWfSA6nutB5X99NIOnt3MTNKM9lWTD4KA/tmpv03xtt6f.jpeg"
        : "https://replicate.delivery/xezq/8wSIBOehi51fT0TdffGCMg4hzid6mDx4TSrEicsukBT1aaAXB/tmph0wf36sr.jpeg",
  }

  const combos = [
    {
      id: 1,
      name: "Combo familiar",
      description: "3 hamburguesas\nPapas\nAderezos",
      price: 399,
      image: "https://replicate.delivery/xezq/Lnr8PN2feXt8nU6eeJSqzgqUd9c29fpUDHjjf2tPM9GhrpBcF/tmpx6rnyay4.jpeg",
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    },
  ]

  const promotions = [
    {
      id: 2,
      name: "Hamburguesa calsica",
      description: "Hamburguesa\nPapas",
      price: 180,
      image: "https://replicate.delivery/xezq/vfSntoCle4kTPEHEIXri87CrfbjRk1WcWo4UOOSf7giVbaAXB/tmpntww_wa8.jpeg",
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    },
    {
      id: 3,
      name: "Hot Dog clasico",
      description: "Hot Dog mediano\nPapas",
      price: 120,
      image: "https://replicate.delivery/xezq/wAUToxf6k21afkLGxqShf2gfUDoD96E83ALf9IUIWcXp10AuC/tmp79upy8ze.jpeg",
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    },
  ]

  return (
    <>
      <div className="restaurant-page">
        <button className="back-button" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <Header />

        <div className="restaurant-header">
          <img src={restaurant.image || "/placeholder.svg"} alt={restaurant.name} className="restaurant-header-image" />
        </div>

        <div className="restaurant-content">
          <div className="restaurant-title-section">
            <h1 className="restaurant-title">{restaurant.name}</h1>
            <div className="restaurant-info-row">
              <div className="info-item">
                <span className="info-label">Envío:</span>
                <span className="info-value">${restaurant.deliveryFee}</span>
              </div>
              <div className="info-item">
                <Clock size={16} />
                <span className="info-value">{restaurant.time}</span>
              </div>
              <div className="info-item">
                <Star size={16} fill="var(--star-yellow)" color="var(--star-yellow)" />
                <span className="info-value">{restaurant.rating}</span>
              </div>
            </div>
          </div>

          <div className="delivery-type-selector">
            <button
              className={`delivery-type-button ${deliveryType === "delivery" ? "active" : ""}`}
              onClick={() => setDeliveryType("delivery")}
            >
              Entrega
            </button>
            <button
              className={`delivery-type-button ${deliveryType === "pickup" ? "active" : ""}`}
              onClick={() => setDeliveryType("pickup")}
            >
              Recolección
            </button>
          </div>

          <div className="menu-section">
            <h2 className="menu-title">Combos</h2>
            <div className="product-grid">
              {combos.map((product) => (
                <div key={product.id} className="product-card" onClick={() => setSelectedProduct(product)}>
                  <img src={product.image || "/placeholder.svg"} alt={product.name} className="product-image" />
                  <div className="product-info">
                    <h3 className="product-title">{product.name}</h3>
                    <p className="product-description">{product.description}</p>
                    <div className="product-footer">
                      <span className="product-price">${product.price}</span>
                      <button className="add-button">+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="menu-section">
            <h2 className="menu-title">Promoción</h2>
            <div className="product-grid">
              {promotions.map((product) => (
                <div key={product.id} className="product-card" onClick={() => setSelectedProduct(product)}>
                  <img src={product.image || "/placeholder.svg"} alt={product.name} className="product-image" />
                  <div className="product-info">
                    <h3 className="product-title">{product.name}</h3>
                    <p className="product-description">{product.description}</p>
                    <div className="product-footer">
                      <span className="product-price">${product.price}</span>
                      <button className="add-button">+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <BottomNav />
      </div>

      {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
    </>
  )
}

export default RestaurantDetail
