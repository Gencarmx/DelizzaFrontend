import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { ChevronLeft, ChevronRight, Search, Loader2, X } from "lucide-react";
import { supabase } from "@core/supabase/client";
import { getActiveProductCategories, type ProductCategory } from "@core/services/productCategoryService";
import ProductModal from "@presentation/components/common/ProductModal";

interface ProductItem {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  restaurant: string;
  restaurantId: string;
  has_addons: boolean;
  restaurantIsPaused: boolean;
}

const PAGE_SIZE = 10;

export default function Products() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialCategory = (location.state as { categoryId?: string } | null)?.categoryId ?? null;

  // ── Estado ────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
    price: number;
    image: string;
    description?: string;
    has_addons?: boolean;
    restaurant?: { id: string; name: string };
    restaurantStatus?: 'open' | 'paused' | 'closed';
  } | null>(null);

  const isFirstRender = useRef(true);

  // ── Debounce búsqueda ────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Reset página al cambiar categoría ────────────────────────────────────
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setCurrentPage(1);
  }, [selectedCategory]);

  // ── Cargar categorías ────────────────────────────────────────────────────
  useEffect(() => {
    getActiveProductCategories()
      .then(setCategories)
      .finally(() => setLoadingCategories(false));
  }, []);

  // ── Cargar productos ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const offset = (currentPage - 1) * PAGE_SIZE;

        let query = supabase
          .from("products")
          .select(
            "id, name, price, description, image_url, business_id, has_addons, businesses:business_id!inner(id, name, active, is_paused)",
            { count: "exact" }
          )
          .eq("active", true)
          .eq("businesses.active", true)
          .order("created_at", { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (selectedCategory) {
          query = query.eq("category_id", selectedCategory);
        }
        if (debouncedSearch.trim()) {
          query = query.ilike("name", `%${debouncedSearch.trim()}%`);
        }

        const { data, count, error } = await query;
        if (error) throw error;

        setProducts(
          (data ?? []).map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            description: p.description ?? "",
            image: p.image_url ?? "https://via.placeholder.com/200",
            restaurant: p.businesses?.name ?? "Restaurante",
            restaurantId: p.business_id,
            has_addons: p.has_addons ?? false,
            restaurantIsPaused: p.businesses?.is_paused ?? false,
          }))
        );
        setTotal(count ?? 0);
      } catch (err) {
        console.error("Error cargando productos:", err);
        setProducts([]);
        setTotal(0);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [currentPage, debouncedSearch, selectedCategory]);

  // ── Paginación ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total);

  const handleCategoryClick = (id: string) => {
    setSelectedCategory(prev => (prev === id ? null : id));
  };

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
          Todos los productos
        </h2>
        {total > 0 && !loadingProducts && (
          <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
            {total} {total === 1 ? "producto" : "productos"}
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
          placeholder="Buscar productos..."
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

      {/* Categorías */}
      {loadingCategories ? (
        <div className="flex justify-center py-2">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
        </div>
      ) : categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 snap-x">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 snap-start border transition-colors ${
                selectedCategory === cat.id
                  ? "bg-amber-400 border-amber-400 text-white"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              }`}
            >
              <span>{cat.icon ?? "🍽️"}</span>
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Resultados */}
      {loadingProducts ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando productos...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
          <span className="text-4xl">🍽️</span>
          <p className="font-semibold text-gray-800 dark:text-white">
            {debouncedSearch
              ? `Sin resultados para "${debouncedSearch}"`
              : selectedCategory
              ? "Sin productos en esta categoría"
              : "No hay productos disponibles"}
          </p>
          {(debouncedSearch || selectedCategory) && (
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
              className="text-sm text-amber-500 hover:underline mt-1"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map(product => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct({
                  ...product,
                  restaurant: { id: product.restaurantId, name: product.restaurant },
                  restaurantStatus: product.restaurantIsPaused ? 'paused' : 'open',
                })}
                className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow group"
              >
                <div className="relative h-32 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="p-3 flex flex-col gap-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight line-clamp-2">
                    {product.name}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    {product.restaurant}
                  </p>
                  <p className="text-sm font-bold text-amber-500 mt-0.5">
                    ${product.price.toFixed(2)}
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
                disabled={currentPage === 1 || loadingProducts}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[80px] text-center">
                {loadingProducts
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 mx-auto" />
                  : `Pág. ${currentPage} de ${totalPages}`
                }
              </span>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage >= totalPages || loadingProducts}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de producto */}
      {selectedProduct && (
        <ProductModal
          isOpen
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
          restaurantStatus={selectedProduct.restaurantStatus}
        />
      )}
    </div>
  );
}
