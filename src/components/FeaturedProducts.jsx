"use client"

import { useState } from "react"
import { Heart, Clock, Star } from "lucide-react"
import ProductModal from "./ProductModal"
import "./FeaturedProducts.css"

const FeaturedProducts = () => {
  const [selectedProduct, setSelectedProduct] = useState(null)

  const products = [
    {
      id: 1,
      name: "Tio hamburguesas",
      price: 30,
      rating: 4.3,
      time: "35 min",
      image:
        "https://replicate.delivery/xezq/uMu9N3nHpH4gI1JaX4Cw4Umm0w1hfdyJ2am6DMPl60AXTD4KA/tmpp9xiciva.jpeg",
      restaurantId: 1,
      restaurantName: "Tio hamburguesas",
    },
    {
      id: 2,
      name: "Sushi roll",
      price: 35,
      rating: 3.0,
      time: "40 min",
      image: "https://replicate.delivery/xezq/dARE2hoEvUaLIV3lqvsuewG3CvybL5ucTSWVvGANmb0aTD4KA/tmpicls506j.jpeg",
      restaurantId: 2,
      restaurantName: "Sushi Express",
    },
  ]

  return (
    <>
      <div className="featured-section">
        <h2 className="section-title">El favorito entre los locales</h2>
        <div className="featured-grid">
          {products.map((product) => (
            <div key={product.id} className="featured-card" onClick={() => setSelectedProduct(product)}>
              <div className="featured-image">
                <img src={product.image || "/placeholder.svg"} alt={product.name} />
                <button className="favorite-button">
                  <Heart size={20} />
                </button>
              </div>
              <div className="featured-info">
                <h3 className="product-name">{product.name}</h3>
                <div className="product-details">
                  <Star size={14} fill="var(--star-yellow)" color="var(--star-yellow)" />
                  <span className="rating">{product.rating}</span>
                  <span className="separator">•</span>
                  <span className="price">Envío: ${product.price}</span>
                  <span className="separator">•</span>
                  <Clock size={14} />
                  <span className="time">{product.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
    </>
  )
}

export default FeaturedProducts
