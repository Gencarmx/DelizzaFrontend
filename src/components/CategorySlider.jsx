import "./CategorySlider.css"

const CategorySlider = () => {
  const categories = [
    { id: 1, name: "Pizzas", emoji: "🍕" },
    { id: 2, name: "Bebidas", emoji: "🧋" },
    { id: 3, name: "Postres", emoji: "🍰" },
    { id: 4, name: "Burger", emoji: "🍔" },
  ]

  return (
    <div className="category-slider">
      {categories.map((category) => (
        <button key={category.id} className="category-item">
          <div className="category-icon">{category.emoji}</div>
          <span className="category-name">{category.name}</span>
        </button>
      ))}
    </div>
  )
}

export default CategorySlider
