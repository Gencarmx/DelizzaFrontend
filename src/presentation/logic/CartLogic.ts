/**
 * CartLogic - Custom hook that manages all business logic for the Cart component
 * Handles cart state, delivery options, checkout process, and multi-restaurant orders
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import { useCart } from "@core/context/CartContext";
import { useAddress } from "@core/context/AddressContext";
import { processMultiRestaurantCheckout } from "@core/services/checkoutService";

export function useCartLogic() {
  const navigate = useNavigate();
  const { selectedAddress } = useAddress();
  const {
    items,
    deliveryOption,
    updateQuantity,
    removeFromCart,
    clearCart,
    clearCartByRestaurantId,
    setDeliveryOption,
    getSubtotal,
    getDeliveryFee,
    getTotal,
    getOrdersByRestaurant,
    hasMultipleRestaurants,
  } = useCart();



  // Local state for delivery distance and processing
  const [distance, setDistance] = useState(deliveryOption.distance || 0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handler: Change delivery type (pickup/delivery)
  const handleDeliveryTypeChange = (type: "pickup" | "delivery") => {
    if (type === "pickup") {
      setDeliveryOption({ type: "pickup" });
      setDistance(0);
    } else {
      setDeliveryOption({
        type: "delivery",
        distance: distance,
      });
    }
  };

  // Handler: Update delivery distance
  const handleDistanceChange = (newDistance: number) => {
    setDistance(newDistance);
    if (deliveryOption.type === "delivery") {
      setDeliveryOption({
        type: "delivery",
        distance: newDistance,
      });
    }
  };

  // Handler: Process checkout for single or multiple restaurants
  const handleCheckout = async () => {
    if (isProcessing) return;

    if (deliveryOption.type === "delivery" && !selectedAddress) {
      alert("Por favor selecciona una dirección de entrega antes de continuar.");
      return;
    }

    setIsProcessing(true);

    try {
      const orders = getOrdersByRestaurant();

      const addressString = selectedAddress
        ? `${selectedAddress.line1}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postal_code || ''}`
        : undefined;

      const checkoutData = {
        deliveryOption: {
          ...deliveryOption,
          address: addressString,
          addressId: selectedAddress?.id,
        },
        paymentMethod: "cash", // TODO: Implementar selección de método de pago
        specialInstructions: "", // TODO: Implementar campo de instrucciones especiales
      };

      const results = await processMultiRestaurantCheckout(orders, checkoutData);

      // Mostrar resultados
      const successfulOrders = results.filter(r => r.success);
      const failedOrders = results.filter(r => !r.success);

      // Manejar resultados mixtos (éxito y fallo)
      if (successfulOrders.length > 0 && failedOrders.length === 0) {
        // Todos los pedidos exitosos - limpiar todo y navegar
        alert(`¡Pedidos procesados exitosamente!\n\n${successfulOrders.map(r =>
          `${r.restaurantName}: $${r.total}`
        ).join('\n')}\n\nTotal: $${successfulOrders.reduce((sum, r) => sum + r.total, 0).toFixed(2)}`);

        navigate("/");
        setTimeout(() => {
          clearCart();
        }, 100);
      } else if (successfulOrders.length > 0 && failedOrders.length > 0) {
        // Algunos exitosos, algunos fallidos - limpiar solo los exitosos
        alert(`⚠️ Algunos pedidos se procesaron con éxito, pero otros fallaron:\n\n` +
          `✅ Exitosos:\n${successfulOrders.map(r => `  • ${r.restaurantName}: $${r.total}`).join('\n')}\n\n` +
          `❌ Fallidos:\n${failedOrders.map(r => `  • ${r.restaurantName}: ${r.error}`).join('\n')}\n\n` +
          `Los productos de los pedidos fallidos permanecen en tu carrito.`
        );

        // Limpiar solo los restaurantes con pedidos exitosos
        // Necesitamos el ID del restaurante, no el ID de la orden
        // Obtener los IDs de restaurantes exitosos de los resultados
        const successfulRestaurantIds = results
          .filter(r => r.success)
          .map(r => {
            // Buscar el ID del restaurante en las órdenes originales
            const originalOrder = orders.find(o => o.restaurant.name === r.restaurantName);
            return originalOrder?.restaurant?.id;
          })
          .filter((id): id is string => !!id);

        successfulRestaurantIds.forEach(restaurantId => {
          clearCartByRestaurantId(restaurantId);
        });

      } else if (failedOrders.length > 0) {
        // Todos fallaron - no limpiar carrito, mostrar error
        alert(`❌ Todos los pedidos fallaron:\n\n${failedOrders.map(r =>
          `${r.restaurantName}: ${r.error}`
        ).join('\n')}\n\n` +
        `Tu carrito NO se ha modificado. Puedes intentar nuevamente.`);
      }


    } catch (error) {
      console.error("Error en checkout:", error);
      alert("Error al procesar el pedido. Por favor intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    // Cart data
    items,
    deliveryOption,
    distance,
    isProcessing,

    // Computed values
    subtotal: getSubtotal(),
    deliveryFee: getDeliveryFee(),
    total: getTotal(),
    ordersByRestaurant: getOrdersByRestaurant(),
    hasMultipleRestaurants: hasMultipleRestaurants(),

    // Actions
    updateQuantity,
    removeFromCart,
    handleDeliveryTypeChange,
    handleDistanceChange,
    handleCheckout,
  };
}
