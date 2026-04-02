import { useState, useEffect } from "react";
import { X, Minus, Plus, ShoppingCart, AlertCircle, Zap, Loader2 } from "lucide-react";
import { useCart } from "@core/context/CartContext";
import { useNavigate } from "react-router-dom";
import type { AddonGroup, SelectedAddon } from "@core/supabase/types";
import {
  getAddonsGrouped,
  calculateAddonsTotal,
  buildCartItemId,
} from "@core/services/addonService";


export interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    has_addons?: boolean;
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
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [loadingAddons, setLoadingAddons] = useState(false);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  // ── Validaciones del restaurante ──────────────────────────────────────────
  const hasValidRestaurant = product.restaurant?.id &&
    product.restaurant.id !== 'unknown' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(product.restaurant.id);

  const canOrder = hasValidRestaurant && restaurantStatus === 'open';

  const restaurantBlockMessage =
    restaurantStatus === 'paused'
      ? 'Este restaurante no está recibiendo pedidos por el momento'
      : restaurantStatus === 'closed'
        ? 'Este restaurante está cerrado en este momento'
        : null;

  // ── Carga lazy de extras ──────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!product.has_addons) return;

    let cancelled = false;
    setLoadingAddons(true);
    setAddonGroups([]);
    setSelectedAddons([]);

    getAddonsGrouped(product.id)
      .then(groups => {
        if (cancelled) return;
        setAddonGroups(groups);
        // Inicializar selección a 0 para todos los addons
        const initial: SelectedAddon[] = groups.flatMap(g =>
          g.addons.map(a => ({
            addon_id: a.id,
            name: a.name,
            price: a.price,
            quantity: 0,
          }))
        );
        setSelectedAddons(initial);
      })
      .catch(() => { /* extras no críticos — el producto se puede agregar sin ellos */ })
      .finally(() => { if (!cancelled) setLoadingAddons(false); });

    return () => { cancelled = true; };
  }, [product.id, product.has_addons]);

  // ── Precio total en tiempo real ───────────────────────────────────────────
  const addonsTotal = calculateAddonsTotal(selectedAddons);
  const unitPrice = product.price + addonsTotal;
  const totalPrice = unitPrice * quantity;

  // ── Control de cantidad de extras ─────────────────────────────────────────
  const changeAddonQty = (addonId: string, delta: number) => {
    setSelectedAddons(prev => prev.map(a => {
      if (a.addon_id !== addonId) return a;
      // Buscar max_quantity del addon
      const addonDef = addonGroups.flatMap(g => g.addons).find(d => d.id === addonId);
      const max = addonDef?.max_quantity ?? 1;
      const next = Math.max(0, Math.min(max, a.quantity + delta));
      return { ...a, quantity: next };
    }));
  };

  // ── Handlers del modal ────────────────────────────────────────────────────
  const handleDecrease = () => { if (quantity > 1) setQuantity(q => q - 1); };
  const handleIncrease = () => setQuantity(q => q + 1);

  const buildItem = () => {
    const activeAddons = selectedAddons.filter(a => a.quantity > 0);
    return {
      id: buildCartItemId(product.id, activeAddons),
      productId: product.id,
      name: product.name,
      basePrice: product.price,
      price: unitPrice,
      image: product.image,
      restaurant: product.restaurant,
      selectedAddons: activeAddons.length > 0 ? activeAddons : undefined,
    };
  };

  const handleAddToCart = () => {
    if (!hasValidRestaurant) {
      setError("No se puede agregar este producto: información del restaurante no disponible.");
      return;
    }
    if (!canOrder) return;

    addToCart({ ...buildItem(), quantity });
    onClose();
    setQuantity(1);
    setError(null);
  };

  const handleOrderNow = () => {
    if (!hasValidRestaurant) {
      setError("No se puede agregar este producto: información del restaurante no disponible.");
      return;
    }
    if (!canOrder) return;

    addToCart({ ...buildItem(), quantity });
    onClose();
    setQuantity(1);
    setError(null);
    navigate("/cart");
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto pb-32">
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
        <div className="p-6 flex flex-col gap-5">
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
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                ${unitPrice.toFixed(2)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">MXN</span>
              {addonsTotal > 0 && (
                <span className="text-sm text-amber-500 font-medium">
                  (base ${product.price.toFixed(2)} + extras ${addonsTotal.toFixed(2)})
                </span>
              )}
            </div>

            {/* Mensajes de error/advertencia */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mt-1">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}
            {!hasValidRestaurant && !error && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mt-1">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Este producto no puede ser agregado al carrito (información del restaurante incompleta)
                </p>
              </div>
            )}
            {restaurantBlockMessage && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mt-1">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {restaurantBlockMessage}
                </p>
              </div>
            )}
          </div>

          {/* ── Sección de Extras ─────────────────────────────────────────── */}
          {product.has_addons && (
            <>
              <div className="h-px bg-gray-200 dark:bg-gray-700" />

              {loadingAddons ? (
                <div className="flex items-center justify-center gap-2 py-4 text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Cargando opciones...</span>
                </div>
              ) : addonGroups.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Personaliza tu pedido
                  </h3>
                  {addonGroups.map(group => (
                    <div key={group.category} className="flex flex-col gap-2">
                      <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        {group.category}
                      </h4>
                      <div className="flex flex-col gap-1 rounded-2xl bg-gray-50 dark:bg-gray-700/50 overflow-hidden">
                        {group.addons.map(addon => {
                          const sel = selectedAddons.find(s => s.addon_id === addon.id);
                          const qty = sel?.quantity ?? 0;
                          return (
                            <div
                              key={addon.id}
                              className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-600/50 last:border-0"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {addon.name}
                                </span>
                                <span className="ml-2 text-sm text-amber-500 font-semibold">
                                  {addon.price === 0 ? "Incluido" : `+$${addon.price.toFixed(2)}`}
                                </span>
                              </div>
                              {/* Control de cantidad del extra */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => changeAddonQty(addon.id, -1)}
                                  disabled={qty === 0}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                    qty === 0
                                      ? "bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed"
                                      : "bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-100"
                                  }`}
                                >
                                  <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                                </button>
                                <span className={`text-sm font-bold min-w-[1.25rem] text-center ${
                                  qty > 0 ? "text-amber-500" : "text-gray-400 dark:text-gray-500"
                                }`}>
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => changeAddonQty(addon.id, 1)}
                                  disabled={qty >= addon.max_quantity}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                    qty >= addon.max_quantity
                                      ? "bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed"
                                      : "bg-amber-400 hover:bg-amber-500 text-white shadow-sm"
                                  }`}
                                >
                                  <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}

          <div className="h-px bg-gray-200 dark:bg-gray-700" />

          {/* Cantidad del producto */}
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

          {/* Botones — fijos sobre el BottomNav */}
          <div className="fixed bottom-16 left-0 right-0 px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-[60] flex gap-3">
            {/* Total visible cuando hay extras seleccionados */}
            {(addonsTotal > 0 || quantity > 1) && (
              <div className="absolute -top-9 left-6 text-xs text-gray-500 dark:text-gray-400">
                Total: <span className="font-bold text-gray-900 dark:text-white">${totalPrice.toFixed(2)}</span>
              </div>
            )}
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
          from { transform: translateY(100%); }
          to   { transform: translateY(0);    }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
