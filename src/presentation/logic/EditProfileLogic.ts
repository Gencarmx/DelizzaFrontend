/**
 * EditProfileLogic - Custom hook that manages all business logic for the EditProfile component
 * Handles form state, data fetching, validation, and profile updates
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@core/context";
import { supabase } from "@core/supabase/client";

/**
 * Interface defining the structure of profile form data
 */
export interface EditProfileFormData {
  name: string;
  email: string;
  phone: string;
  birthdate: string;
}

export function useEditProfileLogic() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form state - current form values being edited
  const [formData, setFormData] = useState<EditProfileFormData>({
    name: "",
    email: "",
    phone: "",
    birthdate: "",
  });

  // Original data - stores initial values for change detection
  const [originalData, setOriginalData] = useState<EditProfileFormData>({
    name: "",
    email: "",
    phone: "",
    birthdate: "",
  });

  // UI state - controls modal visibility and loading states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Image handling state - manages profile picture selection and preview
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        const data: EditProfileFormData = {
          name: profile?.full_name || user.user_metadata?.full_name || "Usuario",
          email: user.email || "correo@ejemplo.com",
          phone: profile?.phone_number || "+99 999 999 9999",
          birthdate: "1990-05-15", // Generic since not in schema
        };
        setFormData(data);
        setOriginalData(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
        // Fallback to user metadata if profile fetch fails
        setFormData({
          name: user.user_metadata?.full_name || "Usuario",
          email: user.email || "correo@ejemplo.com",
          phone: "+52 999 123 4567",
          birthdate: "1990-05-15",
        });
      }
    };

    fetchProfile();
  }, [user]);

  // Effect: Auto-hide success/error messages after 3 seconds
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  // Handler: Update form field value when user types
  const handleChange = (field: keyof EditProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handler: Process selected image file and create preview
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      // Create image preview using FileReader
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Computed: Check if form data has changed from original values
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  // Handler: Show confirmation modal if there are changes to save
  const handleSave = () => {
    if (hasChanges) {
      setIsModalOpen(true);
    }
  };

  // Handler: Execute profile update after user confirmation
  const confirmSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      // Persist profile changes to Supabase database
      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          full_name: formData.name,
          phone_number: formData.phone,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update local state and show success feedback
      setOriginalData(formData);
      setSaveMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
      setIsModalOpen(false);
      navigate(-1); // Return to previous page
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveMessage({ type: 'error', text: 'Error al guardar los cambios' });
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    // State
    formData,
    originalData,
    isModalOpen,
    isSaving,
    saveMessage,
    selectedImage,
    imagePreview,
    fileInputRef,

    // Computed
    hasChanges,

    // Actions
    handleChange,
    handleImageSelect,
    handleSave,
    confirmSave,
    setIsModalOpen,
  };
}
