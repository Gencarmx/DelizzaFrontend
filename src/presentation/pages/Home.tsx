import { useState, useEffect, useRef } from "react";
import { ChevronDown, Heart, Star, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import ProductModal from "@presentation/components/common/ProductModal";
import { supabase } from "@core/supabase/client";

export default function Home() {
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    price: number;
    image: string;
    restaurant?: string;
    description?: string;
  } | null>(null);

  const [favorites, setFavorites] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleProductClick = (product: {
    id: string;
    name: string;
    price: number;
    image: string;
    restaurant?: string;
    description?: string;
  }) => {
    setSelectedProduct(product);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  useEffect(() => {
    const fetchFavorites = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, businesses(name)')
        .eq('active', true)
        .limit(10);

      if (error) {
        console.error('Error fetching favorites:', error);
      } else {
        const mapped = data.map(p => ({
          id: p.id,
          name: p.name,
          rating: "4.5",
          delivery: "$30",
          time: "30 min",
          price: p.price,
          restaurant: p.businesses?.name || "Unknown",
          description: p.description || "",
          image: p.image_url || "https://via.placeholder.com/200"
        }));
        setFavorites(mapped);
      }
    };

    const fetchRestaurants = async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('*');

      if (error) {
        console.error('Error fetching restaurants:', error);
      } else {
        const mapped = data.map(b => ({
          id: b.id,
          name: b.name,
          address: b.address || "Dirección no disponible",
          status: b.active ? "Abierto" : "Cerrado",
          logo: b.logo_url || "https://via.placeholder.com/200"
        }));
        setRestaurants(mapped);
      }
    };

    fetchFavorites();
    fetchRestaurants();
  }, []);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col gap-6 pt-2">
      {/* Address Selector */}
      <button className="flex items-center gap-1 bg-white dark:bg-gray-800 px-4 py-2 rounded-full w-fit shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer">
        <div className="w-5 h-5 flex items-center justify-center rounded-full border border-gray-800">
          <div className="w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Calle 25 77517 Izamal
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {/* Hero/Search */}
      <div className="bg-amber-100/50 dark:bg-gray-800 rounded-2xl p-6 text-center shadow-sm">
        <h2 className="text-xl font-medium text-gray-800 dark:text-white mb-0 tracking-wide font-serif">
          ¿Que se te antoja hoy?
        </h2>
      </div>

      {/* Categories */}
      <div className="flex justify-between px-2">
        {[
          { icon: "🍕", label: "Pizzas" },
          { icon: "🧋", label: "Bebidas" },
          { icon: "🍰", label: "Postres" },
          { icon: "🍔", label: "Burger" },
        ].map((item, index) => (
          <div
            key={index}
            className="flex flex-col items-center gap-2 cursor-pointer group"
          >
            <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-2xl shadow-sm group-hover:bg-white dark:group-hover:bg-gray-700 group-hover:shadow-md transition-all">
              {item.icon}
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Favorites Section */}
      <section>
        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">
          El favorito entre los locales
        </h3>
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
      </section>

      {/* Restaurants List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Restaurantes</h3>
          <button className="text-amber-400 text-sm font-medium hover:text-amber-500 cursor-pointer">
            Ver mas &gt;
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {restaurants.map((item, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden">
                <img
                  src={item.logo}
                  className="w-full h-full object-cover"
                  alt={item.name}
                />
              </div>
              <div className="flex-1 py-1">
                <h4 className="font-semibold text-gray-800 dark:text-white">{item.name}</h4>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-2">
                  <span>Dirección: {item.address}</span>
                  <span>{item.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
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
