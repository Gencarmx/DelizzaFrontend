import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Upload, X } from "lucide-react";
import Button from "@components/restaurant-ui/buttons/Button";
import Input from "@components/restaurant-ui/forms/Input";
import Select from "@components/restaurant-ui/forms/Select";
import Textarea from "@components/restaurant-ui/forms/Textarea";
import { useAuth } from "@core/context/AuthContext";
import {
  createProduct,
  uploadProductImage,
} from "@core/services/productService";
import { getBusinessByOwner } from "@core/services/businessService";
import { getActiveProductCategories } from "@core/services/productCategoryService";
import type { SelectOption } from "@components/restaurant-ui/forms/Select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  category: z.string().min(1, "La categoría es requerida"),
  price: z.number().positive("El precio debe ser mayor a 0"),
  stock: z.number().min(0, "El stock debe ser mayor o igual a 0"),
  description: z.string().min(1, "La descripción es requerida"),
  status: z.enum(["active", "inactive"]),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductAdd() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [categories, setCategories] = useState<SelectOption[]>([
    { value: "", label: "Selecciona una categoría" },
  ]);
  const [generalError, setGeneralError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
      status: "active",
      // default numbers undefined so input shows empty initially
    },
  });

  // Cargar categorías dinámicas y obtener businessId
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;

      try {
        // Obtener el business del usuario
        const business = await getBusinessByOwner(user.id);
        if (!business) {
          setGeneralError("No se encontró un restaurante asociado a tu cuenta");
          return;
        }
        setBusinessId(business.id);

        // Cargar categorías dinámicas
        const categoriesData = await getActiveProductCategories();
        const categoryOptions: SelectOption[] = [
          { value: "", label: "Selecciona una categoría" },
          ...categoriesData.map((cat) => ({
            value: cat.id,
            label: cat.name,
          })),
        ];
        setCategories(categoryOptions);
      } catch (err) {
        console.error("Error cargando datos:", err);
        setGeneralError("Error al cargar los datos necesarios");
      }
    };

    loadData();
  }, [user?.id]);

  const statusOptions: SelectOption[] = [
    { value: "active", label: "Activo" },
    { value: "inactive", label: "Inactivo" },
  ];

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
    // Reset the file input if using a ref, but here it's fine since it re-renders.
  };

  const onSubmit = async (data: ProductFormValues) => {
    if (!businessId) {
      setGeneralError(
        "No se puede crear el producto sin un restaurante asociado",
      );
      return;
    }

    setIsLoading(true);
    setGeneralError("");

    try {
      let imageUrl: string | undefined;

      // Subir imagen si se seleccionó una
      if (selectedImageFile) {
        imageUrl = await uploadProductImage(selectedImageFile, businessId);
      }

      // Crear el producto
      const productData = {
        name: data.name.trim(),
        description: data.description.trim(),
        price: data.price,
        business_id: businessId,
        category_id: data.category,
        image_url: imageUrl,
        active: data.status === "active",
        stock: data.stock || 0,
      };

      await createProduct(productData);

      // Redirigir a la lista de productos
      navigate("/restaurant/products");
    } catch (err) {
      console.error("Error creando producto:", err);
      setGeneralError(
        err instanceof Error
          ? err.message
          : "Error desconocido al crear el producto",
      );
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
      {generalError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 text-red-600 dark:text-red-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <p className="text-red-800 dark:text-red-200 text-sm font-medium">
              {generalError}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
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
            {...register("name")}
            error={formErrors.name?.message}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Categoría"
              options={categories}
              {...register("category")}
              error={formErrors.category?.message}
            />

            <Select
              label="Estado"
              options={statusOptions}
              {...register("status")}
              error={formErrors.status?.message}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Precio"
              type="number"
              step="any"
              placeholder="0.00"
              {...register("price", {valueAsNumber: true})}
              error={formErrors.price?.message}
              helperText="Precio en pesos mexicanos"
            />

            <Input
              label="Stock disponible"
              type="number"
              placeholder="0"
              {...register("stock", {valueAsNumber: true})}
              error={formErrors.stock?.message}
              helperText="Cantidad disponible en inventario"
            />
          </div>

          <Textarea
            label="Descripción"
            placeholder="Describe el producto, ingredientes, características especiales..."
            {...register("description")}
            error={formErrors.description?.message}
            rows={4}
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
