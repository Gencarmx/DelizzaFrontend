export interface StatusBadgeProps {
  status:
    | "active"
    | "inactive"
    | "pending"
    | "completed"
    | "cancelled"
    | "in_progress";
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const statusConfig = {
    active: {
      bg: "bg-green-100",
      text: "text-green-700",
      label: label || "Activo",
    },
    inactive: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      label: label || "Inactivo",
    },
    pending: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      label: label || "Pendiente",
    },
    completed: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      label: label || "Completado",
    },
    cancelled: {
      bg: "bg-red-100",
      text: "text-red-700",
      label: label || "Cancelado",
    },
    in_progress: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      label: label || "En preparación",
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
