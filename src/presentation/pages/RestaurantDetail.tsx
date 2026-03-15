import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ChevronLeft, /* Star */ Loader2, BellOff, Clock as ClockIcon } from "lucide-react";
import { supabase } from "@core/supabase/client";
import ProductModal from "@presentation/components/common/ProductModal";
import { isBusinessOpenNow } from "@core/services/businessHoursService";
import type { Database } from "@core/supabase/types";

type BusinessHour = Database['public']['Tables']['business_hours']['Row'];

type RestaurantStatus =
  | { type: 'open';   label: 'Abierto' }
  | { type: 'paused'; label: 'No recibimos pedidos' }
  | { type: 'closed'; label: 'Cerrado por el momento' };

function computeRestaurantStatus(
  active: boolean | null,
  isPaused: boolean,
  hours: BusinessHour[]
): RestaurantStatus {
  if (!active) return { type: 'closed', label: 'Cerrado por el momento' };
  if (isPaused) return { type: 'paused', label: 'No recibimos pedidos' };

  const openNow = isBusinessOpenNow(hours);

  if (openNow === null) return { type: 'open', label: 'Abierto' };
  if (openNow === false) return { type: 'closed', label: 'Cerrado por el momento' };
  return { type: 'open', label: 'Abierto' };
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
  } | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    price: number;
    image: string;
    restaurant?: { id: string; name: string };
    description?: string;
  } | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch business e horarios en paralelo
        const [businessResult, hoursResult] = await Promise.all([
          supabase
            .from("businesses")
            .select("id, name, address, active, logo_url, is_paused")
            .eq("id", restaurantId)
            .single(),
          supabase
            .from("business_hours")
            .select("*")
            .eq("business_id", restaurantId),
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
        });

        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("id, name, price, description, image_url, active, business_id")
          .eq("business_id", restaurantId)
          .eq("active", true);

        if (productsError) {
          console.error("Error fetching products:", productsError);
        } else {
          const mapped =
            productsData?.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              description: p.description || "",
              image: p.image_url || "https://via.placeholder.com/200",
              restaurantId: p.business_id,
            })) || [];
          setProducts(mapped);
        }
      } catch (err) {
        console.error("Error general:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId, navigate]);

  const handleProductClick = (product: any) => {
    setSelectedProduct({
      ...product,
      restaurant: restaurant
        ? { id: restaurant.id, name: restaurant.name }
        : undefined,
    });
  };

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

      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative h-48 bg-gray-100 dark:bg-gray-700">
          <img
            src={restaurant.logo}
            alt={restaurant.name}
            className="w-full h-full object-cover"
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
        </div>
      </div>

      {/* Banner de aviso cuando el restaurante no acepta pedidos */}
      {restaurant.restaurantStatus.type === 'paused' && (
        <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
          <BellOff className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              No recibimos pedidos por el momento
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Estamos saturados de pedidos. Reanudaremos la atención lo más pronto posible. ¡Gracias por tu paciencia!
            </p>
          </div>
        </div>
      )}

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

      <section>
        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">
          Productos
        </h3>
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No hay productos disponibles en este restaurante
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((item) => (
              <div
                key={item.id}
                onClick={() => handleProductClick(item)}
                className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-2 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="relative h-28 rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={item.image}
                    className="w-full h-full object-cover"
                    alt={item.name}
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
            ))}
          </div>
        )}
      </section>

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
