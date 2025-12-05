"use client"

import { Home, Heart, Activity, User } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import "./BottomNav.css"

const BottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { icon: Home, label: "Inicio", path: "/" },
    { icon: Heart, label: "Favoritos", path: "/favorites" },
    { icon: Activity, label: "Actividad", path: "/activity" },
    { icon: User, label: "Cuenta", path: "/account" },
  ]

  return (
    <nav className="bottom-nav">
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
            <span className="nav-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
