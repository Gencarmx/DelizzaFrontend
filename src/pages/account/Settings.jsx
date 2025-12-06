"use client"

import { useState } from "react"
import { Globe, Moon, Shield, HelpCircle } from "lucide-react"
import Header from "../../components/Header"
import "../../pagesCss/account/Settings.css"

function Settings() {
  const [darkMode, setDarkMode] = useState(false)
  const [language, setLanguage] = useState("es")

  return (
    <div className="settings-page">
      <Header title="Configuración" showBack={true} />

      <div className="settings-content">
        <div className="settings-section">
          <h3 className="section-title">Preferencias</h3>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-icon">
                <Globe size={20} />
              </div>
              <div>
                <h4 className="setting-title">Idioma</h4>
                <p className="setting-description">Español</p>
              </div>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-icon">
                <Moon size={20} />
              </div>
              <div>
                <h4 className="setting-title">Modo oscuro</h4>
                <p className="setting-description">Tema oscuro para la aplicación</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="section-title">Seguridad</h3>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-icon">
                <Shield size={20} />
              </div>
              <div>
                <h4 className="setting-title">Cambiar contraseña</h4>
                <p className="setting-description">Actualiza tu contraseña</p>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="section-title">Ayuda</h3>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-icon">
                <HelpCircle size={20} />
              </div>
              <div>
                <h4 className="setting-title">Centro de ayuda</h4>
                <p className="setting-description">Preguntas frecuentes y soporte</p>
              </div>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-icon">
                <HelpCircle size={20} />
              </div>
              <div>
                <h4 className="setting-title">Términos y condiciones</h4>
                <p className="setting-description">Lee nuestros términos de servicio</p>
              </div>
            </div>
          </div>
        </div>

        <div className="app-version">
          <p>Versión 1.0.0</p>
        </div>
      </div>
    </div>
  )
}

export default Settings
