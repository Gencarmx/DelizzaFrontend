"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff } from "lucide-react"
import "../pagesCss/Register.css"

function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name) {
      newErrors.name = "El nombre es requerido"
    }

    if (!formData.email) {
      newErrors.email = "El correo es requerido"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Correo inválido"
    }

    if (!formData.phone) {
      newErrors.phone = "El teléfono es requerido"
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Teléfono inválido (10 dígitos)"
    }

    if (!formData.password) {
      newErrors.password = "La contraseña es requerida"
    } else if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres"
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirma tu contraseña"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (validateForm()) {
      alert("Registro exitoso")
      navigate("/login")
    }
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-logo">
          <div className="logo-circle-large">
            <span className="logo-letter">D</span>
          </div>
          <h1 className="app-title">DELIVERY APP</h1>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <h2 className="form-title">Crear Cuenta</h2>

          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Nombre completo
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className={`form-input ${errors.name ? "error" : ""}`}
              placeholder="Juan Pérez"
              value={formData.name}
              onChange={handleChange}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Correo electrónico
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className={`form-input ${errors.email ? "error" : ""}`}
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleChange}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              Teléfono
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className={`form-input ${errors.phone ? "error" : ""}`}
              placeholder="9999999999"
              value={formData.phone}
              onChange={handleChange}
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Contraseña
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                className={`form-input ${errors.password ? "error" : ""}`}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirmar contraseña
            </label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                className={`form-input ${errors.confirmPassword ? "error" : ""}`}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>

          <button type="submit" className="submit-btn">
            Registrarse
          </button>

          <div className="divider">
            <span>o</span>
          </div>

          <button type="button" className="login-link-btn" onClick={() => navigate("/login")}>
            ¿Ya tienes cuenta? <span className="highlight">Inicia Sesión</span>
          </button>
        </form>
      </div>
    </div>
  )
}

export default Register
