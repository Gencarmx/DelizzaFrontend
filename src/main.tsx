import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { routes } from "@core/router/routes";
import { AuthProvider, CartProvider, ThemeProvider, AddressProvider } from "@core/context";
import "@presentation/styles/global.css";
import { initOneSignal } from "@core/services/onesignalService";

initOneSignal();

// Capturar el evento antes de que React monte para no perderlo
window.__pwaInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.__pwaInstallPrompt = e;
});

const router = createBrowserRouter(routes);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AddressProvider>
          <CartProvider>
            <RouterProvider router={router} />
          </CartProvider>
        </AddressProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
