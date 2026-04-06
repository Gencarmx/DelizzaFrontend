import { ChevronLeft, Shield, User, Store } from "lucide-react";
import { useNavigate } from "react-router";

const clientSection = {
  icon: User,
  color: "blue",
  title: "Aviso de Privacidad para Clientes",
  subtitle: "Usuarios de la App",
  groups: [
    {
      label: "Identidad del Responsable",
      items: [
        "Gencar Delivery, con domicilio en Izamal, Yucatán, es el responsable del tratamiento de los datos personales.",
      ],
    },
    {
      label: "Datos Recabados",
      items: [
        "Nombre completo del usuario.",
        "Número telefónico.",
        "Ubicación geográfica (GPS) del dispositivo.",
      ],
    },
    {
      label: "Finalidades del Tratamiento",
      items: [
        "Enlazar al usuario con el restaurante de su elección.",
        "Calcular automáticamente el costo del envío por distancia.",
        "Permitir que el repartidor localice el domicilio de entrega.",
        "Enviar notificaciones de estatus del pedido y promociones.",
      ],
    },
    {
      label: "Transferencia de Datos",
      items: [
        "Los datos de contacto y ubicación se comparten únicamente con el restaurante seleccionado para coordinar la entrega.",
        "Gencar no comercializa datos personales con terceros.",
      ],
    },
    {
      label: "Derechos ARCO",
      items: [
        "Los usuarios pueden limitar el uso de sus datos o solicitar la cancelación de su cuenta mediante el panel de soporte de la App.",
      ],
    },
  ],
};

const restaurantSection = {
  icon: Store,
  color: "amber",
  title: "Aviso de Privacidad para Restaurantes",
  subtitle: "Socios Comerciales",
  groups: [
    {
      label: "Datos Recabados",
      items: [
        "Nombre comercial del establecimiento.",
        "Menú, precios y stock de productos.",
        "Datos de contacto del establecimiento.",
      ],
    },
    {
      label: "Finalidades Operativas",
      items: [
        "Gestión de inventarios y catálogo digital.",
        "Generación de tickets y reportes de pedidos.",
        "Determinación de liquidaciones quincenales.",
        "Autenticación de acceso mediante Google.",
      ],
    },
    {
      label: "Uso de Imagen",
      items: [
        "El restaurante cede el derecho a Gencar para utilizar sus logotipos y fotografías en estrategias de marketing y publicidad digital dentro y fuera de la plataforma.",
      ],
    },
  ],
};

function PolicySection({
  section,
}: {
  section: typeof clientSection | typeof restaurantSection;
}) {
  const isBlue = section.color === "blue";
  const Icon = section.icon;

  return (
    <div className="flex flex-col gap-3">
      {/* Section title */}
      <div
        className={`rounded-2xl p-5 flex items-start gap-4 border ${
          isBlue
            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
        }`}
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isBlue
              ? "bg-blue-100 dark:bg-blue-800/50"
              : "bg-amber-100 dark:bg-amber-800/50"
          }`}
        >
          <Icon
            className={`w-5 h-5 ${
              isBlue
                ? "text-blue-600 dark:text-blue-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
          />
        </div>
        <div>
          <p
            className={`font-bold text-sm ${
              isBlue
                ? "text-blue-900 dark:text-blue-100"
                : "text-amber-900 dark:text-amber-100"
            }`}
          >
            {section.title}
          </p>
          <p
            className={`text-xs mt-0.5 ${
              isBlue
                ? "text-blue-700 dark:text-blue-300"
                : "text-amber-700 dark:text-amber-300"
            }`}
          >
            {section.subtitle}
          </p>
        </div>
      </div>

      {/* Groups */}
      {section.groups.map((group) => (
        <div
          key={group.label}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wide">
              {group.label}
            </h4>
          </div>
          <ul className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
            {group.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 px-5 py-3.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 ${
                    isBlue ? "bg-blue-400" : "bg-amber-400"
                  }`}
                />
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {item}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col pt-2 pb-24 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 bg-white dark:bg-gray-800 sticky top-0 z-10 py-3 px-4 border-b border-gray-100 dark:border-gray-700">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>
        <h2 className="font-bold text-lg text-gray-900 dark:text-white">
          Políticas de Privacidad
        </h2>
      </div>

      <div className="flex flex-col gap-6 px-4">
        {/* Intro */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 flex items-start gap-3">
          <Shield className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            En Gencar Delivery nos comprometemos a proteger tu información personal. Este documento describe cómo recopilamos, usamos y resguardamos tus datos en dos ámbitos: usuarios finales y socios comerciales.
          </p>
        </div>

        <PolicySection section={clientSection} />
        <PolicySection section={restaurantSection} />

        {/* Footer note */}
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center leading-relaxed pb-4">
          Delizza · Gencar Delivery · Izamal, Yucatán
        </p>
      </div>
    </div>
  );
}
