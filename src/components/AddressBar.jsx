"use client"

import { MapPin } from "lucide-react"
import "../componentsCss/AddressBar.css"

function AddressBar({ address, onClick }) {
  return (
    <button className="address-bar" onClick={onClick}>
      <MapPin size={16} />
      <span className="address-text">{address}</span>
    </button>
  )
}

export default AddressBar
