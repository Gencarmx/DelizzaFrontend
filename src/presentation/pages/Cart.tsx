import {
  ChevronLeft,
  Minus,
  Plus,
  Trash2,
  MapPin,
  Store,
  Bike,
  Info,
  X,
  ShoppingBag,
  PhoneOff,
  Banknote,
  CreditCard,
  Copy,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { useCartLogic } from "@presentation/logic/CartLogic";

interface MpLinkModal {
  link: string;
  restaurantName: string;
  total: number;
}

export default function Cart() {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [mpLinkModal, setMpLinkModal] = useState<MpLinkModal | null>(null);

  const {
    items,
    isProcessing,
    hasPhone,
    enrichedOrders,
    grandTotal,
    totalServiceFees,
    subtotal,
    hasMultipleRestaurants,
    anyDelivery,
    getRestaurantAvailableTypes,
    setRestaurantDeliveryType,
    getRestaurantPaymentMethods,
    setRestaurantPaymentMethod,
    paymentMethodByRestaurant,
    businessPaymentInfo,
    showFeeDialog,
    setShowFeeDialog,
    checkoutResult,
    clearCheckoutResult,
    updateQuantity,
    removeFromCart,
    handleCheckout,
    confirmCheckout,
    selectedAddress,
    navigate,
  } = useCartLogic();

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2500);
    } catch {
      // fallback silencioso
    }
  };

  // ── Empty state ──────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="flex flex-col pt-2 pb-6">
        <div className="flex items-center gap-3 mb-6 bg-white dark:bg-gray-800 sticky top-0 z-10 py-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>
          <h2 className="font-bold text-lg text-gray-900 dark:text-white">Carrito</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Store className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Tu carrito está vacío
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Agrega productos para comenzar tu pedido
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-amber-400 hover:bg-amber-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Explorar productos
          </button>
        </div>
      </div>
    );
  }

  // ── Main cart ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col pt-2 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 bg-white dark:bg-gray-800 sticky top-0 z-10 py-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>
        <h2 className="font-bold text-lg text-gray-900 dark:text-white">Carrito</h2>
        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
          {items.length} {items.length === 1 ? "producto" : "productos"}
        </span>
      </div>

      {/* Multiple restaurants notice */}
      {hasMultipleRestaurants && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">ℹ</span>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-1">
              Pedido múltiple
            </h4>
            <p className="text-blue-700 dark:text-blue-200 text-xs">
              Tu carrito incluye productos de {enrichedOrders.length} restaurantes. Elige el método
              de entrega para cada uno y confirma al final.
            </p>
          </div>
        </div>
      )}

      {/* ── Restaurant order cards ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 mb-6">
        {enrichedOrders.map((order) => {
          const availableTypes = getRestaurantAvailableTypes(order.restaurant.id);
          const isDelivery = order.deliveryType === "delivery";

          return (
            <div
              key={order.restaurant.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              {/* Restaurant header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/50">
                <ShoppingBag className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span className="font-bold text-gray-900 dark:text-white text-sm truncate">
                  {order.restaurant.name}
                </span>
              </div>

              {/* Items */}
              <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-3 p-4">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-xl flex-shrink-0 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                          {item.name}
                        </h4>
                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <ul className="mt-0.5 space-y-0.5">
                            {item.selectedAddons
                              .filter(a => a.quantity > 0)
                              .map(a => (
                                <li key={a.addon_id} className="text-xs text-gray-500 dark:text-gray-400">
                                  + {a.name}{a.quantity > 1 ? ` x${a.quantity}` : ''} <span className="text-amber-500">${(a.price * a.quantity).toFixed(2)}</span>
                                </li>
                              ))}
                          </ul>
                        )}
                        <p className="text-amber-500 font-bold text-sm mt-0.5">
                          ${item.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 rounded-md bg-white dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 flex items-center justify-center transition-colors shadow-sm"
                          >
                            <Minus className="w-3 h-3 text-gray-700 dark:text-gray-200" strokeWidth={2.5} />
                          </button>
                          <span className="text-sm font-bold text-gray-900 dark:text-white min-w-[1.25rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 rounded-md bg-white dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 flex items-center justify-center transition-colors shadow-sm"
                          >
                            <Plus className="w-3 h-3 text-gray-700 dark:text-gray-200" strokeWidth={2.5} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment method selector for this restaurant */}
              {(() => {
                const methods = getRestaurantPaymentMethods(order.restaurant.id);
                const selectedMethod = paymentMethodByRestaurant[order.restaurant.id] ?? 'cash';
                if (methods.length <= 1) return null; // solo un método, no mostrar selector
                return (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                      Método de pago
                    </p>
                    <div className="flex flex-col gap-2">
                      {methods.includes('cash') && (
                        <label className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedMethod === 'cash'
                            ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}>
                          <input
                            type="radio"
                            name={`paymentMethod-${order.restaurant.id}`}
                            checked={selectedMethod === 'cash'}
                            onChange={() => setRestaurantPaymentMethod(order.restaurant.id, 'cash')}
                            className="w-4 h-4 text-amber-400 focus:ring-amber-400"
                          />
                          <Banknote className="w-4 h-4 text-gray-600 dark:text-gray-300 flex-shrink-0" />
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">Efectivo</span>
                        </label>
                      )}
                      {methods.includes('mercado_pago') && (() => {
                        const mpLink = businessPaymentInfo[order.restaurant.id]?.mercado_pago_link ?? null;
                        return (
                          <>
                            <label className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                              selectedMethod === 'mercado_pago'
                                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}>
                              <input
                                type="radio"
                                name={`paymentMethod-${order.restaurant.id}`}
                                checked={selectedMethod === 'mercado_pago'}
                                onChange={() => setRestaurantPaymentMethod(order.restaurant.id, 'mercado_pago')}
                                className="w-4 h-4 text-amber-400 focus:ring-amber-400"
                              />
                              <CreditCard className="w-4 h-4 text-gray-600 dark:text-gray-300 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="font-semibold text-gray-900 dark:text-white text-sm">Transferencia / Mercado Pago</span>
                                {selectedMethod === 'mercado_pago' && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Recibirás el ID de tu pedido para incluirlo en el asunto del pago.
                                  </p>
                                )}
                              </div>
                            </label>

                            {selectedMethod === 'mercado_pago' && (
                              <div className="flex flex-col gap-2 mt-1">
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                                  <div className="flex items-start gap-2.5">
                                    <CreditCard className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <h4 className="font-semibold text-red-900 dark:text-red-100 text-sm mb-1">
                                        Pago por Mercado Pago
                                      </h4>
                                      <p className="text-red-700 dark:text-red-300 text-xs leading-relaxed">
                                        Al confirmar, tu pedido quedará en espera de confirmación de pago. Recibirás un ID que debes incluir en el asunto de tu transferencia para que el restaurante pueda identificarla.
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {mpLink && (
                                  <button
                                    type="button"
                                    onClick={() => setMpLinkModal({
                                      link: mpLink,
                                      restaurantName: order.restaurant.name,
                                      total: order.total,
                                    })}
                                    className="flex items-center justify-center gap-2 w-full border-2 border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 font-semibold py-2.5 rounded-xl text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    Ver enlace de pago del restaurante
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}

              {/* Delivery type selector for this restaurant */}
              <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Método de entrega
                </p>
                <div className="flex flex-col gap-2">
                  {availableTypes.includes("pickup") && (
                    <label className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                      order.deliveryType === "pickup"
                        ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}>
                      <input
                        type="radio"
                        name={`deliveryType-${order.restaurant.id}`}
                        checked={order.deliveryType === "pickup"}
                        onChange={() => setRestaurantDeliveryType(order.restaurant.id, "pickup")}
                        className="w-4 h-4 text-amber-400 focus:ring-amber-400"
                      />
                      <Store className="w-4 h-4 text-gray-600 dark:text-gray-300 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                          Recoger en el establecimiento
                        </p>
                      </div>
                      <span className="font-bold text-amber-500 text-sm whitespace-nowrap">$10.00</span>
                    </label>
                  )}

                  {availableTypes.includes("delivery") && (
                    <label className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                      order.deliveryType === "delivery"
                        ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}>
                      <input
                        type="radio"
                        name={`deliveryType-${order.restaurant.id}`}
                        checked={order.deliveryType === "delivery"}
                        onChange={() => setRestaurantDeliveryType(order.restaurant.id, "delivery")}
                        className="w-4 h-4 text-amber-400 focus:ring-amber-400"
                      />
                      <Bike className="w-4 h-4 text-gray-600 dark:text-gray-300 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                          Envío a domicilio
                        </p>
                      </div>
                      <span className="font-bold text-amber-500 text-sm whitespace-nowrap">
                        ${order.serviceFee.toFixed(2)}
                      </span>
                    </label>
                  )}

                  {availableTypes.length === 0 && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
                      <p className="text-xs text-red-700 dark:text-red-400">
                        Este restaurante no tiene opciones de entrega disponibles.
                      </p>
                    </div>
                  )}
                </div>

                {/* Mini order summary for this restaurant */}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Subtotal productos</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      Cargo por servicio · {isDelivery ? "domicilio" : "retiro"}
                    </span>
                    <span>${order.serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white mt-1">
                    <span>Total {order.restaurant.name}</span>
                    <span className="text-amber-500">${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Shared delivery address (shown if any restaurant uses delivery) ── */}
      {anyDelivery && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">
              Dirección de entrega
            </h3>
          </div>
          {selectedAddress ? (
            <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
              <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                {selectedAddress.label && (
                  <span className="mr-1">{selectedAddress.label}:</span>
                )}
                {selectedAddress.line1}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                {selectedAddress.city}, {selectedAddress.state}{" "}
                {selectedAddress.postal_code}
              </p>
              <button
                type="button"
                onClick={() => navigate("/saved-addresses")}
                className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 text-xs font-semibold mt-2 inline-flex items-center gap-1"
              >
                Cambiar dirección
              </button>
            </div>
          ) : (
            <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-200 dark:border-red-800 flex flex-col items-start gap-2">
              <p className="text-red-700 dark:text-red-400 text-sm">
                Debes agregar una dirección para los pedidos a domicilio.
              </p>
              <button
                type="button"
                onClick={() => navigate("/saved-addresses")}
                className="bg-amber-400 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Agregar dirección
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Grand total summary ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700 mb-6">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Resumen total</h3>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">Subtotal productos</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              ${subtotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <div className="flex flex-col">
              <span className="text-gray-600 dark:text-gray-300">Cargos por servicio</span>
              {hasMultipleRestaurants && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {enrichedOrders.length} restaurantes × cargo individual
                </span>
              )}
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">
              ${totalServiceFees.toFixed(2)}
            </span>
          </div>
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
          <div className="flex justify-between">
            <span className="font-bold text-gray-900 dark:text-white">Total a pagar</span>
            <span className="font-bold text-amber-500 text-xl">${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ── No phone warning ─────────────────────────────────────────────── */}
      {hasPhone === false && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-400 dark:border-red-600 rounded-2xl p-5 mb-4 flex items-start gap-4">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-800/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <PhoneOff className="w-5 h-5 text-red-500 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-red-800 dark:text-red-200 text-base mb-1">
              Número de teléfono requerido
            </h4>
            <p className="text-red-700 dark:text-red-300 text-sm leading-relaxed">
              Necesitas registrar un número de celular en tu perfil para poder realizar pedidos. Lo utilizamos para coordinar la entrega o el retiro de tu pedido.
            </p>
            <button
              onClick={() => navigate("/edit-profile")}
              className="mt-3 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              Agregar número de teléfono
            </button>
          </div>
        </div>
      )}

      {/* ── Checkout button ───────────────────────────────────────────────── */}
      <button
        onClick={handleCheckout}
        disabled={isProcessing || hasPhone === false}
        className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Procesando...</span>
          </>
        ) : (
          <span>
            {hasMultipleRestaurants
              ? `Confirmar ${enrichedOrders.length} pedidos · $${grandTotal.toFixed(2)}`
              : `Realizar pedido · $${grandTotal.toFixed(2)}`}
          </span>
        )}
      </button>



      {/* ── Checkout success modal ───────────────────────────────────────── */}
      {checkoutResult && checkoutResult.some((r) => r.success) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">¡Pedido recibido!</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {checkoutResult.filter((r) => r.success).length === 1
                  ? 'Tu pedido fue enviado al restaurante.'
                  : `${checkoutResult.filter((r) => r.success).length} pedidos fueron enviados.`}
              </p>
            </div>

            {checkoutResult.filter((r) => r.success).map((result) => {
              const isMp = result.paymentMethod === 'mercado_pago';
              return (
                <div key={result.restaurantId} className={`rounded-2xl p-4 ${
                  isMp
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700'
                }`}>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
                    {result.restaurantName}
                  </p>

                  {isMp && result.shortId && (
                    <>
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 mb-2">
                        <div className="flex-1">
                          <p className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Monto a pagar</p>
                          <p className="font-bold text-lg text-red-700 dark:text-red-300">
                            ${result.total.toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopy(result.total.toFixed(2))}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Copiar monto"
                        >
                          {copiedText === result.total.toFixed(2)
                            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                            : <Copy className="w-4 h-4 text-red-600 dark:text-red-400" />}
                        </button>
                      </div>

                      <p className="text-xs text-red-700 dark:text-red-300 mb-2 leading-relaxed">
                        Tu pedido está esperando confirmación de pago. Incluye el siguiente ID en el asunto de tu transferencia:
                      </p>
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded-xl px-3 py-2 mb-3">
                        <span className="font-mono font-bold text-lg text-red-700 dark:text-red-300 flex-1 tracking-wider">
                          {result.shortId}
                        </span>
                        <button
                          onClick={() => handleCopy(result.shortId!)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Copiar ID"
                        >
                          {copiedText === result.shortId
                            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                            : <Copy className="w-4 h-4 text-red-600 dark:text-red-400" />}
                        </button>
                      </div>
                      {result.mercadoPagoLink && (
                        <a
                          href={result.mercadoPagoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Ir a pagar en Mercado Pago
                        </a>
                      )}
                    </>
                  )}

                  {!isMp && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Pago en efectivo · Total: <strong className="text-gray-800 dark:text-gray-200">${result.total.toFixed(2)}</strong>
                    </p>
                  )}
                </div>
              );
            })}

            {/* Failed orders summary */}
            {checkoutResult.some((r) => !r.success) && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
                  Algunos pedidos fallaron:
                </p>
                {checkoutResult.filter((r) => !r.success).map((r) => (
                  <p key={r.restaurantId} className="text-xs text-red-600 dark:text-red-400">
                    • {r.restaurantName}: {r.error}
                  </p>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={() => { clearCheckoutResult(); navigate('/activity'); }}
                className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded-2xl transition-colors"
              >
                Ver mis pedidos
              </button>
              <button
                onClick={() => { clearCheckoutResult(); navigate('/'); }}
                className="w-full py-3 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors"
              >
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fee transparency dialog (bottom sheet) ───────────────────────── */}
      {showFeeDialog && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setShowFeeDialog(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-lg p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Información sobre los cargos
                </h3>
              </div>
              <button
                onClick={() => setShowFeeDialog(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Fee breakdown */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4 flex flex-col gap-2">
              {enrichedOrders.map((order) => (
                <div key={order.restaurant.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300 truncate mr-2">
                    {order.restaurant.name} ·{" "}
                    <span className="text-gray-400">
                      {order.deliveryType === "pickup" ? "retiro" : "domicilio"}
                    </span>
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                    ${order.serviceFee.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="h-px bg-gray-200 dark:bg-gray-600 my-1" />
              <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white">
                <span>Total cargos</span>
                <span>${totalServiceFees.toFixed(2)}</span>
              </div>
            </div>

            {/* Transparency message */}
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
              Debido a que la aplicación debe coordinar el envío de cada solicitud al restaurante
              al que pertenecen los diferentes productos, realizamos un cargo por transacción por
              cada restaurante al que le hacemos llegar su pedido.
              <br /><br />
              En Delizza buscamos maximizar la calidad y eficiencia en nuestro servicio, por esto
              agradecemos su comprensión y nos disculpamos por cualquier inconveniente que pueda
              causarle. Le invitamos a darnos sus comentarios mediante los canales oficiales y
              procuraremos responderle a la brevedad.
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmCheckout}
                disabled={isProcessing}
                className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-amber-300 text-white font-bold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <span>Entendido, confirmar pedido · ${grandTotal.toFixed(2)}</span>
                )}
              </button>
              <button
                onClick={() => setShowFeeDialog(false)}
                className="w-full py-3 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors"
              >
                Volver al carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mercado Pago link info modal ──────────────────────────────────── */}
      {mpLinkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setMpLinkModal(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                  ¿Cómo realizar tu pago?
                </h3>
              </div>
              <button
                onClick={() => setMpLinkModal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 -mt-1 -mr-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Steps */}
            <ol className="flex flex-col gap-3">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Confirma tu pedido en la aplicación. Recibirás un <strong>ID de referencia</strong> en tu pantalla de Actividad.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  Ingresa al enlace de pago del restaurante y realiza la transferencia por el monto exacto de tu pedido:
                </p>
              </li>
              <li className="mx-9 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-4 py-2.5 text-center">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-0.5">{mpLinkModal.restaurantName}</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">${mpLinkModal.total.toFixed(2)}</p>
                  <button
                    onClick={() => handleCopy(mpLinkModal.total.toFixed(2))}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-800/30 rounded-lg transition-colors"
                    title="Copiar monto"
                  >
                    {copiedText === mpLinkModal.total.toFixed(2)
                      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                      : <Copy className="w-4 h-4 text-red-600 dark:text-red-400" />}
                  </button>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  En el <strong>asunto o referencia</strong> de la transferencia, escribe el ID de referencia de tu pedido para que el restaurante pueda identificarlo.
                </p>
              </li>
            </ol>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <a
                href={mpLinkModal.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMpLinkModal(null)}
                className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-2xl text-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Ir al enlace de pago
              </a>
              <button
                onClick={() => setMpLinkModal(null)}
                className="w-full py-2.5 text-gray-500 dark:text-gray-400 font-medium text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
