import type { RouteObject } from "react-router";
import RootLayout from "@presentation/layouts/RootLayout";
import RestaurantLayout from "@presentation/layouts/RestaurantLayout";
import Home from "@presentation/pages/Home";
import About from "@presentation/pages/About";
import UserProfile from "@presentation/pages/UserProfile";
import Products from "@presentation/pages/Products";
import { productsLoader } from "@core/router/loaders/productsLoader";
import NotFound from "@presentation/pages/NotFound";
import Favorites from "@presentation/pages/Favorites";
import Activity from "@presentation/pages/Activity";
import Account from "@presentation/pages/Account";
import Login from "@presentation/pages/Login";
import Register from "@presentation/pages/Register";
import Notifications from "@presentation/pages/Notifications";
import Settings from "@presentation/pages/Settings";
import PaymentMethods from "@presentation/pages/PaymentMethods";
import EditProfile from "@presentation/pages/EditProfile";
import SavedAddresses from "@presentation/pages/SavedAddresses";
import Cart from "@presentation/pages/Cart";
import {
  Dashboard,
  ProductList,
  ProductAdd,
  ProductEdit,
  Orders,
} from "@presentation/pages/restaurantUI";

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
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "about",
        element: <About />,
      },
      {
        path: "favorites",
        element: <Favorites />,
      },
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
        path: "*",
        element: <NotFound />,
      },
    ],
  },
  {
    path: "/restaurant",
    element: <RestaurantLayout />,
    children: [
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
    ],
  },
];
