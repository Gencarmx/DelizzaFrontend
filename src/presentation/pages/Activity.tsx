import { CheckCircle2, Clock, XCircle } from "lucide-react";

export default function Activity() {
  const activities = [
    {
      id: 1,
      restaurant: "China food express",
      date: "2024-12-04 • 14:30",
      items: "Combo familiar, Sushi roll",
      status: "Entregado",
      price: "$434",
      statusColor: "text-green-500",
      StatusIcon: CheckCircle2,
    },
    {
      id: 2,
      restaurant: "Tio hamburguesas",
      date: "2024-12-04 • 18:45",
      items: "Hamburguesa calsica, Papas",
      status: "En progreso",
      price: "$200",
      statusColor: "text-amber-500",
      StatusIcon: Clock,
    },
    {
      id: 3,
      restaurant: "Kinich",
      date: "2024-12-03 • 12:15",
      items: "Hot Dog clasico",
      status: "Cancelado",
      price: "$140",
      statusColor: "text-red-500",
      StatusIcon: XCircle,
    },
  ];

  return (
    <div className="flex flex-col pt-2">
      <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-4 bg-white dark:bg-gray-800 sticky top-0 z-10 py-2">
        Actividad
      </h2>

      <div className="flex flex-col gap-4">
        {activities.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700 flex flex-col gap-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {item.restaurant}
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.date}</span>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{item.items}</p>
              </div>
              <item.StatusIcon className={`w-6 h-6 ${item.statusColor}`} />
            </div>

            <div className="h-px bg-gray-100" />

            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                {item.status}
              </span>
              <span className="font-bold text-gray-900 dark:text-white text-lg">
                {item.price}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
