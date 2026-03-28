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
} from "lucide-react";
import { useCartLogic } from "@presentation/logic/CartLogic";

export default function Cart() {
  const {
    items,
    isProcessing,
    enrichedOrders,
    grandTotal,
    totalServiceFees,
    subtotal,
    hasMultipleRestaurants,
    anyDelivery,
    getRestaurantAvailableTypes,
    setRestaurantDeliveryType,
    showFeeDialog,
    setShowFeeDialog,
    updateQuantity,
    removeFromCart,
    handleCheckout,
    confirmCheckout,
    selectedAddress,
    navigate,
  } = useCartLogic();

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

      {/* ── Checkout button ───────────────────────────────────────────────── */}
      <button
        onClick={handleCheckout}
        disabled={isProcessing}
        className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-amber-300 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
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
    </div>
  );
}
