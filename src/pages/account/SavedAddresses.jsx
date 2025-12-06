"use client"

import { Plus, MapPin, Edit2, Trash2 } from "lucide-react"
import Header from "../../components/Header"
import { useApp } from "../../context/AppContext"
import "../../pagesCss/account/SavedAddresses.css"

function SavedAddresses() {
  const { savedAddresses } = useApp()

  return (
    <div className="saved-addresses-page">
      <Header title="Direcciones guardadas" showBack={true} />

      <div className="addresses-content">
        <button className="add-address-btn">
          <Plus size={20} />
          <span>Agregar nueva dirección</span>
        </button>

        <div className="addresses-list">
          {savedAddresses.map((address) => (
            <div key={address.id} className="address-card">
              <div className="address-icon">
                <MapPin size={24} />
              </div>
              <div className="address-info">
                <h3 className="address-name">{address.name}</h3>
                <p className="address-text">{address.address}</p>
                {address.isDefault && <span className="default-badge">Predeterminado</span>}
              </div>
              <div className="address-actions">
                <button className="action-btn edit">
                  <Edit2 size={18} />
                </button>
                <button className="action-btn delete">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SavedAddresses
