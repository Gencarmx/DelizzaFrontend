import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Search, Loader2, X } from "lucide-react";
import { supabase } from "@core/supabase/client";
import { isBusinessOpenNow } from "@core/services/businessHoursService";
import type { Database } from "@core/supabase/types";

type BusinessHour = Database['public']['Tables']['business_hours']['Row'];

type RestaurantStatus =
  | { type: 'open';   label: 'Abierto' }
  | { type: 'paused'; label: 'Pausado por el momento' }
  | { type: 'closed'; label: 'Cerrado por el momento' };

function computeRestaurantStatus(
  isPaused: boolean,
  hours: BusinessHour[]
): RestaurantStatus {
  if (isPaused) return { type: 'paused', label: 'Pausado por el momento' };
  const openNow = isBusinessOpenNow(hours);
  if (openNow === false) return { type: 'closed', label: 'Cerrado por el momento' };
  return { type: 'open', label: 'Abierto' };
}

interface RestaurantItem {
  id: string;
  name: string;
  address: string;
  logo: string;
  status: RestaurantStatus;
}

const STATUS_ORDER: Record<RestaurantStatus['type'], number> = { open: 0, paused: 1, closed: 2 };
const PAGE_SIZE = 10;

export default function Restaurants() {
  const navigate = useNavigate();

  const [allRestaurants, setAllRestaurants] = useState<RestaurantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Carga de restaurantes (todos activos, con horarios para calcular estado)
  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        const { data: businesses, error } = await supabase
          .from("businesses")
          .select("id, name, address, logo_url, is_paused")
          .eq("active", true);

        if (error) throw error;
        if (!businesses || businesses.length === 0) {
          setAllRestaurants([]);
          return;
        }

        const ids = businesses.map(b => b.id);
        const { data: hoursData } = await supabase
          .from("business_hours")
          .select("business_id, day_of_week, open_time, close_time, active, id, created_at, updated_at")
          .in("business_id", ids);

        const hoursMap = new Map<string, BusinessHour[]>();
        for (const h of (hoursData ?? [])) {
          const existing = hoursMap.get(h.business_id) ?? [];
          existing.push(h as BusinessHour);
          hoursMap.set(h.business_id, existing);
        }

        const list: RestaurantItem[] = businesses
          .map(b => ({
            id: b.id,
            name: b.name,
            address: b.address || "Dirección no disponible",
            logo: b.logo_url || "https://via.placeholder.com/200",
            status: computeRestaurantStatus(b.is_paused, hoursMap.get(b.id) ?? []),
          }))
          .sort((a, b) => STATUS_ORDER[a.status.type] - STATUS_ORDER[b.status.type]);

        setAllRestaurants(list);
      } catch (err) {
        console.error("Error cargando restaurantes:", err);
        setAllRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  // Filtrado local por búsqueda
  const filtered = debouncedSearch.trim()
    ? allRestaurants.filter(r =>
        r.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.address.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : allRestaurants;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="flex flex-col pt-2 pb-24 gap-5">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 sticky top-0 z-10 py-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>
        <h2 className="font-bold text-lg text-gray-900 dark:text-white">
          Todos los restaurantes
        </h2>
        {total > 0 && !loading && (
          <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
            {total} {total === 1 ? "restaurante" : "restaurantes"}
          </span>
        )}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar restaurantes..."
          className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Resultados */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando restaurantes...</p>
        </div>
      ) : pageItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
          <span className="text-4xl">🍽️</span>
          <p className="font-semibold text-gray-800 dark:text-white">
            {debouncedSearch
              ? `Sin resultados para "${debouncedSearch}"`
              : "No hay restaurantes disponibles"}
          </p>
          {debouncedSearch && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-sm text-amber-500 hover:underline mt-1"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pageItems.map(item => (
              <div
                key={item.id}
                onClick={() => navigate(`/restaurant-detail/${item.id}`)}
                className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow group"
              >
                <div className="relative h-32 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <img
                    src={item.logo}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                <div className="p-3 flex flex-col gap-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                    {item.address}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Paginador */}
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {rangeStart}–{rangeEnd} de {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[80px] text-center">
                Pág. {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
