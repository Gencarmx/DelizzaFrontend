import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Upload, X } from "lucide-react";
import Button from "@components/restaurant-ui/buttons/Button";
import Input from "@components/restaurant-ui/forms/Input";
import Select from "@components/restaurant-ui/forms/Select";
import Textarea from "@components/restaurant-ui/forms/Textarea";
import { useAuth } from "@core/context/AuthContext";
import { createProduct, uploadProductImage } from "@core/services/productService";
import { getBusinessByOwner } from "@core/services/businessService";
import { getActiveProductCategories } from "@core/services/productCategoryService";
import type { SelectOption } from "@components/restaurant-ui/forms/Select";

export default function ProductAdd() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [categories, setCategories] = useState<SelectOption[]>([
    { value: "", label: "Selecciona una categoría" }
  ]);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    description: "",
    status: "active",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar categorías dinámicas y obtener businessId
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;

      try {
        // Obtener el business del usuario
        const business = await getBusinessByOwner(user.id);
        if (!business) {
          setErrors({ general: "No se encontró un restaurante asociado a tu cuenta" });
          return;
        }
        setBusinessId(business.id);

        // Cargar categorías dinámicas
        const categoriesData = await getActiveProductCategories();
        const categoryOptions: SelectOption[] = [
          { value: "", label: "Selecciona una categoría" },
          ...categoriesData.map(cat => ({
            value: cat.id,
            label: cat.name
          }))
        ];
        setCategories(categoryOptions);

      } catch (err) {
        console.error("Error cargando datos:", err);
        setErrors({ general: "Error al cargar los datos necesarios" });
      }
    };

    loadData();
  }, [user?.id]);

  const statusOptions: SelectOption[] = [
    { value: "active", label: "Activo" },
    { value: "inactive", label: "Inactivo" },
  ];

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setSelectedImageFile(null);
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

    if (!validate() || !businessId) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      let imageUrl: string | undefined;

      // Subir imagen si se seleccionó una
      if (selectedImageFile) {
        imageUrl = await uploadProductImage(selectedImageFile, businessId);
      }

      // Crear el producto
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        business_id: businessId,
        category_id: formData.category, // Map selected category to category_id
        image_url: imageUrl,
        active: formData.status === "active",
        stock: parseInt(formData.stock) || 0,
      };

      await createProduct(productData);

      // Redirigir a la lista de productos
      navigate("/restaurant/products");

    } catch (err) {
      console.error("Error creando producto:", err);
      setErrors({
        general: err instanceof Error ? err.message : "Error desconocido al crear el producto"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
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
            Agregar producto
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Completa la información del nuevo producto
          </p>
        </div>
      </div>

      {/* Error Message */}
      {errors.general && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 text-red-600 dark:text-red-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-800 dark:text-red-200 text-sm font-medium">
              {errors.general}
            </p>
          </div>
        </div>
      )}

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
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pb-24 sm:pb-12">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/restaurant/products")}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full sm:w-auto"
          >
            Guardar producto
          </Button>
        </div>
      </form>
    </div>
  );
}
