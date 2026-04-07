export interface StatusBadgeProps {
  status:
    | "active"
    | "inactive"
    | "pending"
    | "awaiting_payment"
    | "completed"
    | "cancelled"
    | "in_progress"
    | "ready"
    | "preparing";
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const statusConfig = {
    active: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-400",
      label: label || "Activo",
    },
    inactive: {
      bg: "bg-gray-100 dark:bg-gray-700",
      text: "text-gray-700 dark:text-gray-300",
      label: label || "Inactivo",
    },
    pending: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-400",
      label: label || "Pendiente",
    },
    preparing: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-700 dark:text-orange-400",
      label: label || "En preparación",
    },
    ready: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-400",
      label: label || "Listo para entrega",
    },
    completed: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-700 dark:text-blue-400",
      label: label || "Completado",
    },
    cancelled: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-400",
      label: label || "Cancelado",
    },
    in_progress: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-700 dark:text-blue-400",
      label: label || "En preparación",
    },
    awaiting_payment: {
      bg: "bg-indigo-100 dark:bg-indigo-900/30",
      text: "text-indigo-700 dark:text-indigo-400",
      label: label || "Esperando pago",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`${config.bg} ${config.text} px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center`}
    >
      {config.label}
    </span>
  );
}
