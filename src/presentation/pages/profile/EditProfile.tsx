import { ChevronLeft, User, Mail, Phone } from "lucide-react";
import { useNavigate } from "react-router";
import ConfirmModal from "@components/restaurant-ui/modals/ConfirmModal";
import { useEditProfileLogic } from "@presentation/logic";

export default function EditProfile() {
  const navigate = useNavigate();
  const {
    form: {
      register,
      handleSubmit,
      formState: { errors: formErrors },
    },
    isModalOpen,
    isSaving,
    saveMessage,
    imagePreview,
    fileInputRef,
    hasChanges,
    handleImageSelect,
    handleSave,
    confirmSave,
    setIsModalOpen,
  } = useEditProfileLogic();

  return (
    <div className="flex flex-col pt-2 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 bg-white dark:bg-gray-800 sticky top-0 z-10 py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h2 className="font-bold text-lg text-gray-900 dark:text-white">
            Editar perfil
          </h2>
        </div>
        <button
          onClick={handleSubmit(handleSave)}
          className="text-amber-400 font-semibold text-sm hover:text-amber-500 transition-colors"
        >
          Guardar
        </button>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div
          className={`mt-4 p-3 rounded-lg text-center text-sm font-medium mx-4 ${
            saveMessage.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Profile Picture */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          <div className="w-24 h-24 bg-amber-300/80 rounded-full flex items-center justify-center text-gray-800 dark:text-gray-200 overflow-hidden">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-12 h-12" strokeWidth={1.5} />
            )}
          </div>
          {/* <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-lg hover:bg-amber-500 transition-colors"
          >
            <Camera className="w-4 h-4 text-white" strokeWidth={2} />
          </button> */}
        </div>
        {/* <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          Toca para cambiar foto
        </p> */}
      </div>

      {/* Form Fields */}
      <form
        className="flex flex-col gap-4 px-4"
        onSubmit={handleSubmit(handleSave)}
      >
        {/* Name Field */}
        <div
          className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border ${
            formErrors.name
              ? "border-red-300"
              : "border-gray-100 dark:border-gray-700"
          }`}
        >
          <label className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
            <div className="flex-1 w-full">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Nombre completo
              </div>
              <input
                type="text"
                {...register("name")}
                className="w-full text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 p-0"
                placeholder="Ingresa tu nombre"
              />
            </div>
          </label>
        </div>
        {formErrors.name && (
          <p className="text-sm text-red-500 ml-4">{formErrors.name.message}</p>
        )}

        {/* Email Field */}
        <div
          className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border ${
            formErrors.email
              ? "border-red-300"
              : "border-gray-100 dark:border-gray-700"
          }`}
        >
          <label className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
            <div className="flex-1 w-full">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Correo electrónico
              </div>
              <input
                type="email"
                {...register("email")}
                className="w-full text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 p-0 disabled:opacity-50"
                placeholder="correo@ejemplo.com"
                disabled // typically users can't edit email easily, but keeping it disabled as it was before or let hook handle it
              />
            </div>
          </label>
        </div>
        {formErrors.email && (
          <p className="text-sm text-red-500 ml-4">
            {formErrors.email.message}
          </p>
        )}

        {/* Phone Field */}
        <div
          className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border ${
            formErrors.phone
              ? "border-red-300"
              : "border-gray-100 dark:border-gray-700"
          }`}
        >
          <label className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
            <div className="flex-1 w-full">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Teléfono
              </div>
              <input
                type="tel"
                {...register("phone")}
                className="w-full text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 p-0"
                placeholder="+** 999 999 9999"
              />
            </div>
          </label>
        </div>
        {formErrors.phone && (
          <p className="text-sm text-red-500 ml-4">
            {formErrors.phone.message}
          </p>
        )}

        {/* Birthdate Field
        <div
          className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border ${
            formErrors.birthdate
              ? "border-red-300"
              : "border-gray-100 dark:border-gray-700"
          }`}
        >
          <label className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
            <div className="flex-1 w-full">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Fecha de nacimiento
              </div>
              <input
                type="date"
                {...register("birthdate")}
                className="w-full text-sm font-medium text-gray-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 p-0"
              />
            </div>
          </label>
        </div>
        {formErrors.birthdate && (
          <p className="text-sm text-red-500 ml-4">
            {formErrors.birthdate.message}
          </p>
        )} */}
      </form>

      {/* Change Warning */}
      {hasChanges && (
        <div className="mt-4 mx-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            <span className="font-semibold">Has realizado cambios.</span>{" "}
            Asegúrate de guardar tus modificaciones antes de salir.
          </p>
        </div>
      )}

      {/* Info Message */}
      <div className="mt-6 mx-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            Mantén tu información actualizada.
          </span>{" "}
          Esto nos ayuda a brindarte un mejor servicio y mantener tu cuenta
          segura.
        </p>
      </div>

      {/* Delete Account Link — type="button" evita que actúe como submit dentro del form */}
      <button
        type="button"
        onClick={() => {
          // TODO: implementar flujo de eliminación de cuenta con confirmación
          alert("Para eliminar tu cuenta, por favor contacta a soporte.");
        }}
        className="mt-6 text-center text-sm text-red-500 font-medium hover:text-red-600 transition-colors"
      >
        Eliminar mi cuenta
      </button>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmSave}
        title="Confirmar cambios"
        message="¿Estás seguro de que deseas guardar los cambios en tu perfil?"
        confirmText="Guardar"
        cancelText="Cancelar"
        variant="primary"
        isLoading={isSaving}
      />

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
    </div>
  );
}
