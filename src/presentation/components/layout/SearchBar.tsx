import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Store, ShoppingBag, Loader2 } from "lucide-react";
import { supabase } from "@core/supabase/client";

export interface ProductResult {
  id: string;
  name: string;
  price: number;
  image: string;
  restaurant: string;
  restaurantId: string;
  description: string;
  type: "product";
}

export interface RestaurantResult {
  id: string;
  name: string;
  address: string;
  logo: string;
  status: string;
  type: "restaurant";
}

type SearchResult = ProductResult | RestaurantResult;

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function fuzzyScore(query: string, target: string): number {
  const q = normalize(query);
  const t = normalize(target);
  if (t.includes(q)) return 2;
  const words = q.split(/\s+/);
  const matchedWords = words.filter((w) => t.includes(w));
  if (matchedWords.length > 0) return matchedWords.length / words.length;
  let qi = 0;
  let score = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score++;
      qi++;
    }
  }
  return qi === q.length ? score / t.length : 0;
}

interface SearchBarProps {
  onProductSelect?: (product: ProductResult) => void;
  onRestaurantSelect?: (restaurant: RestaurantResult) => void;
  /** Pre-loaded products from the parent — skips the internal Supabase fetch when provided. */
  initialProducts?: ProductResult[];
  /** Pre-loaded restaurants from the parent — skips the internal Supabase fetch when provided. */
  initialRestaurants?: RestaurantResult[];
}

export function SearchBar({ onProductSelect, onRestaurantSelect, initialProducts, initialRestaurants }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<ProductResult[]>(initialProducts ?? []);
  const [allRestaurants, setAllRestaurants] = useState<RestaurantResult[]>(initialRestaurants ?? []);
  const [dataLoaded, setDataLoaded] = useState(initialProducts !== undefined && initialRestaurants !== undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync if parent updates props after initial render (e.g. async load finishes)
  useEffect(() => {
    if (initialProducts !== undefined) setAllProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    if (initialRestaurants !== undefined) setAllRestaurants(initialRestaurants);
  }, [initialRestaurants]);

  useEffect(() => {
    if (initialProducts !== undefined && initialRestaurants !== undefined) {
      setDataLoaded(true);
      return;
    }
    // Fall back to internal fetch only when props are not provided
    const loadData = async () => {
      setLoading(true);
      try {
        const [{ data: productsData }, { data: businessesData }] = await Promise.all([
          supabase
            .from("products")
            .select("id, name, price, description, image_url, active, business_id")
            .eq("active", true),
          supabase
            .from("businesses")
            .select("id, name, address, active, logo_url")
            .eq("active", true),
        ]);

        const businessMap = new Map(businessesData?.map((b) => [b.id, b]) || []);

        const products: ProductResult[] = (productsData || []).filter((p) => businessMap.has(p.business_id)).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          image: p.image_url || "https://via.placeholder.com/200",
          restaurant: (businessMap.get(p.business_id) as any)?.name || "Unknown",
          restaurantId: p.business_id,
          description: p.description || "",
          type: "product",
        }));

        const restaurants: RestaurantResult[] = (businessesData || []).map((b) => ({
          id: b.id,
          name: b.name,
          address: b.address || "Dirección no disponible",
          logo: b.logo_url || "https://via.placeholder.com/200",
          status: b.active ? "Abierto" : "Cerrado",
          type: "restaurant",
        }));

        setAllProducts(products);
        setAllRestaurants(restaurants);
        setDataLoaded(true);
      } catch (e) {
        console.error("SearchBar: error loading data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = useCallback(
    (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setOpen(false);
        return;
      }

      const productScores = allProducts
        .map((p) => ({
          item: p,
          score: Math.max(fuzzyScore(q, p.name), fuzzyScore(q, p.restaurant) * 0.7),
        }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((x) => x.item);

      const restaurantScores = allRestaurants
        .map((r) => ({
          item: r,
          score: Math.max(fuzzyScore(q, r.name), fuzzyScore(q, r.address) * 0.5),
        }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((x) => x.item);

      setResults([...restaurantScores, ...productScores]);
      setOpen(true);
    },
    [allProducts, allRestaurants]
  );

  useEffect(() => {
    if (!dataLoaded) return;
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search, dataLoaded]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    if (result.type === "product" && onProductSelect) {
      onProductSelect(result as ProductResult);
    } else if (result.type === "restaurant" && onRestaurantSelect) {
      onRestaurantSelect(result as RestaurantResult);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 dark:focus-within:ring-amber-900/30 transition-all">
        {loading && !dataLoaded ? (
          <Loader2 className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0" />
        ) : (
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && results.length > 0 && setOpen(true)}
          placeholder="Buscar restaurantes o productos..."
          className="flex-1 bg-transparent text-sm text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
        />
        {query && (
          <button
            onClick={handleClear}
            className="p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl z-50 overflow-hidden max-h-[420px] overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No se encontraron resultados para{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">"{query}"</span>
              </p>
            </div>
          ) : (
            <>
              {results.some((r) => r.type === "restaurant") && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    Restaurantes
                  </p>
                  {results
                    .filter((r) => r.type === "restaurant")
                    .map((r) => {
                      const rest = r as RestaurantResult;
                      return (
                        <button
                          key={rest.id}
                          onClick={() => handleSelect(rest)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 dark:hover:bg-gray-700/60 transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                            <img src={rest.logo} alt={rest.name} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                              {rest.name}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{rest.address}</p>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                              rest.status === "Abierto"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                            }`}
                          >
                            {rest.status}
                          </span>
                          <Store className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                        </button>
                      );
                    })}
                </div>
              )}

              {results.some((r) => r.type === "product") && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    Productos
                  </p>
                  {results
                    .filter((r) => r.type === "product")
                    .map((r) => {
                      const prod = r as ProductResult;
                      return (
                        <button
                          key={prod.id}
                          onClick={() => handleSelect(prod)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 dark:hover:bg-gray-700/60 transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                            <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                              {prod.name}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{prod.restaurant}</p>
                          </div>
                          <span className="text-sm font-bold text-amber-600 dark:text-amber-400 flex-shrink-0">
                            ${prod.price}
                          </span>
                          <ShoppingBag className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                        </button>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
