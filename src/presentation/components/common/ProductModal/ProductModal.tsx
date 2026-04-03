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
      {/* Overlay + posicionador responsive:
          mobile  → bottom sheet (items-end, ancho completo)
          desktop → diálogo centrado (items-center, max-w-lg)  */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center sm:p-6"
        onClick={onClose}
      >
      {/* Modal */}
      <div
        className="relative w-full sm:max-w-lg bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white dark:hover:bg-gray-600 transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>

        {/* Product Image — fondo difuminado + imagen completa sin recorte */}
        <div className="relative h-64 w-full overflow-hidden bg-gray-900">
          {/* Backdrop difuminado: toma los colores de la imagen */}
          <img
            src={product.image}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50 pointer-events-none select-none"
          />
          {/* Imagen principal sin recorte */}
          <img
            src={product.image}
            alt={product.name}
            className="relative w-full h-full object-contain drop-shadow-xl"
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
                className="self-start text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
              >
                {product.restaurant.name}
              </button>
            )}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              {product.name}
            </h2>
            {product.description && (
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                {product.description}
              </p>
            )}
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                ${unitPrice.toFixed(2)}
              </span>
              <span className="text-sm text-gray-400 dark:text-gray-500">MXN</span>
              {addonsTotal > 0 && (
                <span className="text-xs text-amber-500 font-medium bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                  base ${product.price.toFixed(2)} + extras ${addonsTotal.toFixed(2)}
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
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/60 rounded-2xl px-5 py-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Cantidad</span>
            <div className="flex items-center gap-4">
              <button
                onClick={handleDecrease}
                disabled={quantity <= 1}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  quantity <= 1
                    ? "bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    : "bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500 shadow-sm"
                }`}
              >
                <Minus className="w-4 h-4" strokeWidth={2.5} />
              </button>
              <span className="text-xl font-bold text-gray-900 dark:text-white w-6 text-center">
                {quantity}
              </span>
              <button
                onClick={handleIncrease}
                className="w-9 h-9 rounded-full bg-amber-400 hover:bg-amber-500 text-white shadow-sm flex items-center justify-center transition-all"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Botones — sticky al fondo del scroll del modal */}
          <div className="sticky bottom-0 left-0 right-0 px-4 py-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-100 dark:border-gray-700 mt-2">
            {/* Total */}
            {(addonsTotal > 0 || quantity > 1) && (
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Total del pedido</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  ${totalPrice.toFixed(2)} MXN
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleAddToCart}
                disabled={!canOrder}
                className={`flex-1 font-bold py-3.5 px-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                  canOrder
                    ? "bg-amber-400 hover:bg-amber-500 text-white shadow-md hover:shadow-lg"
                    : "bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                }`}
              >
                <ShoppingCart className="w-4 h-4" strokeWidth={2.5} />
                <span className="text-sm">
                  {canOrder ? "Agregar al carrito" : "No disponible"}
                </span>
              </button>
              <button
                onClick={handleOrderNow}
                disabled={!canOrder}
                className={`font-bold py-3.5 px-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 ${
                  canOrder
                    ? "bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 shadow-md hover:shadow-lg"
                    : "bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                }`}
              >
                <Zap className="w-4 h-4" strokeWidth={2.5} />
                <span className="text-sm whitespace-nowrap">Pedir ya</span>
              </button>
            </div>
          </div>
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
