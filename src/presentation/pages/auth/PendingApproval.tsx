import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@core/context/AuthContext";
import { supabase } from "@core/supabase/client";
import { CheckCircle, Clock, Mail, Phone, AlertCircle, LogOut } from "lucide-react";

export default function PendingApproval() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [businessStatus, setBusinessStatus] = useState<{
    name: string;
    active: boolean;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const MAX_RETRIES = 15; // 30 seconds max (15 retries * 2 seconds)

  useEffect(() => {
    let pollInterval: number | null = null;
    let attempts = 0;

    const fetchBusinessStatus = async () => {
      if (!user?.id) return;

      attempts++;

      try {
        // First get the profile id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          return;
        }

        // If profile doesn't exist yet, keep polling
        if (!profile) {
          // After max retries, show pending state anyway
          if (attempts >= MAX_RETRIES) {
            setBusinessStatus({
              name: 'Tu Restaurante',
              active: false,
              status: 'pending'
            });
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            setLoading(false);
          }
          return;
        }

        // Get business info using profile.id
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('name, active')
          .eq('owner_id', profile.id)
          .maybeSingle();

        // Handle business not found (still being created)
        if (businessError && businessError.code !== 'PGRST116') {
          console.error('Error fetching business:', businessError);
        }

        // If business doesn't exist yet
        if (!business) {
          // After max retries, show pending state anyway
          if (attempts >= MAX_RETRIES) {
            setBusinessStatus({
              name: 'Tu Restaurante',
              active: false,
              status: 'pending'
            });
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            setLoading(false);
          }
          return;
        }

        // Business found! Set status and stop polling
        setBusinessStatus({
          name: business.name,
          active: business.active,
          status: business.active ? 'approved' : 'pending'
        });
        
        // Stop polling once we have the business
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    };

    // Initial fetch
    fetchBusinessStatus();

    // Poll every 2 seconds until business is found or max retries reached
    pollInterval = setInterval(() => {
      if (!businessStatus && attempts < MAX_RETRIES) {
        fetchBusinessStatus();
      } else {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        // If we hit max retries and still no business, show pending state
        if (!businessStatus && attempts >= MAX_RETRIES) {
          setBusinessStatus({
            name: 'Tu Restaurante',
            active: false,
            status: 'pending'
          });
          setLoading(false);
        }
      }
    }, 2000) as unknown as number;

    // Cleanup on unmount
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando estado...</p>
        </div>
      </div>
    );
  }

  const getStatusInfo = () => {
    if (!businessStatus) return { title: "Estado desconocido", description: "", color: "gray" as const };

    switch (businessStatus.status) {
      case 'pending':
        return {
          title: "Registro en Revisión",
          description: "Tu solicitud está siendo revisada por nuestro equipo.",
          color: "yellow" as const
        };
      case 'approved':
        return {
          title: "¡Aprobado!",
          description: "Tu restaurante ha sido aprobado. Ya puedes acceder a tu panel.",
          color: "green" as const
        };
      case 'rejected':
        return {
          title: "Solicitud Rechazada",
          description: "Tu solicitud ha sido rechazada. Contacta con soporte para más información.",
          color: "red" as const
        };
      default:
        return {
          title: "Estado Pendiente",
          description: "Estamos procesando tu solicitud.",
          color: "blue" as const
        };
    }
  };

  const statusInfo = getStatusInfo();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="pt-16 pb-8 px-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold text-gray-900">
            Estado de tu Registro
          </h1>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Salir</span>
          </button>
        </div>
        <p className="text-gray-500 text-base">
          {businessStatus?.name || "Tu restaurante"}
        </p>
      </div>

      {/* Status Card */}
      <div className="px-6 mb-8">
        <div className={`p-6 rounded-xl border-2 ${
          statusInfo.color === 'green' ? 'border-green-200 bg-green-50' :
          statusInfo.color === 'yellow' ? 'border-yellow-200 bg-yellow-50' :
          statusInfo.color === 'red' ? 'border-red-200 bg-red-50' :
          'border-blue-200 bg-blue-50'
        }`}>
          <div className="flex items-center gap-4 mb-4">
            {statusInfo.color === 'green' ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : statusInfo.color === 'yellow' ? (
              <Clock className="w-8 h-8 text-yellow-600" />
            ) : statusInfo.color === 'red' ? (
              <AlertCircle className="w-8 h-8 text-red-600" />
            ) : (
              <Clock className="w-8 h-8 text-blue-600" />
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {statusInfo.title}
              </h2>
              <p className="text-gray-600 mt-1">
                {statusInfo.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Progreso de tu Registro
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Registro Completado</p>
              <p className="text-sm text-gray-500">Información y documentos enviados</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              businessStatus?.status === 'pending' || businessStatus?.status === 'approved' || businessStatus?.status === 'rejected'
                ? 'bg-yellow-500' : 'bg-gray-300'
            }`}>
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Revisión en Progreso</p>
              <p className="text-sm text-gray-500">Nuestro equipo está verificando tu información</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              businessStatus?.status === 'approved' ? 'bg-green-500' :
              businessStatus?.status === 'rejected' ? 'bg-red-500' : 'bg-gray-300'
            }`}>
              {businessStatus?.status === 'approved' ? (
                <CheckCircle className="w-5 h-5 text-white" />
              ) : businessStatus?.status === 'rejected' ? (
                <AlertCircle className="w-5 h-5 text-white" />
              ) : (
                <Clock className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">Aprobación Final</p>
              <p className="text-sm text-gray-500">Acceso completo a la plataforma</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="px-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          ¿Necesitas Ayuda?
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <Mail className="w-5 h-5 text-gray-600" />
            <div>
              <p className="font-medium text-gray-900">Email de Soporte</p>
              <p className="text-sm text-gray-600">soporte@delizza.com</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <Phone className="w-5 h-5 text-gray-600" />
            <div>
              <p className="font-medium text-gray-900">Teléfono</p>
              <p className="text-sm text-gray-600">+1 (555) 123-4567</p>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="px-6 pb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-blue-900 mb-2">
            ¿Qué sucede ahora?
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Revisaremos tu información y documentos en 24-48 horas</li>
            <li>• Te notificaremos por email cuando haya una actualización</li>
            <li>• Una vez aprobado, podrás configurar tu menú y comenzar a recibir pedidos</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
