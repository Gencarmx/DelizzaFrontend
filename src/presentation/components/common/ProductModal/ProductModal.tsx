import { useState } from "react";
import { X, Minus, Plus, ShoppingCart, AlertCircle, Zap } from "lucide-react";
import { useCart } from "@core/context/CartContext";
import { useNavigate } from "react-router-dom";


export interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    restaurant?: {
      id: string;
      name: string;
    };
    description?: string;
  };
  /** Estado del restaurante — determina si se pueden realizar pedidos */
  restaurantStatus?: 'open' | 'paused' | 'closed';
}

export default function ProductModal({ isOpen, onClose, product, restaurantStatus = 'open' }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  // Validar que el producto tenga un restaurante con ID válido
  const hasValidRestaurant = product.restaurant?.id && 
    product.restaurant.id !== 'unknown' && 
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(product.restaurant.id);

  // El restaurante puede recibir pedidos solo si está abierto y tiene restaurante válido
  const canOrder = hasValidRestaurant && restaurantStatus === 'open';

  // Mensaje de bloqueo según el estado del restaurante
  const restaurantBlockMessage =
    restaurantStatus === 'paused'
      ? 'Este restaurante no está recibiendo pedidos por el momento'
      : restaurantStatus === 'closed'
        ? 'Este restaurante está cerrado en este momento'
        : null;

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleIncrease = () => {
    setQuantity(quantity + 1);
  };

  const handleAddToCart = () => {
    // Validar restaurante antes de agregar
    if (!hasValidRestaurant) {
      setError("No se puede agregar este producto: información del restaurante no disponible. Por favor, intenta con otro producto.");
      return;
    }
    if (!canOrder) return;

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      restaurant: product.restaurant,
      quantity,
    });
    onClose();
    setQuantity(1);
    setError(null);
  };

  const handleOrderNow = () => {
    if (!hasValidRestaurant) {
      setError("No se puede agregar este producto: información del restaurante no disponible. Por favor, intenta con otro producto.");
      return;
    }
    if (!canOrder) return;

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      restaurant: product.restaurant,
      quantity,
    });
    onClose();
    setQuantity(1);
    setError(null);
    navigate("/cart");
  };


  // const totalPrice = product.price * quantity;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto pb-32">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white dark:bg-gray-700 rounded-full shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>

        {/* Product Image */}
        <div className="relative h-64 w-full bg-gray-100 dark:bg-gray-700">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6">
          {/* Product Info */}
          <div className="flex flex-col gap-2">
            {product.restaurant && (
              <button
                onClick={() => {
                  onClose();
                  navigate(`/restaurant-detail/${product.restaurant!.id}`);
                }}
                className="text-sm text-amber-500 dark:text-amber-400 font-medium hover:underline text-left w-fit"
              >
                {product.restaurant.name}
              </button>
            )}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{product.name}</h2>
            {product.description && (
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                {product.description}
              </p>
            )}
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                ${product.price}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">MXN</span>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mt-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}
            
            {/* Warning if no valid restaurant */}
            {!hasValidRestaurant && !error && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mt-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Este producto no puede ser agregado al carrito (información del restaurante incompleta)
                </p>
              </div>
            )}

            {/* Aviso de restaurante cerrado o en pausa */}
            {restaurantBlockMessage && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mt-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {restaurantBlockMessage}
                </p>
              </div>
            )}
          </div>


          {/* Divider */}
          <div className="h-px bg-gray-200 dark:bg-gray-700" />

          {/* Quantity Selector */}
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cantidad</h3>
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-2xl p-4">
              <button
                onClick={handleDecrease}
                disabled={quantity <= 1}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  quantity <= 1
                    ? "bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    : "bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500 shadow-sm"
                }`}
              >
                <Minus className="w-5 h-5" strokeWidth={2.5} />
              </button>

              <span className="text-2xl font-bold text-gray-900 dark:text-white min-w-[3rem] text-center">
                {quantity}
              </span>

              <button
                onClick={handleIncrease}
                className="w-10 h-10 rounded-full bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500 shadow-sm flex items-center justify-center transition-all"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Buttons - Fixed at bottom above BottomNav */}
          <div className="fixed bottom-16 left-0 right-0 px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-[60] flex gap-3">
            <button
              onClick={handleAddToCart}
              disabled={!canOrder}
              className={`flex-1 font-bold py-4 px-4 rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 ${
                canOrder
                  ? "bg-amber-400 hover:bg-amber-500 text-white"
                  : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-50"
              }`}
            >
              <ShoppingCart className="w-5 h-5" strokeWidth={2.5} />
              <span className="text-sm">
                {canOrder ? "Agregar" : "No disponible"}
              </span>
            </button>
            <button
              onClick={handleOrderNow}
              disabled={!canOrder}
              className={`flex-1 font-bold py-4 px-4 rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 ${
                canOrder
                  ? "bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900"
                  : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-50"
              }`}
            >
              <Zap className="w-5 h-5" strokeWidth={2.5} />
              <span className="text-sm">Pedir ahora</span>
            </button>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
