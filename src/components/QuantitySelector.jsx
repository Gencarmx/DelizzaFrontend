"use client"

import { Plus, Minus } from "lucide-react"
import "../componentsCss/QuantitySelector.css"

function QuantitySelector({ value, onChange, min = 1 }) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1)
    }
  }

  const handleIncrement = () => {
    onChange(value + 1)
  }

  return (
    <div className="quantity-selector">
      <button className="quantity-btn" onClick={handleDecrement} disabled={value <= min}>
        <Minus size={18} />
      </button>
      <span className="quantity-value">{value}</span>
      <button className="quantity-btn" onClick={handleIncrement}>
        <Plus size={18} />
      </button>
    </div>
  )
}

export default QuantitySelector
