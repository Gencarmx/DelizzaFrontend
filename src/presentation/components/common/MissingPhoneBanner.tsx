import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "@core/context/AuthContext";
import { supabase } from "@core/supabase/client";

export function MissingPhoneBanner() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [missingPhone, setMissingPhone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || role === "owner" || role === "admin") return;

    supabase
      .from("profiles")
      .select("phone_number")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.phone_number) setMissingPhone(true);
      });
  }, [user, role]);

  if (!missingPhone || dismissed) return null;

  return (
    <div className="mx-4 mt-3 mb-1 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 dark:bg-blue-800/50 p-2 rounded-full shrink-0">
          <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 dark:text-white text-sm">
            Agrega tu número de teléfono
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Lo necesitamos para coordinar tus entregas
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <button
          onClick={() => navigate("/edit-profile")}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
        >
          Agregar
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs px-1"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
