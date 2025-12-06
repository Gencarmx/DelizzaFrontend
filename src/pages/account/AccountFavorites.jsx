"use client"

import { useState } from "react"
import Header from "../../components/Header"
import ProductCard from "../../components/ProductCard"
import RestaurantCard from "../../components/RestaurantCard"
import ProductModal from "../../components/ProductModal"
import { useApp } from "../../context/AppContext"
import { localFavorites, restaurants, products } from "../../data/mockData"
import "../../pagesCss/account/AccountFavorites.css"

function AccountFavorites() {
  const { favorites } = useApp()
  const [activeTab, setActiveTab] = useState("restaurants")
  const [showProductModal, setShowProductModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  const favoriteRestaurants = restaurants.filter((r) => favorites.includes(r.id))
  const favoriteDishes = localFavorites.filter((d) => favorites.includes(d.id))

  const handleProductClick = (product) => {
    setSelectedProduct(products[0])
    setShowProductModal(true)
  }

  return (
    <div className="account-favorites-page">
      <Header title="Favoritos" showBack={true} />

      <div className="favorites-tabs">
        <button
          className={`tab-btn ${activeTab === "restaurants" ? "active" : ""}`}
          onClick={() => setActiveTab("restaurants")}
        >
          Restaurantes
        </button>
        <button className={`tab-btn ${activeTab === "dishes" ? "active" : ""}`} onClick={() => setActiveTab("dishes")}>
          Platillos
        </button>
      </div>

      <div className="favorites-content">
        {activeTab === "restaurants" && (
          <>
            {favoriteRestaurants.length === 0 ? (
              <div className="empty-state">
                <p>No tienes restaurantes favoritos</p>
              </div>
            ) : (
              <div className="favorites-grid">
                {favoriteRestaurants.map((restaurant) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "dishes" && (
          <>
            {favoriteDishes.length === 0 ? (
              <div className="empty-state">
                <p>No tienes platillos favoritos</p>
              </div>
            ) : (
              <div className="favorites-grid">
                {favoriteDishes.map((dish) => (
                  <ProductCard key={dish.id} product={dish} onClick={() => handleProductClick(dish)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showProductModal && selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setShowProductModal(false)} />
      )}
    </div>
  )
}

export default AccountFavorites
