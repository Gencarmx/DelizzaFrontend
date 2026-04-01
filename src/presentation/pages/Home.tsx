import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, /* Heart, Star, Clock, */ ChevronLeft, ChevronRight, Loader2, MapPin } from "lucide-react";
import ProductModal from "@presentation/components/common/ProductModal";
import { SearchBar, type ProductResult as SearchProductResult, type RestaurantResult as SearchRestaurantResult } from "@presentation/components/layout/SearchBar";
import { supabase } from "@core/supabase/client";
import { getActiveProductCategories, type ProductCategory } from "@core/services/productCategoryService";
import { isBusinessOpenNow } from "@core/services/businessHoursService";
import { useAddress } from "@core/context/AddressContext";
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

// Número máximo de productos a mostrar en el carrusel "Todos los productos"
const PRODUCTS_CAROUSEL_LIMIT = 40;

export default function Home() {
  const { selectedAddress, loading: addressLoading } = useAddress();
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    price: number;
    image: string;
    has_addons?: boolean;
    restaurant?: { id: string; name: string; };
    description?: string;
    restaurantStatus?: 'open' | 'paused' | 'closed';
  } | null>(null);

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState({
    restaurants: true,
    categories: true,
    allProducts: true
  });
  const [error, setError] = useState<string | null>(null);
  const allProductsScrollRef = useRef<HTMLDivElement>(null);

  // Los productos mostrados en el carrusel: si hay categoría activa usa el fetch
  // específico de esa categoría; de lo contrario usa los 40 más recientes.
  const displayProducts = selectedCategory ? categoryProducts : allProducts;

  const handleProductClick = (product: {
    id: string;
    name: string;
    price: number;
    image: string;
    has_addons?: boolean;
    restaurant?: string;
    restaurantId?: string;
    description?: string;
  }) => {
    const validRestaurantId = product.restaurantId && product.restaurantId !== 'unknown'
      ? product.restaurantId
      : null;
    const restaurantInfo = validRestaurantId
      ? restaurants.find(r => r.id === validRestaurantId)
      : null;
    const restaurantStatus: 'open' | 'paused' | 'closed' = restaurantInfo?.status?.type ?? 'open';
    setSelectedProduct({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      description: product.description,
      has_addons: product.has_addons,
      restaurant: validRestaurantId && product.restaurant
        ? { id: validRestaurantId, name: product.restaurant }
        : undefined,
      restaurantStatus,
    });
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  const handleCategoryClick = async (categoryId: string) => {
    // Deseleccionar la misma categoría: volver a todos los productos
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
      setCategoryProducts([]);
      return;
    }

    setSelectedCategory(categoryId);
    setCategoryLoading(true);

    try {
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, price, description, image_url, active, business_id, category_id, has_addons')
        .eq('active', true)
        .eq('category_id', categoryId);

      if (productsData) {
        // Usar el mapa de restaurantes ya cargado en estado: evita un round-trip extra
        const businessMap = new Map(restaurants.map(r => [r.id, r.name]));
        const enriched = productsData
          .filter(p => businessMap.has(p.business_id))
          .map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            description: p.description || "",
            image: p.image_url || "https://via.placeholder.com/200",
            restaurant: businessMap.get(p.business_id) || "Unknown",
            restaurantId: p.business_id,
            category_id: p.category_id,
            has_addons: p.has_addons ?? false,
            rating: "4.5",
            delivery: "$30",
            time: "30 min",
          }));
        setCategoryProducts(enriched);
      }
    } catch (err) {
      console.error('Error cargando productos por categoría:', err);
      setCategoryProducts([]);
    } finally {
      setCategoryLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setLoading({ restaurants: true, categories: true, allProducts: true });

        // Las tres fuentes son independientes — se ejecutan en paralelo.
        const [categoriesData, allProductsResult, restaurantsResult] = await Promise.all([
          getActiveProductCategories(),
          supabase
            .from('products')
            .select('id, name, price, description, image_url, active, business_id, category_id, has_addons')
            .eq('active', true)
            .limit(PRODUCTS_CAROUSEL_LIMIT),
          supabase
            .from('businesses')
            .select('id, name, address, active, logo_url, is_paused')
            .eq('active', true),
        ]);

        // — Categorías —
        setCategories(categoriesData);

        // — Restaurantes con estado tricolor —
        let businessNameMap = new Map<string, string>();

        if (restaurantsResult.error) {
          console.error('Error fetching restaurants:', restaurantsResult.error);
        } else {
          const restaurantList = restaurantsResult.data ?? [];

          // Construir el mapa id→name que también usarán los productos.
          // Esto elimina la query secundaria a businesses que existía antes.
          businessNameMap = new Map(restaurantList.map(b => [b.id, b.name]));

          // Fetch horarios de todos los restaurantes en un solo query
          const restaurantIds = restaurantList.map(b => b.id);
          const { data: hoursData } = restaurantIds.length > 0
            ? await supabase
                .from('business_hours')
                .select('business_id, day_of_week, open_time, close_time, active, id, created_at, updated_at')
                .in('business_id', restaurantIds)
            : { data: [] };

          // Agrupar horarios por business_id para consulta O(1)
          const hoursMap = new Map<string, BusinessHour[]>();
          for (const hour of (hoursData ?? [])) {
            const existing = hoursMap.get(hour.business_id) ?? [];
            existing.push(hour as BusinessHour);
            hoursMap.set(hour.business_id, existing);
          }

          setRestaurants(restaurantList.map(b => {
            const hours = hoursMap.get(b.id) ?? [];
            const restaurantStatus = computeRestaurantStatus(b.active, b.is_paused, hours);
            return {
              id: b.id,
              name: b.name,
              address: b.address || "Dirección no disponible",
              status: restaurantStatus,
              logo: b.logo_url || "https://via.placeholder.com/200",
            };
          }));
        }

        // — Productos (carrusel inicial) —
        // Se usa el mapa de restaurantes ya construido: sin query extra a businesses.
        if (allProductsResult.error) {
          console.error('Error fetching all products:', allProductsResult.error);
        } else {
          const allProductsData = allProductsResult.data ?? [];
          setAllProducts(
            allProductsData
              .filter(p => businessNameMap.has(p.business_id))
              .map(p => ({
                id: p.id,
                name: p.name,
                rating: "4.5",
                delivery: "$30",
                time: "30 min",
                price: p.price,
                restaurant: businessNameMap.get(p.business_id) || "Unknown",
                restaurantId: p.business_id,
                description: p.description || "",
                image: p.image_url || "https://via.placeholder.com/200",
                category_id: p.category_id,
                has_addons: (p as any).has_addons ?? false,
              }))
          );
        }

        setLoading({ restaurants: false, categories: false, allProducts: false });
      } catch (error) {
        console.error('Error general al cargar datos:', error);
        setError('Error al cargar los datos. Por favor, intenta de nuevo.');
        setLoading({ restaurants: false, categories: false, allProducts: false });
      }
    };

    fetchData();
  }, []);

  const scrollAllProductsLeft = () => {
    allProductsScrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const scrollAllProductsRight = () => {
    allProductsScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
  };

  const getAddressDisplay = () => {
    if (addressLoading) {
      return "Cargando...";
    }
    if (!selectedAddress) {
      return "Toca aquí para agregar una dirección";
    }
    return `${selectedAddress.line1}, ${selectedAddress.city}, ${selectedAddress.state}`;
  };

  return (
    <div className="flex flex-col gap-6 pt-2">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mx-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 text-red-600 dark:text-red-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-800 dark:text-red-200 text-sm font-medium">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Address Selector */}
      <button onClick={() => navigate('/saved-addresses')} className="flex items-center gap-1 bg-white dark:bg-gray-800 px-4 py-2 rounded-full w-fit shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer">
        <MapPin className="w-5 h-5 text-gray-800 dark:text-gray-200" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {getAddressDisplay()}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {/* Hero/Search */}
      <div className="bg-amber-100/50 dark:bg-gray-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <h2 className="text-xl font-medium text-gray-800 dark:text-white tracking-wide font-serif text-center">
          ¿Que se te antoja hoy?
        </h2>
        <SearchBar
          onProductSelect={handleProductClick}
          onRestaurantSelect={(restaurant) => navigate(`/restaurant-detail/${restaurant.id}`)}
          initialProducts={allProducts.map<SearchProductResult>(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            image: p.image,
            restaurant: p.restaurant,
            restaurantId: p.restaurantId,
            description: p.description,
            type: "product",
          }))}
          initialRestaurants={restaurants.map<SearchRestaurantResult>(r => ({
            id: r.id,
            name: r.name,
            address: r.address,
            logo: r.logo,
            status: r.status.label,
            type: "restaurant",
          }))}
        />
      </div>

      {/* Categories */}
      <div className="px-2">
        {loading.categories ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No hay categorías disponibles
            </p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4 snap-x md:justify-center md:flex-wrap md:overflow-x-visible">
            {categories.map((category) => (
              <div
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className="flex flex-col items-center gap-2 cursor-pointer group flex-shrink-0 snap-start min-w-[70px] max-w-[80px]"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200 border ${selectedCategory === category.id
                  ? "bg-amber-400 dark:bg-amber-500 border-amber-500 dark:border-amber-400 scale-105 shadow-md"
                  : "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-gray-800 dark:to-gray-700 border-amber-200/50 dark:border-gray-600"
                  }`}>
                  {category.icon || "🍽️"}
                </div>
                <span className={`text-[10px] leading-tight font-medium text-center w-full line-clamp-2 px-1 ${selectedCategory === category.id
                  ? "text-amber-600 dark:text-amber-400 font-semibold"
                  : "text-gray-700 dark:text-gray-300"
                  }`}>
                  {category.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Products Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
            {selectedCategory
              ? categories.find(c => c.id === selectedCategory)?.name ?? "Todos los productos"
              : "Todos los productos"}
          </h3>
          {selectedCategory ? (
            <button
              onClick={() => { setSelectedCategory(null); setCategoryProducts([]); }}
              className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline cursor-pointer"
            >
              Ver todos
            </button>
          ) : allProducts.length >= PRODUCTS_CAROUSEL_LIMIT && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Mostrando {PRODUCTS_CAROUSEL_LIMIT} recientes
            </span>
          )}
        </div>

        {loading.allProducts || categoryLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No hay productos disponibles en esta categoría
            </p>
          </div>
        ) : (
          <div className="relative">
            <button onClick={scrollAllProductsLeft} className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800 p-2 rounded-full shadow-md z-10 opacity-70 hover:opacity-100">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div ref={allProductsScrollRef} className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x hide-scrollbar">
              {displayProducts.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleProductClick(item)}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-3 min-w-[160px] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-2 snap-start cursor-pointer hover:shadow-md transition-shadow"
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {item.restaurant}
                    </p>
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">
                      ${item.price}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={scrollAllProductsRight} className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800 p-2 rounded-full shadow-md z-10 opacity-70 hover:opacity-100">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>

      {/* Restaurants Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Restaurantes</h3>
          <button className="text-amber-400 text-sm font-medium hover:text-amber-500 cursor-pointer">
            Ver mas
          </button>
        </div>
        {loading.restaurants ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No hay restaurantes disponibles en este momento
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {restaurants.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/restaurant-detail/${item.id}`)}
                className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow group"
              >
                <div className="relative h-32 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <img
                    src={item.logo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    alt={item.name}
                    loading="lazy"
                  />
                  <span className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    item.status.type === 'open'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300'
                      : item.status.type === 'paused'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {item.status.label}
                  </span>
                </div>
                <div className="p-3">
                  <h4 className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-1 mt-1">
                    {/* Star rating and time hidden as future functions */}
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 truncate">
                    {item.address}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          isOpen={!!selectedProduct}
          onClose={handleCloseModal}
          product={selectedProduct}
          restaurantStatus={selectedProduct.restaurantStatus}
        />
      )}
    </div>
  );
}
