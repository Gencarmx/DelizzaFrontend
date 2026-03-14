/**
 * EditProfileLogic - Custom hook that manages all business logic for the EditProfile component
 * Handles form state, data fetching, validation, and profile updates
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@core/context";
import { supabase } from "@core/supabase/client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const editProfileSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.email("Correo electrónico inválido"),
  phone: z.string().min(1, "El teléfono es obligatorio"),
  birthdate: z.string().optional(),
});

export type EditProfileFormValues = z.infer<typeof editProfileSchema>;

export function useEditProfileLogic() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const form = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      birthdate: "",
    },
  });

  const {
    reset,
    formState: { isDirty },
  } = form;

  // UI state - controls modal visibility and loading states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pendingData, setPendingData] = useState<EditProfileFormValues | null>(
    null,
  );

  // Image handling state - manages profile picture selection and preview
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Original data - stores initial values for change detection of image
  // const [originalImage, setOriginalImage] = useState<string | null>(null);

  // Effect: Load user profile data when component mounts or user changes
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        // Fetch profile data from Supabase
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone_number")
          .eq("user_id", user.id)
          .single();

        // Merge profile data with user metadata and set defaults
        const data: EditProfileFormValues = {
          name:
            profile?.full_name || user.user_metadata?.full_name || "Usuario",
          email: user.email || "correo@ejemplo.com",
          phone: profile?.phone_number || "",
          birthdate: "", // Vacío si el usuario no la ha configurado
        };
        reset(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
        // Fallback a metadatos del usuario si el fetch del perfil falla
        reset({
          name: user.user_metadata?.full_name || "Usuario",
          email: user.email || "correo@ejemplo.com",
          phone: "",
          birthdate: "",
        });
      }
    };

    fetchProfile();
  }, [user, reset]);

  // Effect: Auto-hide success/error messages after 3 seconds
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  // Handler: Process selected image file and create preview
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      // Flag de montaje local: evita llamar setImagePreview si el componente
      // se desmonta mientras FileReader aún procesa el archivo.
      let mounted = true;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (mounted) setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      // La función no retorna un cleanup (es un event handler, no un effect),
      // por lo que usamos la variable de closure para cancelar la actualización.
      // En la práctica, FileReader es tan rápido que esto es preventivo.
      return () => { mounted = false; };
    }
  };

  // Computed: Check if form data has changed from original values
  const hasChanges = isDirty || selectedImage !== null;

  // Handler: Show confirmation modal if there are changes to save
  const handleSave = (data: EditProfileFormValues) => {
    if (hasChanges) {
      setPendingData(data);
      setIsModalOpen(true);
    }
  };

  // Handler: Execute profile update after user confirmation
  const confirmSave = async () => {
    if (!user || !pendingData) return;

    setIsSaving(true);
    try {
      // Persist profile changes to Supabase database.
      // Se usa UPDATE dirigido por user_id en lugar de upsert() sin onConflict,
      // ya que el perfil siempre existe cuando el usuario llega a esta pantalla.
      // upsert() sin onConflict intentaba un INSERT que violaba la constraint
      // UNIQUE profiles_user_id_key (error 23505).
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: pendingData.name,
          phone_number: pendingData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      // Update local state and show success feedback
      reset(pendingData); // resets isDirty
      setSelectedImage(null);
      setSaveMessage({
        type: "success",
        text: "Perfil actualizado correctamente",
      });
      setIsModalOpen(false);
      navigate(-1); // Return to previous page
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveMessage({ type: "error", text: "Error al guardar los cambios" });
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    // State
    form,
    isModalOpen,
    isSaving,
    saveMessage,
    selectedImage,
    imagePreview,
    fileInputRef,

    // Computed
    hasChanges,

    // Actions
    handleImageSelect,
    handleSave,
    confirmSave,
    setIsModalOpen,
  };
}
