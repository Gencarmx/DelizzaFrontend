"use client"

import { Plus } from "lucide-react"
import "../componentsCss/MenuItem.css"

function MenuItem({ item, onAdd }) {
  return (
    <div className="menu-item">
      <img src={item.image || "/placeholder.svg"} alt={item.name} className="menu-item-image" />
      <div className="menu-item-info">
        <h4 className="menu-item-name">{item.name}</h4>
        <p className="menu-item-description">{item.description}</p>
        <div className="menu-item-footer">
          <span className="menu-item-price">${item.price}</span>
          <button className="menu-item-add" onClick={() => onAdd(item)}>
            <Plus size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default MenuItem
