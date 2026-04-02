import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ChevronLeft, /* Star */ Loader2, BellOff, Clock as ClockIcon, Bike, Store as StoreIcon } from "lucide-react";
import { supabase } from "@core/supabase/client";
import ProductModal from "@presentation/components/common/ProductModal";
import { isBusinessOpenNow } from "@core/services/businessHoursService";
import { getActiveProductCategories, type ProductCategory } from "@core/services/productCategoryService";
import type { Database } from "@core/supabase/types";

type BusinessHour = Database['public']['Tables']['business_hours']['Row'];

type RestaurantStatus =
  | { type: 'open';   label: 'Abierto' }
  | { type: 'paused'; label: 'Pausado por el momento' }
  | { type: 'closed'; label: 'Cerrado por el momento' };

function computeRestaurantStatus(
  active: boolean | null,
  isPaused: boolean,
  hours: BusinessHour[]
): RestaurantStatus {
  if (!active) return { type: 'closed', label: 'Cerrado por el momento' };
  if (isPaused) return { type: 'paused', label: 'Pausado por el momento' };

  const openNow = isBusinessOpenNow(hours);

  if (openNow === null) return { type: 'open', label: 'Abierto' };
  if (openNow === false) return { type: 'closed', label: 'Cerrado por el momento' };
  return { type: 'open', label: 'Abierto' };
}

interface MappedProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  restaurantId: string;
  category_id: string | null;
  has_addons: boolean;
}

export default function RestaurantDetail() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState<{
    id: string;
    name: string;
    address: string;
    logo: string;
    restaurantStatus: RestaurantStatus;
    hasDelivery: boolean;
    hasPickup: boolean;
  } | null>(null);
  const [products, setProducts] = useState<MappedProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    price: number;
    image: string;
    has_addons?: boolean;
    restaurant?: { id: string; name: string };
    description?: string;
  } | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch business, horarios, categorías y productos en paralelo
        const [businessResult, hoursResult, categoriesData, productsResult] = await Promise.all([
          supabase
            .from("businesses")
            .select("id, name, address, active, logo_url, is_paused, has_delivery, has_pickup")
            .eq("id", restaurantId)
            .single(),
          supabase
            .from("business_hours")
            .select("day_of_week, open_time, close_time, active")
            .eq("business_id", restaurantId),
          getActiveProductCategories(),
          supabase
            .from("products")
            .select("id, name, price, description, image_url, active, business_id, category_id, has_addons")
            .eq("business_id", restaurantId)
            .eq("active", true),
        ]);

        const { data: businessData, error: businessError } = businessResult;

        if (businessError || !businessData) {
          navigate("/");
          return;
        }

        const hours = (hoursResult.data ?? []) as BusinessHour[];
        const restaurantStatus = computeRestaurantStatus(
          businessData.active,
          businessData.is_paused,
          hours
        );

        setRestaurant({
          id: businessData.id,
          name: businessData.name,
          address: businessData.address || "Dirección no disponible",
          logo: businessData.logo_url || "https://via.placeholder.com/200",
          restaurantStatus,
          hasDelivery: businessData.has_delivery ?? true,
          hasPickup: businessData.has_pickup ?? true,
        });

        setCategories(categoriesData);

        if (!productsResult.error) {
          const mapped: MappedProduct[] = (productsResult.data ?? []).map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            description: p.description || "",
            image: p.image_url || "https://via.placeholder.com/200",
            restaurantId: p.business_id,
            category_id: p.category_id ?? null,
            has_addons: p.has_addons ?? false,
          }));
          setProducts(mapped);
        } else {
          console.error("Error fetching products:", productsResult.error);
        }
      } catch (err) {
        console.error("Error general:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId, navigate]);

  const handleProductClick = (product: MappedProduct) => {
    setSelectedProduct({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      description: product.description,
      has_addons: product.has_addons,
      restaurant: restaurant
        ? { id: restaurant.id, name: restaurant.name }
        : undefined,
    });
  };

  // Agrupar productos por categoría.
  // Solo se incluyen las categorías que tienen al menos un producto en este restaurante.
  const productsByCategory = categories
    .map(cat => ({
      category: cat,
      items: products.filter(p => p.category_id === cat.id),
    }))
    .filter(group => group.items.length > 0);

  // Productos sin categoría asignada
  const uncategorizedProducts = products.filter(p => !p.category_id);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!restaurant) return null;

  return (
    <div className="flex flex-col gap-6 pt-2">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white w-fit"
      >
        <ChevronLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Volver</span>
      </button>

      {/* Cabecera del restaurante */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative h-48 bg-gray-100 dark:bg-gray-700">
          <img
            src={restaurant.logo}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            loading="eager"
          />
          <span
            className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${
              restaurant.restaurantStatus.type === 'open'
                ? "bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300"
                : restaurant.restaurantStatus.type === 'paused'
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                  : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
            }`}
          >
            {restaurant.restaurantStatus.label}
          </span>
        </div>
        <div className="p-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {restaurant.name}
          </h2>
          {/* Rating and Time hidden for future release */}
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {restaurant.address}
          </p>
          <div className="flex gap-2 mt-3">
            {restaurant.hasDelivery && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                <Bike className="w-3 h-3" />
                Domicilio
              </span>
            )}
            {restaurant.hasPickup && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-100 dark:border-amber-800">
                <StoreIcon className="w-3 h-3" />
                Recoger
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Banner: restaurante en pausa */}
      {restaurant.restaurantStatus.type === 'paused' && (
        <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
          <BellOff className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              ⏸️ Pausado temporalmente
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Este restaurante no está recibiendo pedidos en este momento, pero volverá pronto. ¡Puedes explorar el menú y volver más tarde!
            </p>
          </div>
        </div>
      )}

      {/* Banner: restaurante cerrado */}
      {restaurant.restaurantStatus.type === 'closed' && (
        <div className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl">
          <ClockIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Cerrado por el momento
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Este restaurante se encuentra fuera de su horario de atención. Puedes ver el menú pero no realizar pedidos.
            </p>
          </div>
        </div>
      )}

      {/* Menú */}
      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No hay productos disponibles en este restaurante
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Sección por categoría */}
          {productsByCategory.map(({ category, items }) => (
            <section key={category.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl leading-none">{category.icon || "🍽️"}</span>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  {category.name}
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  ({items.length})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    onClick={() => handleProductClick(item)}
                  />
                ))}
              </div>
            </section>
          ))}

          {/* Productos sin categoría */}
          {uncategorizedProducts.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl leading-none">🍽️</span>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  Otros
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  ({uncategorizedProducts.length})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {uncategorizedProducts.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    onClick={() => handleProductClick(item)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {selectedProduct && (
        <ProductModal
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
          restaurantStatus={restaurant.restaurantStatus.type}
        />
      )}
    </div>
  );
}

// Componente de tarjeta de producto — extraído para evitar repetición entre secciones
function ProductCard({
  item,
  onClick,
}: {
  item: MappedProduct;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-2 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="relative h-28 rounded-xl overflow-hidden bg-gray-100">
        <img
          src={item.image}
          className="w-full h-full object-cover"
          alt={item.name}
          loading="lazy"
        />
      </div>
      <div>
        <h4 className="font-semibold text-gray-800 dark:text-white text-sm truncate">
          {item.name}
        </h4>
        <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">
          ${item.price}
        </p>
      </div>
    </div>
  );
}
