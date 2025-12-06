"use client"

import "../componentsCss/CategoryButton.css"

function CategoryButton({ category, isActive, onClick }) {
  return (
    <button className={`category-btn ${isActive ? "active" : ""}`} onClick={onClick}>
      <div className="category-icon">
        <img src={category.icon || "/placeholder.svg"} alt={category.name} />
      </div>
      <span className="category-name">{category.name}</span>
    </button>
  )
}

export default CategoryButton
