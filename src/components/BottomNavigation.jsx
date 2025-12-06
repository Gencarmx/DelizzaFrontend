"use client"

import { useNavigate, useLocation } from "react-router-dom"
import { Home, Heart, Activity, User } from "lucide-react"
import "../componentsCss/BottomNavigation.css"

function BottomNavigation() {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { path: "/", icon: Home, label: "Inicio" },
    { path: "/favorites", icon: Heart, label: "Favoritos" },
    { path: "/activity", icon: Activity, label: "Actividad" },
    { path: "/account", icon: User, label: "Cuenta" },
  ]

  return (
    <nav className="bottom-navigation">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = location.pathname === item.path
        return (
          <button
            key={item.path}
            className={`nav-item ${isActive ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <Icon size={24} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNavigation
