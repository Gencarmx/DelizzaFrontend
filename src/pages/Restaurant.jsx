"use client"

import { useState } from "react"
import { useParams } from "react-router-dom"
import Header from "../components/Header"
import MenuItem from "../components/MenuItem"
import ProductModal from "../components/ProductModal"
import { restaurants, products } from "../data/mockData"
import "../pagesCss/Restaurant.css"

function Restaurant() {
  const { id } = useParams()
  const restaurant = restaurants.find((r) => r.id === Number.parseInt(id))
  const [deliveryType, setDeliveryType] = useState("delivery")
  const [showProductModal, setShowProductModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  if (!restaurant) {
    return <div>Restaurante no encontrado</div>
  }

  const restaurantProducts = products.filter((p) => p.restaurantId === restaurant.id)
  const combos = restaurantProducts.filter((p) => p.category === "Combos")
  const promotions = restaurantProducts.filter((p) => p.category === "Promoción")

  const handleProductClick = (product) => {
    setSelectedProduct(product)
    setShowProductModal(true)
  }

  return (
    <div className="restaurant-page">
      <Header title="" showBack={true} showCart={true} />

      <div className="restaurant-hero">
        <img src={restaurant.headerImage || restaurant.image} alt={restaurant.name} className="hero-image" />
      </div>

      <div className="restaurant-info-card">
        <h1 className="restaurant-title">{restaurant.name}</h1>
        <div className="restaurant-details">
          <span>Envío: ${restaurant.deliveryCost}</span>
          <span>{restaurant.deliveryTime} min</span>
          <span className="restaurant-rating">
            <span className="star">★</span> {restaurant.rating.toFixed(1)}
          </span>
        </div>

        <div className="delivery-toggle">
          <button
            className={`toggle-btn ${deliveryType === "delivery" ? "active" : ""}`}
            onClick={() => setDeliveryType("delivery")}
          >
            Entrega
          </button>
          <button
            className={`toggle-btn ${deliveryType === "pickup" ? "active" : ""}`}
            onClick={() => setDeliveryType("pickup")}
          >
            Recoleccion
          </button>
        </div>
      </div>

      <div className="restaurant-content">
        {combos.length > 0 && (
          <section className="menu-section">
            <h2 className="menu-title">Combos</h2>
            <div className="menu-items">
              {combos.map((item) => (
                <MenuItem key={item.id} item={item} onAdd={handleProductClick} />
              ))}
            </div>
          </section>
        )}

        {promotions.length > 0 && (
          <section className="menu-section">
            <h2 className="menu-title">Promoción</h2>
            <div className="menu-items">
              {promotions.map((item) => (
                <MenuItem key={item.id} item={item} onAdd={handleProductClick} />
              ))}
            </div>
          </section>
        )}
      </div>

      {showProductModal && selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setShowProductModal(false)} />
      )}
    </div>
  )
}

export default Restaurant
