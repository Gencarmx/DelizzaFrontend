"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ShoppingCart } from "lucide-react"
import BottomNavigation from "../components/BottomNavigation"
import ProductCard from "../components/ProductCard"
import RestaurantCard from "../components/RestaurantCard"
import CategoryButton from "../components/CategoryButton"
import AddressBar from "../components/AddressBar"
import LocationModal from "../components/LocationModal"
import ProductModal from "../components/ProductModal"
import { useApp } from "../context/AppContext"
import { categories, localFavorites, restaurants, products } from "../data/mockData"
import "../pagesCss/Feed.css"

function Feed() {
  const navigate = useNavigate()
  const { getCartCount, currentAddress } = useApp()
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const cartCount = getCartCount()

  const handleProductClick = (product) => {
    setSelectedProduct(product)
    setShowProductModal(true)
  }

  return (
    <div className="feed-page">
      <div className="feed-header">
        <div className="logo-container">
          <div className="logo-circle">
            <span className="logo-text">D</span>
          </div>
          <span className="logo-subtitle">DELIVERY APP</span>
        </div>
        <button className="cart-icon-btn" onClick={() => navigate("/cart")}>
          <ShoppingCart size={24} />
          {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
        </button>
      </div>

      <div className="feed-content">
        <AddressBar
          address={currentAddress?.address || "Calle 25 77517 Izamal"}
          onClick={() => setShowLocationModal(true)}
        />

        <div className="search-section">
          <h2 className="section-title">¿Que se te antoja hoy?</h2>
        </div>

        <div className="categories-scroll">
          {categories.map((category) => (
            <CategoryButton
              key={category.id}
              category={category}
              isActive={selectedCategory === category.id}
              onClick={() => setSelectedCategory(category.id === selectedCategory ? null : category.id)}
            />
          ))}
        </div>

        <section className="favorites-section">
          <h3 className="section-heading">El favorito entre los locales</h3>
          <div className="favorites-grid">
            {localFavorites.map((item) => (
              <ProductCard key={item.id} product={item} onClick={() => handleProductClick(products[0])} />
            ))}
          </div>
        </section>

        <section className="restaurants-section">
          <div className="section-header">
            <h3 className="section-heading">Restaurantes</h3>
            <button className="see-more-btn">Ver mas</button>
          </div>
          <div className="restaurants-grid">
            {restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        </section>

        <div className="scroll-up-btn">
          <button className="fab-btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            ↑
          </button>
        </div>
      </div>

      <BottomNavigation />

      {showLocationModal && <LocationModal onClose={() => setShowLocationModal(false)} />}
      {showProductModal && selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setShowProductModal(false)} />
      )}
    </div>
  )
}

export default Feed
