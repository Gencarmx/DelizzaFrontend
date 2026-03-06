import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, /* Heart, Star, Clock, */ ChevronLeft, ChevronRight, Loader2, MapPin } from "lucide-react";
import ProductModal from "@presentation/components/common/ProductModal";
import { SearchBar } from "@presentation/components/layout/SearchBar";
import { supabase } from "@core/supabase/client";
import { getActiveProductCategories, type ProductCategory } from "@core/services/productCategoryService";
import { useAddress } from "@core/context/AddressContext";

export default function Home() {
  const { selectedAddress, loading: addressLoading } = useAddress();
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    price: number;
    image: string;
    restaurant?: { id: string; name: string; };
    description?: string;
  } | null>(null);

  // const [favorites, setFavorites] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState({
    // favorites: true,
    restaurants: true,
    categories: true,
    allProducts: true
  });
  const [error, setError] = useState<string | null>(null);
  // const scrollRef = useRef<HTMLDivElement>(null);
  const allProductsScrollRef = useRef<HTMLDivElement>(null);

  const filteredProducts = selectedCategory
    ? allProducts.filter(product => product.category_id === selectedCategory)
    : allProducts;

  const handleProductClick = (product: {
    id: string;
    name: string;
    price: number;
    image: string;
    restaurant?: string;
    restaurantId?: string;
    description?: string;
  }) => {
    const validRestaurantId = product.restaurantId && product.restaurantId !== 'unknown'
      ? product.restaurantId
      : null;
    setSelectedProduct({
      ...product,
      restaurant: validRestaurantId && product.restaurant
        ? { id: validRestaurantId, name: product.restaurant }
        : undefined
    });
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(prev => prev === categoryId ? null : categoryId);
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setLoading(prev => ({ ...prev, categories: true }));
        const categoriesData = await getActiveProductCategories();
        setCategories(categoriesData);
        setLoading(prev => ({ ...prev, categories: false }));

        /* Favorites fetching hidden for future release
        setLoading(prev => ({ ...prev, favorites: true }));
        const { data: favoritesData, error: favoritesError } = await supabase
          .from('products')
          .select('id, name, price, description, image_url, active, business_id')
          .eq('active', true)
          .limit(10);
        if (favoritesError) {
          console.error('Error fetching favorites:', favoritesError);
        } else {
          const businessIds = [...new Set(favoritesData?.map(p => p.business_id) || [])];
          const { data: businessesData } = await supabase
            .from('businesses')
            .select('id, name')
            .in('id', businessIds);
          const businessMap = new Map(businessesData?.map(b => [b.id, b.name]) || []);
          const mappedFavorites = favoritesData?.map((p: any) => ({
            id: p.id,
            name: p.name,
            rating: "4.5",
            delivery: "$30",
            time: "30 min",
            price: p.price,
            restaurant: businessMap.get(p.business_id) || "Unknown",
            restaurantId: p.business_id,
            description: p.description || "",
            image: p.image_url || "https://via.placeholder.com/200"
          })) || [];
          setFavorites(mappedFavorites);
        }
        setLoading(prev => ({ ...prev, favorites: false }));
        */

        setLoading(prev => ({ ...prev, allProducts: true }));
        const { data: allProductsData, error: allProductsError } = await supabase
          .from('products')
          .select('id, name, price, description, image_url, active, business_id, category_id')
          .eq('active', true);
        if (allProductsError) {
          console.error('Error fetching all products:', allProductsError);
        } else {
          const allBusinessIds = [...new Set(allProductsData?.map(p => p.business_id) || [])];
          const { data: allBusinessesData } = await supabase
            .from('businesses')
            .select('id, name')
            .in('id', allBusinessIds);
          const allBusinessMap = new Map(allBusinessesData?.map(b => [b.id, b.name]) || []);
          const mappedAllProducts = allProductsData?.map((p: any) => ({
            id: p.id,
            name: p.name,
            rating: "4.5",
            delivery: "$30",
            time: "30 min",
            price: p.price,
            restaurant: allBusinessMap.get(p.business_id) || "Unknown",
            restaurantId: p.business_id,
            description: p.description || "",
            image: p.image_url || "https://via.placeholder.com/200",
            category_id: p.category_id
          })) || [];
          setAllProducts(mappedAllProducts);
        }
        setLoading(prev => ({ ...prev, allProducts: false }));

        setLoading(prev => ({ ...prev, restaurants: true }));
        const { data: restaurantsData, error: restaurantsError } = await supabase
          .from('businesses')
          .select('id, name, address, active, logo_url')
          .eq('active', true);
        if (restaurantsError) {
          console.error('Error fetching restaurants:', restaurantsError);
        } else {
          const mappedRestaurants = restaurantsData?.map(b => ({
            id: b.id,
            name: b.name,
            address: b.address || "Dirección no disponible",
            status: b.active ? "Abierto" : "Cerrado",
            logo: b.logo_url || "https://via.placeholder.com/200"
          })) || [];
          setRestaurants(mappedRestaurants);
        }
        setLoading(prev => ({ ...prev, restaurants: false }));

      } catch (error) {
        console.error('Error general al cargar datos:', error);
        setError('Error al cargar los datos. Por favor, intenta de nuevo.');
        setLoading({ /* favorites: false, */ restaurants: false, categories: false, allProducts: false });
      }
    };

    fetchData();
  }, []);

  /*
    const scrollLeft = () => {
      scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
    };
  
    const scrollRight = () => {
      scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
    };
  */

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
      return "No tienes direcciones guardadas. Agrega una en tu perfil.";
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
      <button className="flex items-center gap-1 bg-white dark:bg-gray-800 px-4 py-2 rounded-full w-fit shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer">
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

      {/* Favorites Section - Future Feature
      <section>
        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">
          El favorito entre los locales
        </h3>
        {loading.favorites ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No hay productos disponibles en este momento
            </p>
          </div>
        ) : (
          <div className="relative">
            <button onClick={scrollLeft} className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800 p-2 rounded-full shadow-md z-10 opacity-70 hover:opacity-100">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x hide-scrollbar">
              {favorites.map((item, index) => (
              <div
                key={index}
                onClick={() => handleProductClick(item)}
                className="bg-white dark:bg-gray-800 rounded-2xl p-3 min-w-[200px] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-2 snap-start cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="relative h-32 rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={item.image}
                    className="w-full h-full object-cover"
                    alt={item.name}
                  />
                  <button className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full cursor-pointer">
                    <Heart className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span className="flex items-center gap-1 text-amber-500 font-medium">
                      <Star className="w-3 h-3 fill-current" /> {item.rating}
                    </span>
                    <span>Envío: {item.delivery}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {item.time}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            </div>
            <button onClick={scrollRight} className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800 p-2 rounded-full shadow-md z-10 opacity-70 hover:opacity-100">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>
      */}

      {/* All Products Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
            {selectedCategory
              ? categories.find(c => c.id === selectedCategory)?.name ?? "Todos los productos"
              : "Todos los productos"}
          </h3>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline cursor-pointer"
            >
              Ver todos
            </button>
          )}
        </div>
        {loading.allProducts ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : filteredProducts.length === 0 ? (
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
              {filteredProducts.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleProductClick(item)}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-3 min-w-[160px] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-2 snap-start cursor-pointer hover:shadow-md transition-shadow"
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
            {restaurants.map((item, index) => (
              <div
                key={index}
                onClick={() => navigate(`/restaurant-detail/${item.id}`)}
                className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow group"
              >
                <div className="relative h-32 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <img
                    src={item.logo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    alt={item.name}
                  />
                  <span className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.status === 'Abierto' ? 'bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {item.status}
                  </span>
                </div>
                <div className="p-3">
                  <h4 className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-1 mt-1">
                    {/* Star rating and time hidden as future functions
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-medium text-amber-500">4.5</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 mx-1">·</span>
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">30 min</span>
                    */}
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
        />
      )}
    </div>
  );
}
