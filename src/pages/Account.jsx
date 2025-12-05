"use client"

import { User, MapPin, CreditCard, Heart, Bell, Settings, LogOut, ChevronRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Header from "../components/Header"
import BottomNav from "../components/BottomNav"
import "./Account.css"

const Account = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const menuItems = [
    { icon: User, label: "Editar perfil", action: () => {} },
    { icon: MapPin, label: "Direcciones guardadas", action: () => {} },
    { icon: CreditCard, label: "Métodos de pago", action: () => {} },
    { icon: Heart, label: "Favoritos", action: () => navigate("/favorites") },
    { icon: Bell, label: "Notificaciones", action: () => {} },
    { icon: Settings, label: "Configuración", action: () => {} },
  ]

  return (
    <div className="page">
      <Header showCart={false} title="Cuenta" />
      <div className="container">
        <div className="profile-header">
          <div className="profile-avatar">
            <User size={40} />
          </div>
          <div className="profile-info">
            <h2 className="profile-name">{user?.name || "Usuario"}</h2>
            <p className="profile-email">{user?.email || "usuario@email.com"}</p>
            {user?.phone && <p className="profile-phone">{user.phone}</p>}
          </div>
        </div>

        <div className="menu-section">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button key={index} className="menu-item" onClick={item.action}>
                <div className="menu-item-content">
                  <Icon size={22} className="menu-icon" />
                  <span className="menu-label">{item.label}</span>
                </div>
                <ChevronRight size={20} className="menu-arrow" />
              </button>
            )
          })}
        </div>

        <button className="logout-button" onClick={handleLogout}>
          <LogOut size={22} />
          <span>Cerrar sesión</span>
        </button>
      </div>
      <BottomNav />
    </div>
  )
}

export default Account
