import { useState } from "react";
import { Search, Filter, Eye } from "lucide-react";
import DataTable from "@components/restaurant-ui/tables/DataTable";
import StatusBadge from "@components/restaurant-ui/badges/StatusBadge";
import type { Column } from "@components/restaurant-ui/tables/DataTable";

interface Order {
  id: string;
  customer: string;
  items: string;
  total: number;
  status: "pending" | "completed" | "cancelled" | "in_progress";
  date: string;
  paymentMethod: string;
}

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const orders: Order[] = [
    {
      id: "ORD-001",
      customer: "Juan Pérez",
      items: "Hamburguesa clásica x2, Papas",
      total: 280,
      status: "completed",
      date: "2024-01-15 10:30 AM",
      paymentMethod: "Tarjeta",
    },
    {
      id: "ORD-002",
      customer: "María García",
      items: "Pizza familiar, Refresco",
      total: 450,
      status: "pending",
      date: "2024-01-15 10:45 AM",
      paymentMethod: "Efectivo",
    },
    {
      id: "ORD-003",
      customer: "Carlos López",
      items: "Tacos x3, Agua",
      total: 180,
      status: "completed",
      date: "2024-01-15 11:00 AM",
      paymentMethod: "Tarjeta",
    },
    {
      id: "ORD-004",
      customer: "Ana Martínez",
      items: "Sushi roll, Té verde",
      total: 320,
      status: "in_progress",
      date: "2024-01-15 11:15 AM",
      paymentMethod: "Apple Pay",
    },
    {
      id: "ORD-005",
      customer: "Pedro Sánchez",
      items: "Hot Dog clásico x2",
      total: 140,
      status: "cancelled",
      date: "2024-01-15 11:30 AM",
      paymentMethod: "Efectivo",
    },
  ];

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<Order>[] = [
    {
      key: "id",
      header: "ID Pedido",
      width: "100px",
      render: (order) => (
        <span className="font-mono font-semibold text-gray-900 dark:text-white">
          {order.id}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Cliente",
      render: (order) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-white">
            {order.customer}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {order.paymentMethod}
          </span>
        </div>
      ),
    },
    {
      key: "items",
      header: "Detalle",
      render: (order) => (
        <span className="text-gray-600 dark:text-gray-400 text-sm">
          {order.items}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total",
      width: "100px",
      render: (order) => (
        <span className="font-bold text-gray-900 dark:text-white">
          ${order.total}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      width: "130px",
      render: (order) => <StatusBadge status={order.status} />,
    },
    {
      key: "date",
      header: "Fecha",
      width: "150px",
      render: (order) => (
        <span className="text-gray-600 dark:text-gray-400 text-sm">
          {order.date}
        </span>
      ),
    },
    {
      key: "id", // Using ID for actions column key is fine if not sorting
      header: "Acciones",
      width: "80px",
      render: () => (
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <Eye className="w-5 h-5" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Pedidos
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Administra los pedidos de tu restaurante
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por ID o cliente..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          <select
            className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="in_progress">En preparación</option>
            <option value="completed">Completados</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <DataTable
          columns={columns}
          data={filteredOrders}
          keyExtractor={(order) => order.id}
          emptyMessage="No se encontraron pedidos"
        />
      </div>
    </div>
  );
}
