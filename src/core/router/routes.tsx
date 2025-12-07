import type { RouteObject } from "react-router";
import RootLayout from "@presentation/layouts/RootLayout";
import Home from "@presentation/pages/Home";
import About from "@presentation/pages/About";
import UserProfile from "@presentation/pages/UserProfile";
import Products from "@presentation/pages/Products";
import { productsLoader } from "@core/router/loaders/productsLoader";
import NotFound from "@presentation/pages/NotFound";
import AuthLayout from "@presentation/layouts/AuthLayout";
import LoginPage from "@presentation/pages/LoginPage";
import RegisterPage from "@presentation/pages/RegisterPage";
import ProtectedRoute from "@core/router/components/ProtectedRoute";
import PublicRoute from "@core/router/components/PublicRoute";

export const routes: RouteObject[] = [
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: (
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        ),
      },
      {
        path: "/register",
        element: (
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        ),
      },
    ],
  },
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        ),
      },
      {
        path: "about",
        element: (
          <ProtectedRoute>
            <About />
          </ProtectedRoute>
        ),
      },
      {
        path: "user/:userId",
        element: (
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        ),
      },
      {
        path: "products",
        element: (
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        ),
        loader: productsLoader,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
];
