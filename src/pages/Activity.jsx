import { Clock, CheckCircle, XCircle } from "lucide-react"
import Header from "../components/Header"
import BottomNav from "../components/BottomNav"
import "./Activity.css"

const Activity = () => {
  const orders = [
    {
      id: 1,
      restaurantName: "China food express",
      items: ["Combo familiar", "Sushi roll"],
      total: 434,
      status: "delivered",
      date: "2024-12-04",
      time: "14:30",
    },
    {
      id: 2,
      restaurantName: "Tio hamburguesas",
      items: ["Hamburguesa calsica", "Papas"],
      total: 200,
      status: "in-progress",
      date: "2024-12-04",
      time: "18:45",
    },
    {
      id: 3,
      restaurantName: "Kinich",
      items: ["Hot Dog clasico"],
      total: 140,
      status: "cancelled",
      date: "2024-12-03",
      time: "12:15",
    },
  ]

  const getStatusIcon = (status) => {
    switch (status) {
      case "delivered":
        return <CheckCircle size={24} color="#34C759" />
      case "in-progress":
        return <Clock size={24} color="#FF9500" />
      case "cancelled":
        return <XCircle size={24} color="#FF3B30" />
      default:
        return null
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "delivered":
        return "Entregado"
      case "in-progress":
        return "En progreso"
      case "cancelled":
        return "Cancelado"
      default:
        return ""
    }
  }

  return (
    <div className="page">
      <Header showCart={false} title="Actividad" />
      <div className="container">
        {orders.length === 0 ? (
          <div className="empty-state">
            <Clock size={64} color="var(--text-gray)" />
            <p className="empty-text">No tienes pedidos aún</p>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <div className="order-restaurant">
                    <h3 className="restaurant-name">{order.restaurantName}</h3>
                    <p className="order-date">
                      {order.date} • {order.time}
                    </p>
                  </div>
                  <div className="order-status">{getStatusIcon(order.status)}</div>
                </div>
                <div className="order-items">
                  {order.items.map((item, index) => (
                    <span key={index} className="order-item">
                      {item}
                      {index < order.items.length - 1 && ", "}
                    </span>
                  ))}
                </div>
                <div className="order-footer">
                  <span className="order-status-text">{getStatusText(order.status)}</span>
                  <span className="order-total">${order.total}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}

export default Activity
