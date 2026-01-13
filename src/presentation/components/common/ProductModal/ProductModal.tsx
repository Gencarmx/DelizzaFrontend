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
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>

        {/* Product Image */}
        <div className="relative h-64 w-full bg-gray-100">
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
              <span className="text-sm text-gray-500 font-medium">
                {product.restaurant}
              </span>
            )}
            <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
            {product.description && (
              <p className="text-gray-600 text-sm leading-relaxed">
                {product.description}
              </p>
            )}
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold text-gray-900">
                ${product.price}
              </span>
              <span className="text-sm text-gray-500">MXN</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200" />

          {/* Quantity Selector */}
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Cantidad</h3>
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
              <button
                onClick={handleDecrease}
                disabled={quantity <= 1}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  quantity <= 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-gray-100 shadow-sm"
                }`}
              >
                <Minus className="w-5 h-5" strokeWidth={2.5} />
              </button>

              <span className="text-2xl font-bold text-gray-900 min-w-[3rem] text-center">
                {quantity}
              </span>

              <button
                onClick={handleIncrease}
                className="w-10 h-10 rounded-full bg-white text-gray-700 hover:bg-gray-100 shadow-sm flex items-center justify-center transition-all"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            className="w-full bg-amber-400 hover:bg-amber-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            <ShoppingCart className="w-5 h-5" strokeWidth={2.5} />
            <span>Agregar al carrito</span>
            <span className="ml-auto bg-amber-500 px-3 py-1 rounded-full text-sm">
              ${totalPrice.toFixed(2)}
            </span>
          </button>
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
