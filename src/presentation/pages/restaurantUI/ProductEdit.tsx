import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronLeft, Upload, X } from "lucide-react";
import Button from "@components/restaurant-ui/buttons/Button";
import Input from "@components/restaurant-ui/forms/Input";
import Select from "@components/restaurant-ui/forms/Select";
import Textarea from "@components/restaurant-ui/forms/Textarea";
import type { SelectOption } from "@components/restaurant-ui/forms/Select";
import { 
  getProductById, 
  updateProduct, 
  uploadProductImage 
} from "@core/services/productService";
import { useAuth } from "@core/context/AuthContext";

export default function ProductEdit() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [businessId, setBusinessId] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    description: "",
    status: "active",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar datos del producto
  useEffect(() => {
    async function loadProduct() {
      if (!productId) {
        navigate("/restaurant/products");
        return;
      }

      try {
        setIsLoadingProduct(true);
        const product = await getProductById(productId);
        
        if (!product) {
          throw new Error("Producto no encontrado");
        }

        // Cargar datos del producto en el formulario
        setFormData({
          name: product.name || "",
          category: "", // La tabla products no tiene category_id aún
          price: product.price?.toString() || "",
          stock: product.stock?.toString() || "0",
          description: product.description || "",
          status: product.active ? "active" : "inactive",
        });

        setImagePreview(product.image_url || null);
        setBusinessId(product.business_id);
      } catch (error) {
        console.error("Error cargando producto:", error);
        alert("Error al cargar el producto");
        navigate("/restaurant/products");
      } finally {
        setIsLoadingProduct(false);
      }
    }

    loadProduct();
  }, [productId, navigate]);

  const categories: SelectOption[] = [
    { value: "", label: "Selecciona una categoría" },
    { value: "hamburguesas", label: "Hamburguesas" },
    { value: "pizzas", label: "Pizzas" },
    { value: "tacos", label: "Tacos" },
    { value: "sushi", label: "Sushi" },
    { value: "hot-dogs", label: "Hot Dogs" },
    { value: "bebidas", label: "Bebidas" },
    { value: "postres", label: "Postres" },
  ];

  const statusOptions: SelectOption[] = [
    { value: "active", label: "Activo" },
    { value: "inactive", label: "Inactivo" },
  ];

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido";
    }

    if (!formData.category) {
      newErrors.category = "La categoría es requerida";
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = "El precio debe ser mayor a 0";
    }

    if (!formData.stock || parseInt(formData.stock) < 0) {
      newErrors.stock = "El stock debe ser mayor o igual a 0";
    }

    if (!formData.description.trim()) {
      newErrors.description = "La descripción es requerida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !productId) {
      return;
    }

    try {
      setIsLoading(true);

      let imageUrl = imagePreview;

      // Si hay una nueva imagen, subirla primero
      if (imageFile && businessId) {
        console.log("Subiendo nueva imagen...");
        imageUrl = await uploadProductImage(imageFile, businessId, productId);
        console.log("Imagen subida exitosamente:", imageUrl);
      }

      // Preparar datos para actualizar
      const updateData: {
        name: string;
        description: string;
        price: number;
        active: boolean;
        stock: number;
        image_url?: string;
      } = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        active: formData.status === "active",
        stock: parseInt(formData.stock) || 0,
      };

      // Solo actualizar image_url si cambió
      if (imageUrl && imageUrl !== imagePreview) {
        updateData.image_url = imageUrl;
      }

      console.log("Actualizando producto con datos:", updateData);

      // Actualizar producto
      await updateProduct(productId, updateData);

      console.log("Producto actualizado exitosamente");
      alert("Producto actualizado exitosamente");
      navigate("/restaurant/products");
    } catch (error) {
      console.error("Error actualizando producto:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Error al actualizar el producto"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar loading mientras carga el producto
  if (isLoadingProduct) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando producto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/restaurant/products")}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            Editar producto
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Actualiza la información del producto
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Image Upload */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
            Imagen del producto
          </label>
          {imagePreview ? (
            <div className="relative w-full h-64 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-3 right-3 p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-all">
              <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Haz clic para subir una imagen
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                PNG, JPG o WEBP (máx. 5MB)
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
              />
            </label>
          )}
        </div>

        {/* Product Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700 flex flex-col gap-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Información del producto
          </h3>

          <Input
            label="Nombre del producto"
            placeholder="Ej: Hamburguesa Clásica"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            error={errors.name}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Categoría"
              options={categories}
              value={formData.category}
              onChange={(e) => handleChange("category", e.target.value)}
              error={errors.category}
              required
            />

            <Select
              label="Estado"
              options={statusOptions}
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Precio"
              type="number"
              placeholder="0.00"
              value={formData.price}
              onChange={(e) => handleChange("price", e.target.value)}
              error={errors.price}
              helperText="Precio en pesos mexicanos"
              required
            />

            <Input
              label="Stock disponible"
              type="number"
              placeholder="0"
              value={formData.stock}
              onChange={(e) => handleChange("stock", e.target.value)}
              error={errors.stock}
              helperText="Cantidad disponible en inventario"
              required
            />
          </div>

          <Textarea
            label="Descripción"
            placeholder="Describe el producto, ingredientes, características especiales..."
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            error={errors.description}
            rows={4}
            required
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/restaurant/products")}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  );
}
