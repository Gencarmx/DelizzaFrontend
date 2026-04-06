import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Plus, Search, Edit, Trash2, Copy, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import DataTable from "@components/restaurant-ui/tables/DataTable";
import StatusBadge from "@components/restaurant-ui/badges/StatusBadge";
import ActionDropdown from "@components/restaurant-ui/dropdowns/ActionDropdown";
import Button from "@components/restaurant-ui/buttons/Button";
import Input from "@components/restaurant-ui/forms/Input";
import ConfirmModal from "@components/restaurant-ui/modals/ConfirmModal";
import { useRestaurantNotifications } from "@core/context/RestaurantNotificationsContext";
import { getProductsByBusiness, createProduct, deleteProduct } from "@core/services/productService";
import type { Column } from "@components/restaurant-ui/tables/DataTable";
import type { ActionItem } from "@components/restaurant-ui/dropdowns/ActionDropdown";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  active: boolean | null;
  category_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  business_id: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export default function ProductList() {
  const navigate = useNavigate();
  // businessId viene del contexto en lugar de re-consultar getBusinessByOwner()
  const { businessId } = useRestaurantNotifications();

  // — Búsqueda —
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // — Filtro de estado —
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");

  // — Paginación —
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [total, setTotal] = useState(0);

  // — Datos —
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false); // carga silenciosa al cambiar de página
  const [error, setError] = useState<string | null>(null);

  // — Acciones de fila —
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    productId: string | null;
    productName: string;
  }>({ isOpen: false, productId: null, productName: "" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingIds, setDuplicatingIds] = useState<Set<string>>(new Set());

  // refreshKey: permite forzar un re-fetch sin cambiar la página
  const [refreshKey, setRefreshKey] = useState(0);

  // Bandera para distinguir primera carga de cambios de página
  const isFirstLoad = useRef(true);

  // Debounce del buscador: 400 ms. Al cambiar, vuelve a página 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Al cambiar el filtro de estado vuelve a página 1.
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Carga principal — se dispara por cambio de página, tamaño, búsqueda o refresh
  useEffect(() => {
    const loadProducts = async () => {
      if (!businessId) {
        setLoading(false);
        return;
      }

      if (isFirstLoad.current) {
        setLoading(true);
        isFirstLoad.current = false;
      } else {
        setFetching(true);
      }
      setError(null);

      try {
        const offset = (currentPage - 1) * pageSize;
        const { products: data, total: count } = await getProductsByBusiness(businessId, {
          limit: pageSize,
          offset,
          search: debouncedSearch || undefined,
          active: statusFilter === "all" ? undefined : statusFilter === "active",
        });
        setProducts(data);
        setTotal(count);
      } catch (err) {
        console.error("Error cargando productos:", err);
        setError("Error al cargar los productos. Por favor, intenta de nuevo.");
      } finally {
        setLoading(false);
        setFetching(false);
      }
    };

    loadProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, currentPage, pageSize, debouncedSearch, statusFilter, refreshKey]);

  // — Helpers de paginación —
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (currentPage - 1) * pageSize;
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + pageSize, total);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // — Acciones —
  const handleEdit = (productId: string) => {
    navigate(`/restaurant/products/edit/${productId}`);
  };

  const handleDelete = (productId: string, productName: string) => {
    setDeleteModal({ isOpen: true, productId, productName });
  };

  const confirmDelete = async () => {
    if (!deleteModal.productId || deletingId === deleteModal.productId) return;

    const idToDelete = deleteModal.productId;
    setDeletingId(idToDelete);
    try {
      await deleteProduct(idToDelete);
      setDeleteModal({ isOpen: false, productId: null, productName: "" });

      // Si era el último item de una página que no es la primera, retroceder
      if (products.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else {
        setRefreshKey(prev => prev + 1);
      }
    } catch (err) {
      console.error("Error eliminando producto:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product || !businessId || duplicatingIds.has(productId)) return;

    setDuplicatingIds(prev => new Set(prev).add(productId));
    try {
      await createProduct({
        name: `${product.name} (Copia)`,
        description: product.description || undefined,
        price: product.price,
        business_id: businessId,
        category_id: product.category_id,
        image_url: product.image_url || undefined,
        active: product.active ?? true,
      });
      // El producto duplicado aparece primero (order by created_at desc) → ir a página 1
      setCurrentPage(1);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error("Error duplicando producto:", err);
    } finally {
      setDuplicatingIds(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const getActions = (product: Product): ActionItem[] => [
    {
      label: "Editar",
      icon: <Edit className="w-4 h-4" />,
      onClick: () => handleEdit(product.id),
    },
    {
      label: duplicatingIds.has(product.id) ? "Duplicando..." : "Duplicar",
      icon: duplicatingIds.has(product.id)
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <Copy className="w-4 h-4" />,
      onClick: () => handleDuplicate(product.id),
      disabled: duplicatingIds.has(product.id),
    },
    {
      label: "Eliminar",
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => handleDelete(product.id, product.name),
      variant: "danger",
    },
  ];

  const columns: Column<Product>[] = [
    {
      key: "image",
      header: "Imagen",
      width: "80px",
      render: (product) => (
        <img
          src={product.image_url || "https://via.placeholder.com/48"}
          alt={product.name}
          className="w-12 h-12 rounded-lg object-cover"
          loading="lazy"
        />
      ),
    },
    {
      key: "id",
      header: "ID",
      width: "120px",
      render: (product) => (
        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
          {product.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: "name",
      header: "Nombre",
      render: (product) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {product.name}
        </span>
      ),
    },
    {
      key: "description",
      header: "Descripción",
      width: "200px",
      render: (product) => {
        const text = product.description || "Sin descripción";
        const truncated = text.length > 80 ? text.slice(0, 80).trimEnd() + "…" : text;
        return (
          <span
            className="text-gray-600 dark:text-gray-400 text-sm"
            title={product.description ?? undefined}
          >
            {truncated}
          </span>
        );
      },
    },
    {
      key: "price",
      header: "Precio",
      width: "100px",
      render: (product) => (
        <span className="font-bold text-gray-900 dark:text-white">
          ${product.price.toFixed(2)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      width: "120px",
      render: (product) => (
        <StatusBadge status={product.active ? "active" : "inactive"} />
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      width: "80px",
      render: (product) => <ActionDropdown actions={getActions(product)} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Productos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona el catálogo de productos de tu restaurante
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate("/restaurant/products/add")}
          className="w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Agregar producto
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 text-red-600 dark:text-red-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-800 dark:text-red-200 text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Búsqueda + Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
        </div>
        <div className="flex items-center gap-2">
          {(
            [
              { value: "all",      label: "Todos" },
              { value: "active",   label: "Activos" },
              { value: "inactive", label: "Inactivos" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                statusFilter === opt.value
                  ? opt.value === "inactive"
                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
                    : opt.value === "active"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla / Spinner inicial */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Cargando productos...</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-24 sm:pb-8">
          {/* Tabla con overlay sutil durante cambio de página */}
          <div className={`transition-opacity duration-150 ${fetching ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
            <DataTable
              columns={columns}
              data={products}
              keyExtractor={(product) => product.id}
              emptyMessage={
                debouncedSearch
                  ? `No se encontraron productos para "${debouncedSearch}"`
                  : statusFilter === "active"
                  ? "No hay productos activos"
                  : statusFilter === "inactive"
                  ? "No hay productos inactivos"
                  : "No se encontraron productos"
              }
            />
          </div>

          {/* Paginador — solo se muestra si hay datos */}
          {total > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Info + selector de tamaño */}
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {rangeStart}–{rangeEnd}
                  </span>{" "}
                  de{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {total}
                  </span>{" "}
                  {total === 1 ? "producto" : "productos"}
                  {debouncedSearch && (
                    <span className="text-gray-500 dark:text-gray-400">
                      {" "}para &ldquo;{debouncedSearch}&rdquo;
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Por página:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Controles de navegación */}
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 1 || fetching}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[90px] text-center select-none">
                  {fetching ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500 mx-auto" />
                  ) : (
                    `Página ${currentPage} de ${totalPages}`
                  )}
                </span>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage >= totalPages || fetching}
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => {
          if (deletingId) return;
          setDeleteModal({ isOpen: false, productId: null, productName: "" });
        }}
        onConfirm={confirmDelete}
        title="Desactivar producto"
        message={`¿Estás seguro de que deseas desactivar "${deleteModal.productName}"? El producto no se eliminará de la base de datos por razones de integridad de datos, solo se desactivará y dejará de estar visible para los clientes.`}
        confirmText="Desactivar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={!!deletingId}
      />
    </div>
  );
}
