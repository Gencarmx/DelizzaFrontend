"use client"

import { useState } from "react"
import { Bell, Mail, Tag, TrendingUp } from "lucide-react"
import Header from "../../components/Header"
import "../../pagesCss/account/Notifications.css"

function Notifications() {
  const [settings, setSettings] = useState({
    orderUpdates: true,
    promotions: false,
    newsletter: true,
    recommendations: true,
  })

  const handleToggle = (key) => {
    setSettings({
      ...settings,
      [key]: !settings[key],
    })
  }

  return (
    <div className="notifications-page">
      <Header title="Notificaciones" showBack={true} />

      <div className="notifications-content">
        <div className="notification-item">
          <div className="notification-info">
            <div className="notification-icon">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="notification-title">Actualizaciones de pedidos</h3>
              <p className="notification-description">Recibe notificaciones sobre el estado de tus pedidos</p>
            </div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={settings.orderUpdates} onChange={() => handleToggle("orderUpdates")} />
            <span className="slider"></span>
          </label>
        </div>

        <div className="notification-item">
          <div className="notification-info">
            <div className="notification-icon">
              <Tag size={20} />
            </div>
            <div>
              <h3 className="notification-title">Promociones</h3>
              <p className="notification-description">Recibe ofertas y descuentos especiales</p>
            </div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={settings.promotions} onChange={() => handleToggle("promotions")} />
            <span className="slider"></span>
          </label>
        </div>

        <div className="notification-item">
          <div className="notification-info">
            <div className="notification-icon">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="notification-title">Newsletter</h3>
              <p className="notification-description">Recibe noticias y actualizaciones por correo</p>
            </div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={settings.newsletter} onChange={() => handleToggle("newsletter")} />
            <span className="slider"></span>
          </label>
        </div>

        <div className="notification-item">
          <div className="notification-info">
            <div className="notification-icon">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="notification-title">Recomendaciones</h3>
              <p className="notification-description">Recibe sugerencias personalizadas</p>
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.recommendations}
              onChange={() => handleToggle("recommendations")}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default Notifications
