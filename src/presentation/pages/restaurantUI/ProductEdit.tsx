import { useState, useEffect, useRef } from "react";
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
  uploadProductImage,
} from "@core/services/productService";
import { getActiveProductCategories } from "@core/services/productCategoryService";
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

export default function ProductEdit() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [isLoading, setIsLoading] = useState(false);

  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  // Valor original de image_url al cargar el producto.
  // Permite detectar si el usuario eliminó la imagen (imagePreview → null)
  // aunque imageFile sea null (sin nueva imagen seleccionada).
  const originalImageUrlRef = useRef<string | null>(null);
  const [businessId, setBusinessId] = useState<string>("");
  const [categories, setCategories] = useState<SelectOption[]>([
    { value: "", label: "Selecciona una categoría" },
  ]);
  const [generalError, setGeneralError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
      status: "active",
    },
  });

  // Cargar categorías dinámicas
  useEffect(() => {
    const loadCategories = async () => {
      try {
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
        console.error("Error cargando categorías:", err);
      }
    };

    loadCategories();
  }, []);

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
        reset({
          name: product.name || "",
          category: product.category_id || "",
          price: product.price || ("" as unknown as number),
          stock: product.stock ?? 0,
          description: product.description || "",
          status: product.active ? "active" : "inactive",
        });

        setImagePreview(product.image_url || null);
        originalImageUrlRef.current = product.image_url || null;
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
  }, [productId, navigate, reset]);

  const statusOptions: SelectOption[] = [
    { value: "active", label: "Activo" },
    { value: "inactive", label: "Inactivo" },
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      let mounted = true;
      const reader = new FileReader();
      reader.onloadend = () => {
        if (mounted) setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      return () => { mounted = false; };
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  const onSubmit = async (data: ProductFormValues) => {
    if (!productId) {
      return;
    }

    try {
      setIsLoading(true);
      setGeneralError("");

      let imageUrl: string | null = imagePreview;

      // Si hay una nueva imagen, subirla primero
      if (imageFile && businessId) {
        imageUrl = await uploadProductImage(imageFile, businessId, productId);
      }

      // Preparar datos para actualizar
      const updateData: {
        name: string;
        description: string;
        price: number;
        active: boolean;
        stock: number;
        category_id: string | null;
        image_url?: string;
      } = {
        name: data.name.trim(),
        description: data.description.trim(),
        price: data.price,
        active: data.status === "active",
        stock: data.stock || 0,
        category_id: data.category || null,
      };

      // Siempre incluir image_url si el estado de imagen cambió respecto al
      // valor original cargado. Esto cubre:
      // 1. Nueva imagen subida (imageFile != null) → imageUrl = nueva URL
      // 2. Imagen eliminada (removeImage()) → imageUrl = null
      // 3. Sin cambio → imageUrl === originalImageUrlRef.current → no incluir
      if (imageUrl !== originalImageUrlRef.current) {
        // null se convierte a undefined para compatibilidad con el tipo Partial<ProductData>
        // La ausencia del campo en el update preserva el valor actual en DB,
        // pero aquí queremos eliminar la imagen (null → undefined borra el campo)
        updateData.image_url = imageUrl ?? undefined;
      }

      // Actualizar producto
      await updateProduct(productId, updateData);

      alert("Producto actualizado exitosamente");
      navigate("/restaurant/products");
    } catch (error) {
      console.error("Error actualizando producto:", error);
      setGeneralError(
        error instanceof Error
          ? error.message
          : "Error al actualizar el producto",
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
          <p className="text-gray-600 dark:text-gray-400">
            Cargando producto...
          </p>
        </div>
      </div>
    );
  }

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
            Editar producto
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Actualiza la información del producto
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
            Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  );
}
