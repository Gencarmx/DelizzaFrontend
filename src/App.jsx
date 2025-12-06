import { Routes, Route } from "react-router-dom"
import Feed from "./pages/Feed"
import Restaurant from "./pages/Restaurant"
import Cart from "./pages/Cart"
import Favorites from "./pages/Favorites"
import Activity from "./pages/Activity"
import Account from "./pages/Account"
import Login from "./pages/Login"
import Register from "./pages/Register"
import EditProfile from "./pages/account/EditProfile"
import SavedAddresses from "./pages/account/SavedAddresses"
import PaymentMethods from "./pages/account/PaymentMethods"
import AccountFavorites from "./pages/account/AccountFavorites"
import Notifications from "./pages/account/Notifications"
import Settings from "./pages/account/Settings"
import "./App.css"

function App() {
  return (
    <div className="app-container">
      <Routes>
        {/* Main Routes - Open for development */}
        <Route path="/" element={<Feed />} />
        <Route path="/restaurant/:id" element={<Restaurant />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/account" element={<Account />} />

        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Account Sub-pages */}
        <Route path="/account/edit-profile" element={<EditProfile />} />
        <Route path="/account/addresses" element={<SavedAddresses />} />
        <Route path="/account/payment-methods" element={<PaymentMethods />} />
        <Route path="/account/favorites" element={<AccountFavorites />} />
        <Route path="/account/notifications" element={<Notifications />} />
        <Route path="/account/settings" element={<Settings />} />
      </Routes>
    </div>
  )
}

export default App
