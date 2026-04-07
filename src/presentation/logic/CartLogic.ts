/**
 * CartLogic - Custom hook that manages all business logic for the Cart component.
 * Handles per-restaurant delivery options, fee breakdown, and multi-restaurant checkout.
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { useCart } from "@core/context/CartContext";
import type { CartOrder } from "@core/context/CartContext";
import { useAddress } from "@core/context/AddressContext";
import { processMultiRestaurantCheckout } from "@core/services/checkoutService";
import type { OrderResult } from "@core/services/checkoutService";
import { getDeliverySettings, getBusinessPaymentInfo } from "@core/services/businessService";
import type { DeliverySettings, BusinessPaymentInfo } from "@core/services/businessService";
import { supabase } from "@core/supabase/client";

export interface EnrichedOrder extends CartOrder {
  deliveryType: "pickup" | "delivery";
  serviceFee: number;
}

export function useCartLogic() {
  const navigate = useNavigate();
  const { selectedAddress } = useAddress();
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    clearCartByRestaurantId,
    getSubtotal,
    getOrdersByRestaurant,
    hasMultipleRestaurants,
  } = useCart();

  const [isProcessing, setIsProcessing] = useState(false);
  const [restaurantSettings, setRestaurantSettings] = useState<Record<string, DeliverySettings>>({});
  const [deliveryTypeByRestaurant, setDeliveryTypeByRestaurant] = useState<Record<string, "pickup" | "delivery">>({});
  const [businessPaymentInfo, setBusinessPaymentInfo] = useState<Record<string, BusinessPaymentInfo>>({});
  const [paymentMethodByRestaurant, setPaymentMethodByRestaurant] = useState<Record<string, string>>({});
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [hasPhone, setHasPhone] = useState<boolean | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<OrderResult[] | null>(null);

  // ── Check if user has a phone number registered ───────────────────────────
  useEffect(() => {
    const checkPhone = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setHasPhone(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("phone_number")
        .eq("user_id", user.id)
        .single();
      setHasPhone(!!data?.phone_number);
    };
    checkPhone();
  }, []);

  // ── Fetch delivery & payment settings for every restaurant in the cart ───
  useEffect(() => {
    const ids = [...new Set(items.map((i) => i.restaurant?.id).filter(Boolean) as string[])];
    if (ids.length === 0) {
      setRestaurantSettings({});
      setBusinessPaymentInfo({});
      return;
    }
    let cancelled = false;
    Promise.all(
      ids.map((id) =>
        Promise.all([
          getDeliverySettings(id).then((s) => [id, s] as const),
          getBusinessPaymentInfo(id).then((p) => [id, p] as const),
        ])
      )
    ).then((results) => {
      if (cancelled) return;
      const deliveryMap: Record<string, DeliverySettings> = {};
      const paymentMap: Record<string, BusinessPaymentInfo> = {};
      for (const [[id, delivery], [, payment]] of results) {
        if (delivery) deliveryMap[id] = delivery;
        if (payment) paymentMap[id] = payment;
      }
      setRestaurantSettings(deliveryMap);
      setBusinessPaymentInfo(paymentMap);
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  // ── Auto-initialize per-restaurant delivery type when settings arrive ────
  useEffect(() => {
    setDeliveryTypeByRestaurant((prev) => {
      const updated = { ...prev };
      for (const [id, settings] of Object.entries(restaurantSettings)) {
        if (!(id in updated)) {
          updated[id] = settings.has_pickup ? "pickup" : "delivery";
        }
      }
      return updated;
    });
  }, [restaurantSettings]);

  // ── Auto-initialize per-restaurant payment method when payment info arrives
  useEffect(() => {
    setPaymentMethodByRestaurant((prev) => {
      const updated = { ...prev };
      for (const [id, info] of Object.entries(businessPaymentInfo)) {
        if (!(id in updated)) {
          // Default: cash (always available)
          updated[id] = info.accepted_payment_methods.includes('cash') ? 'cash'
            : (info.accepted_payment_methods[0] ?? 'cash');
        }
      }
      return updated;
    });
  }, [businessPaymentInfo]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Returns the delivery types available for a specific restaurant. */
  const getRestaurantAvailableTypes = (restaurantId: string): Array<"pickup" | "delivery"> => {
    const settings = restaurantSettings[restaurantId];
    if (!settings) return ["pickup", "delivery"]; // permissive while loading
    const types: Array<"pickup" | "delivery"> = [];
    if (settings.has_pickup) types.push("pickup");
    if (settings.has_delivery) types.push("delivery");
    return types.length > 0 ? types : ["pickup"];
  };

  const setRestaurantDeliveryType = (restaurantId: string, type: "pickup" | "delivery") => {
    setDeliveryTypeByRestaurant((prev) => ({ ...prev, [restaurantId]: type }));
  };

  /** Returns accepted payment methods for a specific restaurant. */
  const getRestaurantPaymentMethods = (restaurantId: string): string[] => {
    const info = businessPaymentInfo[restaurantId];
    if (!info) return ['cash']; // default while loading
    return info.accepted_payment_methods.length > 0 ? info.accepted_payment_methods : ['cash'];
  };

  const setRestaurantPaymentMethod = (restaurantId: string, method: string) => {
    setPaymentMethodByRestaurant((prev) => ({ ...prev, [restaurantId]: method }));
  };

  // ── Enriched orders: each order knows its own delivery type and service fee ─
  const enrichedOrders = useMemo<EnrichedOrder[]>(() => {
    return getOrdersByRestaurant().map((order) => {
      const delivType = deliveryTypeByRestaurant[order.restaurant.id] ?? "pickup";
      const settings = restaurantSettings[order.restaurant.id];
      const serviceFee = delivType === "pickup" ? 10 : (settings?.delivery_fee ?? 15);
      return {
        ...order,
        deliveryType: delivType,
        serviceFee,
        total: order.subtotal + serviceFee,
      };
    });
  }, [items, deliveryTypeByRestaurant, restaurantSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  const grandTotal = useMemo(
    () => enrichedOrders.reduce((sum, o) => sum + o.total, 0),
    [enrichedOrders]
  );

  const totalServiceFees = useMemo(
    () => enrichedOrders.reduce((sum, o) => sum + o.serviceFee, 0),
    [enrichedOrders]
  );

  /** True if at least one restaurant in the cart has delivery selected. */
  const anyDelivery = enrichedOrders.some((o) => o.deliveryType === "delivery");

  // ── Checkout ─────────────────────────────────────────────────────────────

  const confirmCheckout = async () => {
    setShowFeeDialog(false);
    setIsProcessing(true);

    try {
      const addressString = selectedAddress
        ? `${selectedAddress.line1}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postal_code || ""}`
        : undefined;

      const baseCheckoutData = {
        deliveryOption: {
          type: "pickup" as const, // overridden per restaurant inside the service
          address: addressString,
          addressId: selectedAddress?.id,
        },
        paymentMethod: "cash",
        specialInstructions: "",
      };

      // Build orders with the correct per-restaurant fee for the DB total
      const ordersForCheckout = enrichedOrders.map((o) => ({
        ...o,
        deliveryFee: o.serviceFee,
        total: o.total,
      }));

      const perRestaurantDeliveryTypes: Record<string, "pickup" | "delivery"> = {};
      for (const order of enrichedOrders) {
        perRestaurantDeliveryTypes[order.restaurant.id] = order.deliveryType;
      }

      const perRestaurantPaymentInfo: Record<string, { method: string; mercadoPagoLink: string | null }> = {};
      for (const order of enrichedOrders) {
        const method = paymentMethodByRestaurant[order.restaurant.id] ?? 'cash';
        const mpLink = businessPaymentInfo[order.restaurant.id]?.mercado_pago_link ?? null;
        perRestaurantPaymentInfo[order.restaurant.id] = { method, mercadoPagoLink: mpLink };
      }

      const results = await processMultiRestaurantCheckout(
        ordersForCheckout,
        baseCheckoutData,
        perRestaurantDeliveryTypes,
        perRestaurantPaymentInfo
      );

      const successfulOrders = results.filter((r) => r.success);
      const failedOrders = results.filter((r) => !r.success);

      if (successfulOrders.length > 0) {
        // Clear cart items for successful orders
        const successfulRestaurantIds = successfulOrders
          .map((r) => r.restaurantId)
          .filter((id): id is string => !!id);
        successfulRestaurantIds.forEach((id) => clearCartByRestaurantId(id));

        if (failedOrders.length === 0) {
          clearCart();
        }

        // If any successful order uses Mercado Pago, redirect to activity so
        // the customer can immediately see and copy the payment reference ID.
        const hasMercadoPago = successfulOrders.some((r) => r.paymentMethod === 'mercado_pago');
        if (hasMercadoPago && failedOrders.length === 0) {
          navigate('/activity', { state: { defaultFilter: 'awaiting_payment' } });
        } else {
          // Show result modal (cash only, or mixed with failures)
          setCheckoutResult(results);
        }
      } else {
        // All failed — show error alert (no success modal)
        alert(
          `❌ Todos los pedidos fallaron:\n\n${failedOrders
            .map((r) => `${r.restaurantName}: ${r.error}`)
            .join("\n")}\n\nTu carrito NO se ha modificado. Puedes intentar nuevamente.`
        );
      }
    } catch (error) {
      console.error("Error en checkout:", error);
      alert("Error al procesar el pedido. Por favor intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckout = () => {
    if (isProcessing) return;
    if (!hasPhone) return;

    if (anyDelivery && !selectedAddress) {
      alert("Por favor selecciona una dirección de entrega antes de continuar.");
      return;
    }

    if (hasMultipleRestaurants()) {
      // Show fee transparency dialog before confirming multi-restaurant checkout
      setShowFeeDialog(true);
    } else {
      confirmCheckout();
    }
  };

  return {
    // Cart data
    items,
    isProcessing,
    hasPhone,

    // Per-restaurant enriched orders
    enrichedOrders,
    grandTotal,
    totalServiceFees,
    subtotal: getSubtotal(),
    hasMultipleRestaurants: hasMultipleRestaurants(),
    anyDelivery,

    // Per-restaurant delivery config
    getRestaurantAvailableTypes,
    setRestaurantDeliveryType,
    restaurantSettings,

    // Per-restaurant payment method config
    getRestaurantPaymentMethods,
    setRestaurantPaymentMethod,
    paymentMethodByRestaurant,
    businessPaymentInfo,

    // Fee dialog
    showFeeDialog,
    setShowFeeDialog,

    // Checkout result (null = not done yet, array = results ready)
    checkoutResult,
    clearCheckoutResult: () => setCheckoutResult(null),

    // Actions
    updateQuantity,
    removeFromCart,
    handleCheckout,
    confirmCheckout,

    // Address UI
    selectedAddress,

    navigate,
  };
}
