import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@core/supabase/client";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@core/context/AuthContext";
import {
  Building2,
  Store,
  Receipt,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Package,
  Clock,
  Truck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";

type StatusFilter = "all" | "active" | "inactive";

function AdminBottomNav({ currentPath }: { currentPath: string }) {
  const navItems = [
    { icon: Building2, label: "Restaurantes", path: "/admin" },
    { icon: Receipt, label: "Comisiones", path: "/admin/billing" },
    { icon: Package, label: "Pedidos", path: "/admin/orders" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-3 flex justify-around items-center z-50 shadow-lg pb-safe">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentPath === item.path
              ? "text-red-600 dark:text-red-400"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
        >
          <item.icon
            className="w-6 h-6"
            strokeWidth={currentPath === item.path ? 2.5 : 2}
          />
          <span className="text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";

interface BusinessOrder {
  id: string;
  created_at: string;
  status: OrderStatus;
  total: number;
  customer_name: string | null;
  customer_phone: string | null;
  business_id: string;
  business_name?: string;
}

interface Business {
  id: string;
  name: string;
  active: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getStatusConfig(status: OrderStatus) {
  const configs: Record<OrderStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
    pending:   { label: "Pendiente",   bg: "bg-gray-100 dark:bg-gray-700",          text: "text-gray-600 dark:text-gray-300",    icon: Clock },
    confirmed: { label: "Confirmado",  bg: "bg-blue-100 dark:bg-blue-900/30",        text: "text-blue-600 dark:text-blue-400",    icon: CheckCircle2 },
    preparing: { label: "Preparando",  bg: "bg-amber-100 dark:bg-amber-900/30",      text: "text-amber-600 dark:text-amber-400",  icon: Package },
    ready:     { label: "Listo",       bg: "bg-purple-100 dark:bg-purple-900/30",    text: "text-purple-600 dark:text-purple-400",icon: Truck },
    completed: { label: "Completado",  bg: "bg-emerald-100 dark:bg-emerald-900/30",  text: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
    cancelled: { label: "Cancelado",   bg: "bg-red-100 dark:bg-red-900/30",          text: "text-red-600 dark:text-red-400",      icon: XCircle },
  };
  return configs[status];
}

interface FilterState {
  status: OrderStatus | "all";
  date_from: string;
  date_to: string;
}

// ── Pagination controls component ──────────────────────────────────────────────
function PaginationBar({
  current,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemCount,
  totalCount,
}: {
  current: number;
  total: number;
  pageSize: 5 | 10;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: 5 | 10) => void;
  itemCount: number;
  totalCount: number;
}) {
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, totalCount);

  return (
    <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex items-center justify-between gap-4 flex-wrap">
      {/* Conteo */}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Mostrando{" "}
        <span className="font-semibold text-gray-600 dark:text-gray-300">
          {from}–{to}
        </span>{" "}
        de{" "}
        <span className="font-semibold text-gray-600 dark:text-gray-300">
          {totalCount}
        </span>
      </p>

      <div className="flex items-center gap-3">
        {/* Selector de tamaño */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="whitespace-nowrap">Por página:</span>
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
            {([5, 10] as (5 | 10)[]).map((s) => (
              <button
                key={s}
                onClick={() => onPageSizeChange(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  pageSize === s
                    ? "bg-purple-500 text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Páginas */}
        {total > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, current - 1))}
              disabled={current === 1}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: total }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                  page === current
                    ? "bg-purple-500 text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => onPageChange(Math.min(total, current + 1))}
              disabled={current === total}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page component ──────────────────────────────────────────────────────────────
export default function AdminOrdersDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedBusinessId = searchParams.get("business");
  const { signOut } = useAuth();

  // ── Businesses state ────────────────────────────────────────────────────────
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [bizStatusFilter, setBizStatusFilter] = useState<StatusFilter>("all");
  const [bizPageSize, setBizPageSize] = useState<5 | 10>(5);
  const [bizCurrentPage, setBizCurrentPage] = useState(1);

  // ── Orders state ────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<BusinessOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderPageSize, setOrderPageSize] = useState<5 | 10>(5);
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);

  // ── Shared state ────────────────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterState>({
    status: (searchParams.get("status") as OrderStatus) || "all",
    date_from: searchParams.get("date_from") || "",
    date_to: searchParams.get("date_to") || "",
  });

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, []);

  // ── Fetch businesses (status filter aplicado en BD) ─────────────────────────
  const fetchBusinesses = useCallback(async () => {
    setLoadingBusinesses(true);
    setError(null);
    try {
      let query = supabase
        .from("businesses")
        .select("id, name, active")
        .order("name", { ascending: true });

      if (bizStatusFilter === "active")   query = query.eq("active", true);
      if (bizStatusFilter === "inactive") query = query.eq("active", false);

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setBusinesses(data ?? []);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Error al cargar restaurantes.");
    } finally {
      setLoadingBusinesses(false);
    }
  }, [bizStatusFilter]);

  const fetchOrders = useCallback(async () => {
    if (!selectedBusinessId) return;
    setLoadingOrders(true);
    setError(null);
    try {
      let query = supabase
        .from("orders")
        .select(`
          id,
          created_at,
          status,
          total,
          customer_id,
          profiles:customer_id (full_name, phone_number)
        `)
        .eq("business_id", selectedBusinessId)
        .order("created_at", { ascending: false });

      if (filter.status !== "all") query = query.eq("status", filter.status);
      if (filter.date_from)        query = query.gte("created_at", filter.date_from);
      if (filter.date_to)          query = query.lte("created_at", filter.date_to + "T23:59:59");

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const mapped: BusinessOrder[] = (data ?? []).map((o: Record<string, unknown>) => ({
        id: o.id as string,
        created_at: o.created_at as string,
        status: o.status as OrderStatus,
        total: o.total as number,
        customer_name: (o.profiles as Record<string, unknown>)?.full_name as string | null,
        customer_phone: (o.profiles as Record<string, unknown>)?.phone_number as string | null,
        business_id: selectedBusinessId,
      }));

      setOrders(mapped);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Error al cargar pedidos.");
    } finally {
      setLoadingOrders(false);
    }
  }, [selectedBusinessId, filter]);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);
  useEffect(() => { if (selectedBusinessId) fetchOrders(); }, [selectedBusinessId, fetchOrders]);

  // ── Reset pages al cambiar filtros ──────────────────────────────────────────
  useEffect(() => { setBizCurrentPage(1); }, [search, bizStatusFilter, bizPageSize]);
  useEffect(() => { setOrderCurrentPage(1); }, [filter, orderPageSize]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleBusinessClick = (businessId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("business", businessId);
    setSearchParams(params);
  };

  const handleClearBusiness = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("business");
    params.delete("status");
    params.delete("date_from");
    params.delete("date_to");
    setSearchParams(params);
    setFilter({ status: "all", date_from: "", date_to: "" });
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilter = { ...filter, [key]: value };
    setFilter(newFilter);
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value); else params.delete(key);
    setSearchParams(params);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // ── Derived data — businesses ────────────────────────────────────────────────
  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId);

  const filteredBusinesses = businesses.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );
  const bizTotalPages  = Math.max(1, Math.ceil(filteredBusinesses.length / bizPageSize));
  const bizSafePage    = Math.min(bizCurrentPage, bizTotalPages);
  const paginatedBusinesses = filteredBusinesses.slice(
    (bizSafePage - 1) * bizPageSize,
    bizSafePage * bizPageSize
  );

  // ── Derived data — orders ────────────────────────────────────────────────────
  const orderTotalPages  = Math.max(1, Math.ceil(orders.length / orderPageSize));
  const orderSafePage    = Math.min(orderCurrentPage, orderTotalPages);
  const paginatedOrders  = orders.slice(
    (orderSafePage - 1) * orderPageSize,
    orderSafePage * orderPageSize
  );

  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusFilterLabels: Record<StatusFilter, string> = {
    all: "Todos", active: "Activos", inactive: "Inactivos",
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <AdminBottomNav currentPath={location.pathname} />

      <div className="flex flex-col gap-6 pb-24 pt-2">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200 dark:shadow-purple-900/30">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                Pedidos por Restaurante
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Visualiza todos los pedidos de cada restaurante
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => selectedBusinessId ? fetchOrders() : fetchBusinesses()}
              disabled={loadingBusinesses || loadingOrders}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${(loadingBusinesses || loadingOrders) ? "animate-spin" : ""}`} />
              Actualizar
            </button>
            <button
              onClick={handleSignOut}
              title="Cerrar sesión"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mx-4">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">Error</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* ── Vista: lista de restaurantes ────────────────────────────────── */}
        {!selectedBusinessId ? (
          <div className="px-4 flex flex-col gap-4">

            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar restaurante..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow"
              />
            </div>

            {/* Filtro de estado + selector de página */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Tabs de estado */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
                <Filter className="w-3.5 h-3.5 text-gray-400 ml-2 flex-shrink-0" />
                {(["all", "active", "inactive"] as StatusFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setBizStatusFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                      bizStatusFilter === f
                        ? f === "all"
                          ? "bg-purple-500 text-white shadow-sm"
                          : f === "active"
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-red-500 text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {f === "active" && <ShieldCheck className="w-3 h-3" />}
                    {f === "inactive" && <ShieldOff className="w-3 h-3" />}
                    {statusFilterLabels[f]}
                  </button>
                ))}
              </div>

              {/* Selector de página */}
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="whitespace-nowrap">Por página:</span>
                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
                  {([5, 10] as (5 | 10)[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setBizPageSize(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        bizPageSize === s
                          ? "bg-purple-500 text-white shadow-sm"
                          : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Skeleton */}
            {loadingBusinesses && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm divide-y divide-gray-50 dark:divide-gray-700/50">
                {Array.from({ length: bizPageSize }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse w-1/2" />
                      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loadingBusinesses && filteredBusinesses.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 flex flex-col items-center gap-3 text-center">
                <Store className="w-10 h-10 text-gray-400" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {search
                    ? "No se encontraron restaurantes"
                    : bizStatusFilter !== "all"
                    ? `No hay restaurantes ${bizStatusFilter === "active" ? "activos" : "inactivos"}`
                    : "No hay restaurantes registrados"}
                </p>
              </div>
            )}

            {/* Lista paginada */}
            {!loadingBusinesses && filteredBusinesses.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {paginatedBusinesses.map((business) => (
                    <button
                      key={business.id}
                      onClick={() => handleBusinessClick(business.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        business.active
                          ? "bg-purple-100 dark:bg-purple-900/30"
                          : "bg-gray-100 dark:bg-gray-700"
                      }`}>
                        <Store className={`w-5 h-5 ${
                          business.active
                            ? "text-purple-600 dark:text-purple-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {business.name}
                        </p>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium mt-0.5 ${
                          business.active
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-500 dark:text-red-400"
                        }`}>
                          {business.active
                            ? <><ShieldCheck className="w-3 h-3" /> Activo</>
                            : <><ShieldOff className="w-3 h-3" /> Inactivo</>
                          }
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>

                {/* Footer paginación */}
                <PaginationBar
                  current={bizSafePage}
                  total={bizTotalPages}
                  pageSize={bizPageSize}
                  onPageChange={setBizCurrentPage}
                  onPageSizeChange={setBizPageSize}
                  itemCount={paginatedBusinesses.length}
                  totalCount={filteredBusinesses.length}
                />
              </div>
            )}
          </div>

        ) : (
          /* ── Vista: pedidos de un restaurante ──────────────────────────── */
          <div className="px-4 flex flex-col gap-4">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearBusiness}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Volver
              </button>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {selectedBusiness?.name}
              </span>
              {selectedBusiness && (
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                  selectedBusiness.active
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                }`}>
                  {selectedBusiness.active
                    ? <><ShieldCheck className="w-3 h-3" /> Activo</>
                    : <><ShieldOff className="w-3 h-3" /> Inactivo</>
                  }
                </span>
              )}
            </div>

            {/* Filtros de pedidos */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filter.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="all">Todos los estados</option>
                  <option value="pending">Pendiente</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="preparing">Preparando</option>
                  <option value="ready">Listo</option>
                  <option value="completed">Completado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              <input
                type="date"
                value={filter.date_from}
                onChange={(e) => handleFilterChange("date_from", e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <span className="text-gray-400">a</span>
              <input
                type="date"
                value={filter.date_to}
                onChange={(e) => handleFilterChange("date_to", e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
              />

              {(filter.status !== "all" || filter.date_from || filter.date_to) && (
                <button
                  onClick={() => {
                    setFilter({ status: "all", date_from: "", date_to: "" });
                    const params = new URLSearchParams(searchParams);
                    params.delete("status");
                    params.delete("date_from");
                    params.delete("date_to");
                    setSearchParams(params);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* Resumen de estados */}
            {Object.keys(statusCounts).length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                  Estados:
                </span>
                {Object.entries(statusCounts).map(([status, count]) => {
                  const config = getStatusConfig(status as OrderStatus);
                  return (
                    <span
                      key={status}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
                    >
                      <config.icon className="w-3 h-3" />
                      {config.label}: {count}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Skeleton */}
            {loadingOrders && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm divide-y divide-gray-50 dark:divide-gray-700/50">
                {Array.from({ length: orderPageSize }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse w-1/3" />
                      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse w-1/2" />
                    </div>
                    <div className="h-6 w-20 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loadingOrders && orders.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 flex flex-col items-center gap-3 text-center">
                <Package className="w-10 h-10 text-gray-400" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  No se encontraron pedidos con los filtros aplicados
                </p>
              </div>
            )}

            {/* Lista paginada de pedidos */}
            {!loadingOrders && orders.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {paginatedOrders.map((order) => {
                    const statusConfig = getStatusConfig(order.status);
                    return (
                      <div
                        key={order.id}
                        className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${statusConfig.bg}`}>
                          <statusConfig.icon className={`w-5 h-5 ${statusConfig.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              Pedido #{order.id.slice(0, 8)}
                            </p>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(order.created_at)}
                            </span>
                            {order.customer_name && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                • {order.customer_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {formatCurrency(order.total)}
                          </p>
                          {order.customer_phone && (
                            <a
                              href={`tel:${order.customer_phone}`}
                              className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                            >
                              {order.customer_phone}
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer paginación */}
                <PaginationBar
                  current={orderSafePage}
                  total={orderTotalPages}
                  pageSize={orderPageSize}
                  onPageChange={setOrderCurrentPage}
                  onPageSizeChange={setOrderPageSize}
                  itemCount={paginatedOrders.length}
                  totalCount={orders.length}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
