"use client"

import { Package, Clock, CheckCircle, XCircle } from "lucide-react"
import BottomNavigation from "../components/BottomNavigation"
import "../pagesCss/Activity.css"

function Activity() {
  const orders = [
    {
      id: 1,
      restaurant: "Tio hamburguesas",
      items: ["Combo familiar"],
      total: 399,
      status: "delivered",
      date: "2024-01-15",
      time: "14:30",
    },
    {
      id: 2,
      restaurant: "China food express",
      items: ["Pollo con vegetales", "Arroz frito"],
      total: 280,
      status: "in-progress",
      date: "2024-01-16",
      time: "19:45",
    },
    {
      id: 3,
      restaurant: "Kinch",
      items: ["Cochinita pibil", "Agua de horchata"],
      total: 195,
      status: "pending",
      date: "2024-01-17",
      time: "13:20",
    },
    {
      id: 4,
      restaurant: "Tio hamburguesas",
      items: ["Hamburguesa clasica", "Papas"],
      total: 180,
      status: "cancelled",
      date: "2024-01-14",
      time: "20:15",
    },
  ]

  const getStatusIcon = (status) => {
    switch (status) {
      case "delivered":
        return <CheckCircle size={20} color="#4caf50" />
      case "in-progress":
        return <Clock size={20} color="#fdd835" />
      case "pending":
        return <Package size={20} color="#2196f3" />
      case "cancelled":
        return <XCircle size={20} color="#f44336" />
      default:
        return null
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "delivered":
        return "Entregado"
      case "in-progress":
        return "En camino"
      case "pending":
        return "Pendiente"
      case "cancelled":
        return "Cancelado"
      default:
        return ""
    }
  }

  return (
    <div className="activity-page">
      <div className="activity-header">
        <h1>Actividad</h1>
      </div>

      <div className="activity-content">
        <h2 className="section-title">Pedidos recientes</h2>
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div className="order-status">
                  {getStatusIcon(order.status)}
                  <span className={`status-text ${order.status}`}>{getStatusText(order.status)}</span>
                </div>
                <span className="order-date">
                  {order.date} - {order.time}
                </span>
              </div>
              <h3 className="order-restaurant">{order.restaurant}</h3>
              <ul className="order-items">
                {order.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
              <div className="order-footer">
                <span className="order-total">Total: ${order.total}</span>
                <button className="reorder-btn">Volver a ordenar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}

export default Activity
