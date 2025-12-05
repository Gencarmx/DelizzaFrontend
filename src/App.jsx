import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Home from "./pages/Home"
import RestaurantDetail from "./pages/RestaurantDetail"
import Cart from "./pages/Cart"
import Favorites from "./pages/Favorites"
import Activity from "./pages/Activity"
import Account from "./pages/Account"
import { CartProvider } from "./context/CartContext"
import { AuthProvider } from "./context/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* 
              ⚠️ TEMPORAL: Rutas desprotegidas para revisión de diseño
              Para restaurar la protección después de la revisión, envuelve cada componente
              con <ProtectedRoute> de la siguiente forma:
              
              <Route 
                path="/ruta" 
                element={
                  <ProtectedRoute>
                    <Componente />
                  </ProtectedRoute>
                } 
              />
            */}
            <Route path="/" element={<Home />} />
            {/* Restaurar protección: <Route path="/restaurant/:id" element={<ProtectedRoute><RestaurantDetail /></ProtectedRoute>} /> */}
            <Route path="/restaurant/:id" element={<RestaurantDetail />} />
            {/* Restaurar protección: <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} /> */}
            <Route path="/cart" element={<Cart />} />
            {/* Restaurar protección: <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} /> */}
            <Route path="/favorites" element={<Favorites />} />
            {/* Restaurar protección: <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} /> */}
            <Route path="/activity" element={<Activity />} />
            {/* Restaurar protección: <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} /> */}
            <Route path="/account" element={<Account />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
