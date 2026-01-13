import { ChevronLeft, Minus, Plus, Trash2, MapPin, Store } from "lucide-react";
import { useNavigate } from "react-router";
import { useCart } from "@core/context/CartContext";
import { useState } from "react";

export default function Cart() {
  const navigate = useNavigate();
  const {
    items,
    deliveryOption,
    updateQuantity,
    removeFromCart,
    setDeliveryOption,
    getSubtotal,
    getDeliveryFee,
    getTotal,
  } = useCart();

  const [distance, setDistance] = useState(deliveryOption.distance || 0);

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

  const handleDistanceChange = (newDistance: number) => {
    setDistance(newDistance);
    if (deliveryOption.type === "delivery") {
      setDeliveryOption({
        type: "delivery",
        distance: newDistance,
      });
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col pt-2 pb-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 bg-white sticky top-0 z-10 py-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h2 className="font-bold text-lg text-gray-900">Carrito</h2>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Store className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Tu carrito está vacío
          </h3>
          <p className="text-gray-500 mb-6">
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

  return (
    <div className="flex flex-col pt-2 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 bg-white sticky top-0 z-10 py-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h2 className="font-bold text-lg text-gray-900">Carrito</h2>
        <span className="ml-auto text-sm text-gray-500">
          {items.length} {items.length === 1 ? "producto" : "productos"}
        </span>
      </div>

      {/* Cart Items */}
      <div className="flex flex-col gap-4 mb-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100"
          >
            <div className="flex gap-4">
              {/* Product Image */}
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Product Info */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {item.restaurant && (
                    <span className="text-xs text-gray-500 font-medium">
                      {item.restaurant}
                    </span>
                  )}
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {item.name}
                  </h4>
                  <p className="text-amber-500 font-bold text-base mt-1">
                    ${item.price}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-md bg-white hover:bg-gray-100 flex items-center justify-center transition-colors shadow-sm"
                    >
                      <Minus className="w-4 h-4 text-gray-700" strokeWidth={2.5} />
                    </button>
                    <span className="text-sm font-bold text-gray-900 min-w-[1.5rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-md bg-white hover:bg-gray-100 flex items-center justify-center transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4 text-gray-700" strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delivery Options */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 mb-6">
        <h3 className="font-bold text-gray-900 mb-4">Opciones de entrega</h3>

        {/* Pickup Option */}
        <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all mb-3 hover:bg-gray-50">
          <input
            type="radio"
            name="deliveryType"
            checked={deliveryOption.type === "pickup"}
            onChange={() => handleDeliveryTypeChange("pickup")}
            className="w-5 h-5 text-amber-400 focus:ring-amber-400"
          />
          <Store className="w-5 h-5 text-gray-600" />
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-sm">
              Recoger en persona
            </p>
            <p className="text-xs text-gray-500">Sin costo de envío</p>
          </div>
          <span className="font-bold text-green-600">$0</span>
        </label>

        {/* Delivery Option */}
        <label className="flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all hover:bg-gray-50">
          <input
            type="radio"
            name="deliveryType"
            checked={deliveryOption.type === "delivery"}
            onChange={() => handleDeliveryTypeChange("delivery")}
            className="w-5 h-5 text-amber-400 focus:ring-amber-400 mt-0.5"
          />
          <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-sm">
              Envío a domicilio
            </p>
            <p className="text-xs text-gray-500 mb-3">
              $20 base + $5 por kilómetro
            </p>

            {/* Distance Input */}
            {deliveryOption.type === "delivery" && (
              <div className="flex flex-col gap-2 mt-3">
                <label className="text-xs font-medium text-gray-700">
                  Distancia (km)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={distance}
                  onChange={(e) => handleDistanceChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  placeholder="Ingresa la distancia"
                />
                <p className="text-xs text-gray-500">
                  Costo de envío: ${getDeliveryFee()}
                </p>
              </div>
            )}
          </div>
          {deliveryOption.type === "delivery" && (
            <span className="font-bold text-amber-500">
              ${getDeliveryFee()}
            </span>
          )}
        </label>
      </div>

      {/* Order Summary */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 mb-6">
        <h3 className="font-bold text-gray-900 mb-4">Resumen del pedido</h3>

        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold text-gray-900">
              ${getSubtotal().toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Envío</span>
            <span className="font-semibold text-gray-900">
              ${getDeliveryFee().toFixed(2)}
            </span>
          </div>

          <div className="h-px bg-gray-200 my-1" />

          <div className="flex justify-between">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-amber-500 text-xl">
              ${getTotal().toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Checkout Button */}
      <button className="w-full bg-amber-400 hover:bg-amber-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98]">
        Proceder al pago
      </button>
    </div>
  );
}
