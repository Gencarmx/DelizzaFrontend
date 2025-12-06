"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff } from "lucide-react"
import "../pagesCss/Login.css"

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})

  const validateForm = () => {
    const newErrors = {}

    if (!email) {
      newErrors.email = "El correo es requerido"
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Correo inválido"
    }

    if (!password) {
      newErrors.password = "La contraseña es requerida"
    } else if (password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (validateForm()) {
      alert("Inicio de sesión exitoso")
      navigate("/")
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo">
          <div className="logo-circle-large">
            <span className="logo-letter">D</span>
          </div>
          <h1 className="app-title">DELIVERY APP</h1>
          <p className="app-subtitle">Tu comida favorita a un click</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <h2 className="form-title">Iniciar Sesión</h2>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Correo electrónico
            </label>
            <input
              type="email"
              id="email"
              className={`form-input ${errors.email ? "error" : ""}`}
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Contraseña
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className={`form-input ${errors.password ? "error" : ""}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <button type="button" className="forgot-password-btn">
            ¿Olvidaste tu contraseña?
          </button>

          <button type="submit" className="submit-btn">
            Iniciar Sesión
          </button>

          <div className="divider">
            <span>o</span>
          </div>

          <button type="button" className="register-link-btn" onClick={() => navigate("/register")}>
            ¿No tienes cuenta? <span className="highlight">Regístrate</span>
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
