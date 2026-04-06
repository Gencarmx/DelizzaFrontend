import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@core/supabase/client";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@core/context/AuthContext";
import {
  Store,
  Phone,
  User,
  ShieldCheck,
  ShieldOff,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Building2,
  Receipt,
  Package,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

type StatusFilter = "all" | "active" | "inactive";

function AdminBottomNav() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

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
            isActive(item.path)
              ? "text-red-600 dark:text-red-400"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
        >
          <item.icon
            className="w-6 h-6"
            strokeWidth={isActive(item.path) ? 2.5 : 2}
          />
          <span className="text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

interface BusinessRow {
  id: string;
  name: string;
  active: boolean;
  phone: string | null;
  owner: {
    full_name: string | null;
    phone_number: string | null;
  } | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pageSize, setPageSize] = useState<5 | 10>(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState<{
    id: string;
    name: string;
    currentState: boolean;
  } | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("businesses")
        .select(`
          id,
          name,
          active,
          phone,
          owner:profiles!businesses_owner_id_fkey (
            full_name,
            phone_number
          )
        `)
        .order("name", { ascending: true });

      if (statusFilter === "active") query = query.eq("active", true);
      else if (statusFilter === "inactive") query = query.eq("active", false);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mapped: BusinessRow[] = (data ?? []).map((b: any) => ({
        id: b.id,
        name: b.name,
        active: b.active ?? false,
        phone: b.phone,
        owner: Array.isArray(b.owner) ? b.owner[0] ?? null : b.owner ?? null,
      }));

      setBusinesses(mapped);
    } catch (err: any) {
      setError(err?.message ?? "Error al cargar los restaurantes.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Resetear a la primera página cuando cambia búsqueda, filtro o tamaño de página
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, pageSize]);

  const handleToggleRequest = (b: BusinessRow) => {
    setConfirmModal({ id: b.id, name: b.name, currentState: b.active });
  };

  const confirmToggle = async () => {
    if (!confirmModal) return;
    const { id, currentState, name } = confirmModal;
    setConfirmModal(null);
    setTogglingId(id);
    try {
      const { error: updateError } = await supabase
        .from("businesses")
        .update({ active: !currentState })
        .eq("id", id);

      if (updateError) throw updateError;

      setBusinesses((prev) =>
        prev.map((b) => (b.id === id ? { ...b, active: !currentState } : b))
      );

      showToast(
        !currentState
          ? `"${name}" ha sido activado.`
          : `"${name}" ha sido desactivado.`,
        "success"
      );
    } catch (err: any) {
      showToast(err?.message ?? "Error al actualizar el estado.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  // Filtrado por búsqueda (el filtro de estado ya se aplica en BD)
  const filtered = businesses.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.owner?.full_name ?? "").toLowerCase().includes(q) ||
      (b.phone ?? "").includes(q) ||
      (b.owner?.phone_number ?? "").includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const activeCount = businesses.filter((b) => b.active).length;
  const inactiveCount = businesses.length - activeCount;

  const statusFilterLabels: Record<StatusFilter, string> = {
    all: "Todos",
    active: "Activos",
    inactive: "Inactivos",
  };

  return (
    <>
      <AdminBottomNav />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium transition-all duration-300 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
          style={{ animation: "slideInRight 0.3s ease-out" }}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 flex-shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmModal(null)}
          />
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700"
            style={{ animation: "scaleIn 0.2s ease-out" }}
          >
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
                confirmModal.currentState
                  ? "bg-red-100 dark:bg-red-900/30"
                  : "bg-emerald-100 dark:bg-emerald-900/30"
              }`}
            >
              {confirmModal.currentState ? (
                <ShieldOff className="w-7 h-7 text-red-600 dark:text-red-400" />
              ) : (
                <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-2">
              {confirmModal.currentState
                ? "¿Desactivar restaurante?"
                : "¿Activar restaurante?"}
            </h3>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
              {confirmModal.currentState
                ? `"${confirmModal.name}" dejará de estar disponible en la plataforma.`
                : `"${confirmModal.name}" volverá a estar disponible en la plataforma.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmToggle}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                  confirmModal.currentState
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {confirmModal.currentState ? "Desactivar" : "Activar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 pb-24 pt-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200 dark:shadow-amber-900/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                Panel de Administración
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Gestión de restaurantes en la plataforma
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchBusinesses}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? "—" : businesses.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
              <Store className="w-3.5 h-3.5" />
              {statusFilter === "all" ? "Total registrados" : statusFilterLabels[statusFilter]}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {loading ? "—" : activeCount}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Activos
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="text-2xl font-bold text-red-500 dark:text-red-400">
              {loading ? "—" : inactiveCount}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
              <ShieldOff className="w-3.5 h-3.5 text-red-400" />
              Inactivos
            </div>
          </div>
        </div>

        {/* Search + Filtros */}
        <div className="flex flex-col gap-3">
          {/* Barra de búsqueda */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por restaurante, propietario o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 transition-shadow"
            />
          </div>

          {/* Fila de filtros */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Filtro de estado */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
              <Filter className="w-3.5 h-3.5 text-gray-400 ml-2 flex-shrink-0" />
              {(["all", "active", "inactive"] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === f
                      ? f === "all"
                        ? "bg-amber-500 text-white shadow-sm"
                        : f === "active"
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-red-500 text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {statusFilterLabels[f]}
                </button>
              ))}
            </div>

            {/* Selector de tamaño de página */}
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="whitespace-nowrap">Por página:</span>
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
                {([5, 10] as (5 | 10)[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setPageSize(size)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      pageSize === size
                        ? "bg-amber-500 text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                Error al cargar datos
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Restaurante
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Propietario
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: pageSize }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" style={{ width: j === 4 ? "80px" : "100%" }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5" />
                        Restaurante
                      </span>
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        Propietario
                      </span>
                    </th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        Teléfono de contacto
                      </span>
                    </th>
                    <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
                          <Store className="w-10 h-10 opacity-30" />
                          <p className="text-sm font-medium">
                            {search
                              ? "No se encontraron resultados para tu búsqueda."
                              : statusFilter !== "all"
                              ? `No hay restaurantes ${statusFilter === "active" ? "activos" : "inactivos"}.`
                              : "No hay restaurantes registrados."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((business) => (
                      <tr
                        key={business.id}
                        className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        {/* Nombre del restaurante */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                business.active
                                  ? "bg-amber-100 dark:bg-amber-900/30"
                                  : "bg-gray-100 dark:bg-gray-700"
                              }`}
                            >
                              <Store
                                className={`w-4.5 h-4.5 ${
                                  business.active
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-gray-400 dark:text-gray-500"
                                }`}
                                style={{ width: "18px", height: "18px" }}
                              />
                            </div>
                            <span className="font-semibold text-sm text-gray-900 dark:text-white">
                              {business.name}
                            </span>
                          </div>
                        </td>

                        {/* Nombre del propietario */}
                        <td className="px-5 py-4">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {business.owner?.full_name ?? (
                              <span className="text-gray-400 dark:text-gray-500 italic text-xs">
                                Sin nombre
                              </span>
                            )}
                          </span>
                        </td>

                        {/* Teléfono */}
                        <td className="px-5 py-4">
                          {(() => {
                            const tel =
                              business.phone ??
                              business.owner?.phone_number ??
                              null;
                            return tel ? (
                              <a
                                href={`tel:${tel}`}
                                className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 hover:underline"
                              >
                                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                {tel}
                              </a>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 italic text-xs">
                                Sin teléfono
                              </span>
                            );
                          })()}
                        </td>

                        {/* Estado (badge) */}
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                              business.active
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                business.active
                                  ? "bg-emerald-500 dark:bg-emerald-400"
                                  : "bg-red-500 dark:bg-red-400"
                              }`}
                            />
                            {business.active ? "Activo" : "Inactivo"}
                          </span>
                        </td>

                        {/* Botón de acción */}
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => handleToggleRequest(business)}
                            disabled={togglingId === business.id}
                            title={
                              business.active
                                ? "Desactivar restaurante"
                                : "Activar restaurante"
                            }
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
                              business.active
                                ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800"
                            }`}
                          >
                            {togglingId === business.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Guardando...
                              </>
                            ) : business.active ? (
                              <>
                                <ShieldOff className="w-3.5 h-3.5" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Activar
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer: conteo + paginación */}
            {filtered.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex items-center justify-between gap-4 flex-wrap">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Mostrando{" "}
                  <span className="font-semibold text-gray-600 dark:text-gray-300">
                    {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)}
                  </span>{" "}
                  de{" "}
                  <span className="font-semibold text-gray-600 dark:text-gray-300">
                    {filtered.length}
                  </span>{" "}
                  restaurantes
                </p>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                          page === safePage
                            ? "bg-amber-500 text-white shadow-sm"
                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
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
        @keyframes scaleIn {
          from { transform: scale(0.92); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
