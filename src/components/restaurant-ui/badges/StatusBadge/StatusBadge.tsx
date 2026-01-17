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
      border: "border-green-200",
      dot: "bg-green-500",
      label: label || "Activo",
    },
    inactive: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-200",
      dot: "bg-gray-500",
      label: label || "Inactivo",
    },
    pending: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      border: "border-amber-200",
      dot: "bg-amber-500",
      label: label || "Pendiente",
    },
    completed: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      border: "border-blue-200",
      dot: "bg-blue-500",
      label: label || "Completado",
    },
    cancelled: {
      bg: "bg-red-100",
      text: "text-red-700",
      border: "border-red-200",
      dot: "bg-red-500",
      label: label || "Cancelado",
    },
    in_progress: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      border: "border-blue-200",
      dot: "bg-blue-500",
      label: label || "En preparación",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`${config.bg} ${config.text} border ${config.border} px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 hover:scale-105 transition-transform duration-200 cursor-default`}
    >
      <span className={`w-1.5 h-1.5 ${config.dot} rounded-full animate-pulse`}></span>
      {config.label}
    </span>
  );
}