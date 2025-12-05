"use client"

import { useState } from "react"
import { ChevronDown, MapPin, Edit2, X } from "lucide-react"
import "./AddressSelector.css"

const AddressSelector = () => {
  const [showModal, setShowModal] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState({
    name: "Oficina de trabajo",
    address: "Calle 25 77517 Izamal",
  })

  const savedAddresses = [
    { id: 1, name: "Oficina de trabajo", address: "Calle 25 77517 Izamal" },
    { id: 2, name: "Oficina de trabajo", address: "Calle 25 77517 Izamal" },
    { id: 3, name: "Oficina de trabajo", address: "Calle 25 77517 Izamal" },
  ]

  return (
    <>
      <button className="address-selector" onClick={() => setShowModal(true)}>
        <MapPin size={16} />
        <span className="address-text">Calle 25 77517 Izamal</span>
        <ChevronDown size={16} />
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="location-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>
              <X size={24} />
            </button>

            <div className="location-search">
              <input type="text" placeholder="Busca una direccion" className="location-input" />
            </div>

            <div className="location-section">
              <h3 className="section-title">Ubicacion actual</h3>
              <div className="location-item current">
                <MapPin size={20} />
                <div className="location-info">
                  <div className="location-name">{selectedAddress.name}</div>
                  <div className="location-address">{selectedAddress.address}</div>
                </div>
                <button className="edit-button">
                  <Edit2 size={18} />
                </button>
              </div>
            </div>

            <div className="location-section">
              <h3 className="section-title">Mis ubicaciones</h3>
              {savedAddresses.map((address) => (
                <div
                  key={address.id}
                  className="location-item"
                  onClick={() => {
                    setSelectedAddress(address)
                    setShowModal(false)
                  }}
                >
                  <MapPin size={20} />
                  <div className="location-info">
                    <div className="location-name">{address.name}</div>
                    <div className="location-address">{address.address}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AddressSelector
