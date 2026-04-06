import { ChevronLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router";

const sections = [
  {
    title: "1. Objeto y Naturaleza del Servicio",
    items: [
      "La plataforma funciona como un intermediario digital para conectar a los restaurantes con los clientes finales.",
      "La App no es dueña de los productos que se venden ni funge como empleadora de los repartidores; la gestión del personal de reparto es responsabilidad directa de cada restaurante.",
    ],
  },
  {
    title: "2. Planes de Suscripción y Comisiones",
    items: [
      "Plan Free: No tiene costo mensual e incluye acceso al perfil, menú digital y botón de pedidos. En este esquema, la Plataforma retiene el 100% de la comisión de envío, calculada en $15.00 MXN base más $2.00 MXN por kilómetro.",
      'Plan Premium: Tiene un costo mensual de $600.00 MXN y otorga prioridad en las listas y apariciones en "Recomendaciones del día". La comisión base de envío de $15.00 MXN se divide: $8.00 MXN para los gastos operativos del restaurante y $7.00 MXN para la Plataforma, quien también retiene íntegramente el cargo por kilómetro.',
    ],
  },
  {
    title: "3. Logística, Cobros y Liquidaciones",
    items: [
      "Dado que la App opera principalmente en efectivo, el repartidor del restaurante es quien cobra el 100% del pedido (alimentos más envío) al cliente en el momento de la entrega.",
      "Las liquidaciones se realizan quincenalmente, periodo en el que el restaurante se obliga a transferir a Gencar el monto de las comisiones y suscripciones acumuladas.",
      "Si el restaurante se retrasa más de 3 días en el pago tras el corte, su perfil será suspendido de la plataforma.",
      "Los pedidos 'Pick-up' (Recoger en Tienda) generan una tarifa de gestión de $10.00 MXN a cargo del cliente, que el restaurante debe recaudar y transferir a Gencar.",
    ],
  },
  {
    title: "4. Responsabilidades del Establecimiento",
    items: [
      "El restaurante debe mantener actualizados sus precios y stock, además de confirmar manualmente cada pedido.",
      "Al utilizar repartidores propios, el restaurante asume toda la responsabilidad vial, civil, laboral y penal que derive de la actividad de su personal.",
      "El restaurante autoriza el uso de su nombre, logotipos y fotografías para marketing dentro de la App y redes sociales.",
    ],
  },
];

export default function TermsAndConditions() {
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
          Términos y Condiciones
        </h2>
      </div>

      <div className="flex flex-col gap-5 px-4">
        {/* Hero banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-100 text-sm">
              Términos y Condiciones de Uso
            </p>
            <p className="text-amber-700 dark:text-amber-300 text-xs mt-1 leading-relaxed">
              Al utilizar la plataforma Delizza aceptas las condiciones descritas en este documento. Por favor léelas con atención.
            </p>
          </div>
        </div>

        {/* Sections */}
        {sections.map((section) => (
          <div
            key={section.title}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden"
          >
            {/* Section header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                {section.title}
              </h3>
            </div>

            {/* Section items */}
            <ul className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
              {section.items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 px-5 py-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-2" />
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Footer note */}
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center leading-relaxed pb-4">
          Delizza · Gencar Delivery · Izamal, Yucatán
        </p>
      </div>
    </div>
  );
}
