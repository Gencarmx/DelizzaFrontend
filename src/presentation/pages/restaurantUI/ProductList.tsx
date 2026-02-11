import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Plus, Search, Edit, Trash2, Copy, Loader2 } from "lucide-react";
import DataTable from "@components/restaurant-ui/tables/DataTable";
import StatusBadge from "@components/restaurant-ui/badges/StatusBadge";
import ActionDropdown from "@components/restaurant-ui/dropdowns/ActionDropdown";
import Button from "@components/restaurant-ui/buttons/Button";
import Input from "@components/restaurant-ui/forms/Input";
import ConfirmModal from "@components/restaurant-ui/modals/ConfirmModal";
import { useAuth } from "@core/context/AuthContext";
import { getProductsByBusiness, createProduct } from "@core/services/productService";
import { getBusinessByOwner } from "@core/services/businessService";
import { deleteProduct } from "@core/services/productService";
import type { Column } from "@components/restaurant-ui/tables/DataTable";
import type { ActionItem } from "@components/restaurant-ui/dropdowns/ActionDropdown";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  business_id: string;
}

export default function ProductList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    productId: string | null;
    productName: string;
  }>({
    isOpen: false,
    productId: null,
    productName: "",
  });

  // Cargar productos desde la base de datos
  useEffect(() => {
    const loadProducts = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Obtener el business del usuario
        const business = await getBusinessByOwner(user.id);
        if (!business) {
          setError("No se encontró un restaurante asociado a tu cuenta");
          setLoading(false);
          return;
        }

        setBusinessId(business.id);

        // Obtener productos del restaurante
        const productsData = await getProductsByBusiness(business.id);
        setProducts(productsData);

      } catch (err) {
        console.error("Error cargando productos:", err);
        setError("Error al cargar los productos. Por favor, intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [user?.id]);

  const handleEdit = (productId: string) => {
    navigate(`/restaurant/products/edit/${productId}`);
  };

  const handleDelete = (productId: string, productName: string) => {
    setDeleteModal({
      isOpen: true,
      productId,
      productName,
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.productId) return;

    try {
      await deleteProduct(deleteModal.productId);
      setProducts((prev) => prev.filter((p) => p.id !== deleteModal.productId));
      setDeleteModal({ isOpen: false, productId: null, productName: "" });
    } catch (err) {
      console.error("Error eliminando producto:", err);
      // Aquí podrías mostrar un toast de error
    }
  };

  const handleDuplicate = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product || !businessId) return;

    try {
      // Crear una copia del producto con un nombre diferente
      const duplicatedProduct = {
        name: `${product.name} (Copia)`,
        description: product.description || undefined,
        price: product.price,
        business_id: businessId,
        image_url: product.image_url || undefined,
        active: product.active || true,
      };

      const newProduct = await createProduct(duplicatedProduct);
      setProducts((prev) => [...prev, newProduct]);

    } catch (err) {
      console.error("Error duplicando producto:", err);
      // Aquí podrías mostrar un toast de error
    }
  };

  const getActions = (product: Product): ActionItem[] => [
    {
      label: "Editar",
      icon: <Edit className="w-4 h-4" />,
      onClick: () => handleEdit(product.id),
    },
    {
      label: "Duplicar",
      icon: <Copy className="w-4 h-4" />,
      onClick: () => handleDuplicate(product.id),
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
      render: (product) => (
        <span className="text-gray-600 dark:text-gray-400 text-sm">
          {product.description || "Sin descripción"}
        </span>
      ),
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

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        >
          <Plus className="w-5 h-5" />
          Agregar producto
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
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

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Buscar productos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-5 h-5" />}
        />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Cargando productos...</p>
          </div>
        </div>
      ) : (
        /* Table */
        <DataTable
          columns={columns}
          data={filteredProducts}
          keyExtractor={(product) => product.id}
          emptyMessage="No se encontraron productos"
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({ isOpen: false, productId: null, productName: "" })
        }
        onConfirm={confirmDelete}
        title="Eliminar producto"
        message={`¿Estás seguro de que deseas eliminar "${deleteModal.productName}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}
