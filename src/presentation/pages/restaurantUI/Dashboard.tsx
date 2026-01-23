import { DollarSign, ShoppingBag, Users, TrendingUp } from "lucide-react";
import MetricCard from "@components/restaurant-ui/cards/MetricCard";
import SalesLineChart from "@components/restaurant-ui/charts/SalesLineChart";
import ProductsBarChart from "@components/restaurant-ui/charts/ProductsBarChart";
import DataTable from "@components/restaurant-ui/tables/DataTable";
import StatusBadge from "@components/restaurant-ui/badges/StatusBadge";
import type { Column } from "@components/restaurant-ui/tables/DataTable";

interface Order {
  id: string;
  customer: string;
  items: string;
  total: number;
  status: "pending" | "completed" | "cancelled";
  date: string;
}

export default function Dashboard() {
  // Mock data for metrics
  const metrics = [
    {
      title: "Ventas del día",
      value: "$2,450",
      icon: <DollarSign className="w-6 h-6 text-amber-600" />,
      trend: { value: 12.5, isPositive: true },
      subtitle: "vs ayer: $2,180",
    },
    {
      title: "Pedidos totales",
      value: "48",
      icon: <ShoppingBag className="w-6 h-6 text-amber-600" />,
      trend: { value: 8.2, isPositive: true },
      subtitle: "vs ayer: 44",
    },
    {
      title: "Clientes nuevos",
      value: "12",
      icon: <Users className="w-6 h-6 text-amber-600" />,
      trend: { value: 3.1, isPositive: false },
      subtitle: "vs ayer: 15",
    },
    {
      title: "Ticket promedio",
      value: "$51",
      icon: <TrendingUp className="w-6 h-6 text-amber-600" />,
      trend: { value: 5.4, isPositive: true },
      subtitle: "vs ayer: $48",
    },
  ];

  // Mock data for sales chart
  const salesData = [
    { date: "Lun", sales: 1200 },
    { date: "Mar", sales: 1900 },
    { date: "Mié", sales: 1500 },
    { date: "Jue", sales: 2100 },
    { date: "Vie", sales: 2450 },
    { date: "Sáb", sales: 2800 },
    { date: "Dom", sales: 2300 },
  ];

  // Mock data for products chart
  const productsData = [
    { name: "Hamburguesa", sales: 45 },
    { name: "Pizza", sales: 38 },
    { name: "Tacos", sales: 32 },
    { name: "Sushi", sales: 28 },
    { name: "Hot Dog", sales: 22 },
  ];

  // Mock data for recent orders
  const recentOrders: Order[] = [
    {
      id: "ORD-001",
      customer: "Juan Pérez",
      items: "Hamburguesa clásica x2, Papas",
      total: 280,
      status: "completed",
      date: "10:30 AM",
    },
    {
      id: "ORD-002",
      customer: "María García",
      items: "Pizza familiar, Refresco",
      total: 450,
      status: "pending",
      date: "10:45 AM",
    },
    {
      id: "ORD-003",
      customer: "Carlos López",
      items: "Tacos x3, Agua",
      total: 180,
      status: "completed",
      date: "11:00 AM",
    },
    {
      id: "ORD-004",
      customer: "Ana Martínez",
      items: "Sushi roll, Té verde",
      total: 320,
      status: "pending",
      date: "11:15 AM",
    },
    {
      id: "ORD-005",
      customer: "Pedro Sánchez",
      items: "Hot Dog clásico x2",
      total: 140,
      status: "cancelled",
      date: "11:30 AM",
    },
  ];

  const orderColumns: Column<Order>[] = [
    {
      key: "id",
      header: "ID Pedido",
      width: "120px",
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
        <span className="font-medium text-gray-900 dark:text-white">
          {order.customer}
        </span>
      ),
    },
    {
      key: "items",
      header: "Productos",
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
      header: "Hora",
      width: "100px",
      render: (order) => (
        <span className="text-gray-600 dark:text-gray-400 text-sm">
          {order.date}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Resumen de tu restaurante en tiempo real
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesLineChart data={salesData} title="Ventas de la semana" />
        <ProductsBarChart data={productsData} title="Productos más vendidos" />
      </div>

      {/* Recent Orders */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Pedidos recientes
        </h2>
        <DataTable
          columns={orderColumns}
          data={recentOrders}
          keyExtractor={(order) => order.id}
          emptyMessage="No hay pedidos recientes"
        />
      </div>
    </div>
  );
}
