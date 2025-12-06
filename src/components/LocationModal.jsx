"use client"

import { useState } from "react"
import { X, Search, MapPin, Edit2 } from "lucide-react"
import { useApp } from "../context/AppContext"
import "../componentsCss/LocationModal.css"

function LocationModal({ onClose }) {
  const { savedAddresses, currentAddress, setCurrentAddress } = useApp()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSelectAddress = (address) => {
    setCurrentAddress(address)
    onClose()
  }

  const filteredAddresses = savedAddresses.filter((addr) =>
    addr.address.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content location-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="location-modal-body">
          <div className="search-container">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Busca una direccion"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="current-location-section">
            <h3 className="section-title">Ubicacion actual</h3>
            {currentAddress && (
              <div className="location-card current">
                <div className="location-icon">
                  <MapPin size={24} />
                </div>
                <div className="location-info">
                  <h4 className="location-name">{currentAddress.name}</h4>
                  <p className="location-address">{currentAddress.address}</p>
                </div>
                <button className="edit-btn">
                  <Edit2 size={18} />
                </button>
              </div>
            )}
          </div>

          <div className="saved-locations-section">
            <h3 className="section-title">Mis ubicaciones</h3>
            <div className="locations-list">
              {filteredAddresses.map((address) => (
                <div
                  key={address.id}
                  className="location-card"
                  onClick={() => handleSelectAddress(address)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="location-icon">
                    <MapPin size={24} />
                  </div>
                  <div className="location-info">
                    <h4 className="location-name">{address.name}</h4>
                    <p className="location-address">{address.address}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LocationModal
