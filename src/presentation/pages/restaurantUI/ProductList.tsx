import { useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Search, Edit, Trash2, Copy } from "lucide-react";
import DataTable from "@components/restaurant-ui/tables/DataTable";
import StatusBadge from "@components/restaurant-ui/badges/StatusBadge";
import ActionDropdown from "@components/restaurant-ui/dropdowns/ActionDropdown";
import Button from "@components/restaurant-ui/buttons/Button";
import Input from "@components/restaurant-ui/forms/Input";
import ConfirmModal from "@components/restaurant-ui/modals/ConfirmModal";
import type { Column } from "@components/restaurant-ui/tables/DataTable";
import type { ActionItem } from "@components/restaurant-ui/dropdowns/ActionDropdown";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: "active" | "inactive";
  image: string;
}

export default function ProductList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    productId: string | null;
    productName: string;
  }>({
    isOpen: false,
    productId: null,
    productName: "",
  });

  // Mock data
  const [products, setProducts] = useState<Product[]>([
    {
      id: "PROD-001",
      name: "Hamburguesa Clásica",
      category: "Hamburguesas",
      price: 120,
      stock: 45,
      status: "active",
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
    },
    {
      id: "PROD-002",
      name: "Pizza Margarita",
      category: "Pizzas",
      price: 180,
      stock: 30,
      status: "active",
      image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38",
    },
    {
      id: "PROD-003",
      name: "Tacos al Pastor",
      category: "Tacos",
      price: 85,
      stock: 0,
      status: "inactive",
      image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47",
    },
    {
      id: "PROD-004",
      name: "Sushi Roll California",
      category: "Sushi",
      price: 150,
      stock: 25,
      status: "active",
      image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c",
    },
    {
      id: "PROD-005",
      name: "Hot Dog Clásico",
      category: "Hot Dogs",
      price: 65,
      stock: 50,
      status: "active",
      image: "https://images.unsplash.com/photo-1612392062798-2dbaa2c5e72",
    },
  ]);

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

  const confirmDelete = () => {
    if (deleteModal.productId) {
      setProducts((prev) =>
        prev.filter((p) => p.id !== deleteModal.productId)
      );
      setDeleteModal({ isOpen: false, productId: null, productName: "" });
    }
  };

  const handleDuplicate = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      const newProduct = {
        ...product,
        id: `PROD-${String(products.length + 1).padStart(3, "0")}`,
        name: `${product.name} (Copia)`,
      };
      setProducts((prev) => [...prev, newProduct]);
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
          src={product.image}
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
        <span className="font-mono text-sm text-gray-600">{product.id}</span>
      ),
    },
    {
      key: "name",
      header: "Nombre",
      render: (product) => (
        <span className="font-semibold text-gray-900">{product.name}</span>
      ),
    },
    {
      key: "category",
      header: "Categoría",
      width: "150px",
      render: (product) => (
        <span className="text-gray-600 text-sm">{product.category}</span>
      ),
    },
    {
      key: "price",
      header: "Precio",
      width: "100px",
      render: (product) => (
        <span className="font-bold text-gray-900">${product.price}</span>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      width: "80px",
      render: (product) => (
        <span
          className={`font-semibold ${
            product.stock === 0
              ? "text-red-600"
              : product.stock < 20
              ? "text-amber-600"
              : "text-green-600"
          }`}
        >
          {product.stock}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      width: "120px",
      render: (product) => <StatusBadge status={product.status} />,
    },
    {
      key: "actions",
      header: "Acciones",
      width: "80px",
      render: (product) => <ActionDropdown actions={getActions(product)} />,
    },
  ];

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Productos</h1>
          <p className="text-gray-600">
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

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Buscar productos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-5 h-5" />}
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredProducts}
        keyExtractor={(product) => product.id}
        emptyMessage="No se encontraron productos"
      />

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
