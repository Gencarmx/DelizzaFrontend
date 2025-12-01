import type { RouteObject } from "react-router";
import RootLayout from "@presentation/layouts/RootLayout";
import Home from "@presentation/pages/Home";
import About from "@presentation/pages/About";
import UserProfile from "@presentation/pages/UserProfile";
import Products from "@presentation/pages/Products";
import { productsLoader } from "@core/router/loaders/productsLoader";
import NotFound from "@presentation/pages/NotFound";

export const routes: RouteObject[] = [
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
];
