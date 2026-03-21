import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  Save,
  Loader2,
  Store,
  MapPin,
  Image as ImageIcon,
  Phone,
  Upload,
  X,
  Bike,
  DollarSign,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useRestaurantNotifications } from "@core/context/RestaurantNotificationsContext";
import {
  getBusinessById,
  updateBusiness,
  uploadBusinessLogo,
  deleteBusinessLogo,
  getDeliverySettings,
  updateDeliverySettings,
} from "@core/services/businessService";
import type { DeliverySettings } from "@core/services/businessService";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const businessInfoSchema = z.object({
  name: z.string().min(1, "El nombre del restaurante es obligatorio"),
  address: z.string().optional(),
  phone_number: z.string().optional(),
});

type BusinessInfoFormValues = z.infer<typeof businessInfoSchema>;

export default function BusinessInfo() {
  const navigate = useNavigate();
  const { businessId } = useRestaurantNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [originalLogoUrl, setOriginalLogoUrl] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delivery settings state
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>({
    has_delivery: true,
    has_pickup: true,
    delivery_fee: 15,
    min_order_amount: 0,
  });
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [deliverySaveMessage, setDeliverySaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors: formErrors, isDirty },
  } = useForm<BusinessInfoFormValues>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      name: "",
      address: "",
      phone_number: "",
    },
  });

  const formValues = watch();

  useEffect(() => {
    loadBusinessInfo();
  }, [businessId]);

  const loadBusinessInfo = async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      const [business, delivery] = await Promise.all([
        getBusinessById(businessId),
        getDeliverySettings(businessId),
      ]);

      if (business) {
        reset({
          name: business.name || "",
          address: business.address || "",
          phone_number: business.phone || "",
        });
        setOriginalLogoUrl(business.logo_url || "");
        setImagePreview(business.logo_url || "");
      }

      if (delivery) {
        setDeliverySettings(delivery);
      }
    } catch (error) {
      console.error("Error loading business info:", error);
      alert("Error al cargar la información del negocio");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDeliverySettings = async () => {
    if (!businessId) return;
    if (!deliverySettings.has_delivery && !deliverySettings.has_pickup) {
      setDeliverySaveMessage({ type: 'error', text: 'Debes habilitar al menos una opción de entrega.' });
      return;
    }
    setSavingDelivery(true);
    try {
      await updateDeliverySettings(businessId, deliverySettings);
      setDeliverySaveMessage({ type: 'success', text: 'Configuración guardada correctamente.' });
      setTimeout(() => setDeliverySaveMessage(null), 3000);
    } catch {
      setDeliverySaveMessage({ type: 'error', text: 'Error al guardar la configuración.' });
    } finally {
      setSavingDelivery(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona un archivo de imagen válido");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no debe superar los 5MB");
      return;
    }

    setSelectedFile(file);
    let mounted = true;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (mounted) setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    return () => { mounted = false; };
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancel = () => {
    reset(); // reset to default values (original data load)
    setSelectedFile(null);
    setImagePreview(originalLogoUrl);
    setIsEditing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: BusinessInfoFormValues) => {
    if (!businessId) {
      alert("No se pudo identificar el negocio");
      return;
    }

    setSaving(true);
    try {
      let logoUrl = imagePreview;

      if (selectedFile) {
        setUploadingImage(true);
        try {
          if (originalLogoUrl) {
            await deleteBusinessLogo(originalLogoUrl);
          }

          logoUrl = await uploadBusinessLogo(businessId, selectedFile);
        } catch (error) {
          console.error("Error uploading logo:", error);
          alert("Error al subir la imagen. Por favor, intenta de nuevo.");
          setSaving(false);
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      } else if (imagePreview === "" && originalLogoUrl !== "") {
        logoUrl = "";
        // Optional: delete original logo if user explicitly removed it and didn't select a new one
        // await deleteBusinessLogo(originalLogoUrl);
      }

      const updates: Partial<{
        name: string;
        address: string;
        logo_url: string;
        phone: string;
      }> = {
        name: data.name.trim(),
      };

      if (data.address && data.address.trim()) {
        updates.address = data.address.trim();
      } else {
        updates.address = "";
      }

      updates.logo_url = logoUrl.trim();

      if (data.phone_number && data.phone_number.trim()) {
        updates.phone = data.phone_number.trim();
      } else {
        updates.phone = "";
      }

      await updateBusiness(businessId, updates);

      // Reset form to update isDirty state
      reset({
        name: updates.name,
        address: updates.address,
        phone_number: updates.phone,
      });

      setOriginalLogoUrl(logoUrl);
      setImagePreview(logoUrl);
      setSelectedFile(null);
      setIsEditing(false);
      alert("Información actualizada correctamente");
    } catch (error) {
      console.error("Error saving business info:", error);
      alert("Error al guardar la información del negocio");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    return (
      isDirty ||
      selectedFile !== null ||
      (imagePreview === "" && originalLogoUrl !== "")
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/restaurant/settings")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Información del negocio
            </h1>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto pb-24">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <form className="p-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Store className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-1" />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre del restaurante
                  </label>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        {...register("name")}
                        className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                          formErrors.name
                            ? "border-red-300"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                        placeholder="Nombre del restaurante"
                      />
                      {formErrors.name && (
                        <span className="text-sm text-red-500 mt-1 block">
                          {formErrors.name.message}
                        </span>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-900 dark:text-white text-lg">
                      {formValues.name || "Sin nombre"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-1" />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dirección
                  </label>
                  {isEditing ? (
                    <textarea
                      {...register("address")}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                      placeholder="Dirección del restaurante"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {formValues.address || "Sin dirección"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-1" />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Teléfono del restaurante
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      {...register("phone_number")}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="+52 999 999 9999"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {formValues.phone_number || "Sin teléfono"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ImageIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-1" />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Logo del restaurante
                  </label>

                  {isEditing ? (
                    <div className="space-y-4">
                      {imagePreview ? (
                        <div className="relative inline-block">
                          <img
                            src={imagePreview}
                            alt="Preview del logo"
                            className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600"
                          />
                          <button
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            type="button"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}

                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label
                          htmlFor="logo-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          <span>
                            {imagePreview ? "Cambiar imagen" : "Subir imagen"}
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Formatos: JPG, PNG, GIF. Tamaño máximo: 5MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Logo del restaurante"
                          className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                          <div className="text-center">
                            <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Sin logo
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              {isEditing ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !hasChanges()}
                    className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>
                          {uploadingImage
                            ? "Subiendo imagen..."
                            : "Guardando..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Guardar cambios</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                >
                  Editar información
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Nota:</strong> Los cambios en la información del negocio se
            reflejarán inmediatamente en la aplicación.
          </p>
        </div>

        {/* Delivery Settings Card */}
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Bike className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Opciones de entrega
              </h2>
            </div>

            {/* has_pickup toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Retiro en tienda</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">El cliente recoge su pedido en el local</p>
              </div>
              <button
                type="button"
                onClick={() => setDeliverySettings((s) => ({ ...s, has_pickup: !s.has_pickup }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  deliverySettings.has_pickup ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                aria-checked={deliverySettings.has_pickup}
                role="switch"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    deliverySettings.has_pickup ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* has_delivery toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Envío a domicilio</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Entregas a la dirección del cliente</p>
              </div>
              <button
                type="button"
                onClick={() => setDeliverySettings((s) => ({ ...s, has_delivery: !s.has_delivery }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  deliverySettings.has_delivery ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                aria-checked={deliverySettings.has_delivery}
                role="switch"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    deliverySettings.has_delivery ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* delivery_fee — solo lectura, definido por la plataforma */}
            {deliverySettings.has_delivery && (
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tarifa de envío a domicilio
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Definida por la plataforma. Contacta al administrador para modificarla.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">$</span>
                    <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm font-medium min-w-[7rem] inline-block">
                      {deliverySettings.delivery_fee.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">Solo lectura</span>
                  </div>
                </div>
              </div>
            )}

            {/* pickup_fee — solo lectura, siempre gratuito para el cliente */}
            {deliverySettings.has_pickup && (
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tarifa de retiro en tienda
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Se agregará al costo total del pedido del cliente. Favor de retenerlo.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">$</span>
                    <span className="px-3 py-2 bg-gray-100 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm font-medium min-w-[7rem] inline-block">
                      10.00
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">Solo lectura</span>
                  </div>
                </div>
              </div>
            )}

            {/* min_order_amount */}
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pedido mínimo
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Monto mínimo para aceptar un pedido. Usa 0 para sin mínimo.</p>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={deliverySettings.min_order_amount}
                    onChange={(e) =>
                      setDeliverySettings((s) => ({
                        ...s,
                        min_order_amount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Save message */}
            {deliverySaveMessage && (
              <div
                className={`p-3 rounded-lg text-sm font-medium ${
                  deliverySaveMessage.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                }`}
              >
                {deliverySaveMessage.text}
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveDeliverySettings}
              disabled={savingDelivery}
              className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {savingDelivery ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Guardar configuración</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
