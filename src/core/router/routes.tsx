import type { RouteObject } from "react-router";
import { ProtectedRoute } from "@core/router/ProtectedRoute";
import RootLayout from "@presentation/layouts/RootLayout";
import RestaurantLayout from "@presentation/layouts/RestaurantLayout";
import Home from "@presentation/pages/Home";
import About from "@presentation/pages/About";
import Products from "@presentation/pages/Products";
import { productsLoader } from "@core/router/loaders/productsLoader";
import NotFound from "@presentation/pages/NotFound";
// import Favorites from "@presentation/pages/Favorites";
import Activity from "@presentation/pages/Activity";
import { Login, Register, RegisterOwner, PendingApproval, ForgotPassword, ResetPassword } from "@presentation/pages/auth";
import { Account, UserProfile, EditProfile } from "@presentation/pages/profile";
import {
  Settings,
  PaymentMethods,
  SavedAddresses,
  Notifications,
  BusinessHours,
  BusinessInfo,
} from "@presentation/pages/settings";
import Cart from "@presentation/pages/Cart";
import RestaurantDetail from "@presentation/pages/RestaurantDetail";
import {
  Dashboard,
  ProductList,
  ProductAdd,
  ProductEdit,
  Orders,
  RestaurantNotifications,
} from "@presentation/pages/restaurantUI";
import AdminDashboard from "@presentation/pages/adminProfileUI/AdminDashboard";
import AdminBillingDashboard from "@presentation/pages/adminProfileUI/adminBillingDashboard";
import AdminOrdersDashboard from "@presentation/pages/adminProfileUI/AdminOrdersDashboard";

export const routes: RouteObject[] = [
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/register-owner",
    element: <RegisterOwner />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "/pending-approval",
    element: (
      <ProtectedRoute allowedRoles={["owner"]}>
        <PendingApproval />
      </ProtectedRoute>
    ),
  },
  {
    path: "/",
    element: (
      <ProtectedRoute allowedRoles={["client"]}>
        <RootLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "about",
        element: <About />,
      },
      /*
      {
        path: "favorites",
        element: <Favorites />,
      },
      */
      {
        path: "activity",
        element: <Activity />,
      },
      {
        path: "account",
        element: <Account />,
      },
      {
        path: "notifications",
        element: <Notifications />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "payment-methods",
        element: <PaymentMethods />,
      },
      {
        path: "edit-profile",
        element: <EditProfile />,
      },
      {
        path: "saved-addresses",
        element: <SavedAddresses />,
      },
      {
        path: "cart",
        element: <Cart />,
      },
      {
        path: "user/:userId",
        element: <UserProfile />,
      },
      {
        path: "products",
        element: <Products />,
        loader: productsLoader,
      },
      {
        path: "restaurant-detail/:restaurantId",
        element: <RestaurantDetail />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/billing",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminBillingDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/orders",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminOrdersDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/restaurant",
    element: (
      <ProtectedRoute allowedRoles={["owner"]}>
        <RestaurantLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "products",
        element: <ProductList />,
      },
      {
        path: "products/add",
        element: <ProductAdd />,
      },
      {
        path: "products/edit/:productId",
        element: <ProductEdit />,
      },
      {
        path: "orders",
        element: <Orders />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "settings/business-hours",
        element: <BusinessHours />,
      },
      {
        path: "settings/business-info",
        element: <BusinessInfo />,
      },
      {
        path: "settings/notifications",
        element: <RestaurantNotifications />,
      },
    ],
  },
];
