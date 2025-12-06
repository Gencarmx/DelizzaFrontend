"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Camera } from "lucide-react"
import Header from "../../components/Header"
import { useApp } from "../../context/AppContext"
import "../../pagesCss/account/EditProfile.css"

function EditProfile() {
  const navigate = useNavigate()
  const { currentUser, setCurrentUser } = useApp()
  const [formData, setFormData] = useState({
    name: currentUser.name,
    email: currentUser.email,
    phone: "9999999999",
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setCurrentUser({
      ...currentUser,
      name: formData.name,
      email: formData.email,
    })
    alert("Perfil actualizado")
    navigate("/account")
  }

  return (
    <div className="edit-profile-page">
      <Header title="Editar perfil" showBack={true} />

      <div className="edit-profile-content">
        <div className="avatar-section">
          <div className="avatar-container">
            <div className="avatar-placeholder">
              <span>{currentUser.name.charAt(0).toUpperCase()}</span>
            </div>
            <button className="change-photo-btn">
              <Camera size={18} />
            </button>
          </div>
          <p className="change-photo-text">Cambiar foto</p>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Nombre completo
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Correo electrónico
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              Teléfono
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="form-input"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="save-btn">
            Guardar cambios
          </button>
        </form>
      </div>
    </div>
  )
}

export default EditProfile
