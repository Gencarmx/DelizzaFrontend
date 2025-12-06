"use client"

import { useNavigate } from "react-router-dom"
import { ChevronRight, User, MapPin, CreditCard, Heart, Bell, Settings, LogOut } from "lucide-react"
import BottomNavigation from "../components/BottomNavigation"
import { useApp } from "../context/AppContext"
import "../pagesCss/Account.css"

function Account() {
  const navigate = useNavigate()
  const { currentUser } = useApp()

  const menuItems = [
    { icon: User, label: "Editar perfil", path: "/account/edit-profile" },
    { icon: MapPin, label: "Direcciones guardadas", path: "/account/addresses" },
    { icon: CreditCard, label: "Métodos de pago", path: "/account/payment-methods" },
    { icon: Heart, label: "Favoritos", path: "/account/favorites" },
    { icon: Bell, label: "Notificaciones", path: "/account/notifications" },
    { icon: Settings, label: "Configuración", path: "/account/settings" },
  ]

  const handleLogout = () => {
    alert("Cerrando sesión...")
    navigate("/login")
  }

  return (
    <div className="account-page">
      <div className="account-header">
        <h1>Cuenta</h1>
      </div>

      <div className="account-content">
        <div className="user-profile">
          <div className="user-avatar">
            <User size={32} />
          </div>
          <div className="user-info">
            <h2 className="user-name">{currentUser.name}</h2>
            <p className="user-email">{currentUser.email}</p>
          </div>
        </div>

        <div className="menu-list">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button key={index} className="menu-item" onClick={() => navigate(item.path)}>
                <div className="menu-item-left">
                  <Icon size={20} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight size={20} />
              </button>
            )
          })}
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Cerrar sesión</span>
        </button>
      </div>

      <BottomNavigation />
    </div>
  )
}

export default Account
