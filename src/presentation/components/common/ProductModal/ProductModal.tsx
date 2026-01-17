import { useState } from "react";
import { X, Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@core/context/CartContext";

export interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    restaurant?: string;
    description?: string;
  };
}

export default function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  if (!isOpen) return null;

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleIncrease = () => {
    setQuantity(quantity + 1);
  };

  const handleAddToCart = () => {
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
  };

  const totalPrice = product.price * quantity;

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
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {product.restaurant}
              </span>
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

          {/* Add to Cart Button - Fixed at bottom above BottomNav */}
          <div className="fixed bottom-16 left-0 right-0 px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-[60]">
            <button
              onClick={handleAddToCart}
              className="w-full bg-amber-400 hover:bg-amber-500 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-5 h-5" strokeWidth={2.5} />
                  <span className="text-base">Agregar al carrito</span>
                </div>
                <span className="text-lg font-bold">
                  ${totalPrice.toFixed(2)}
                </span>
              </div>
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
