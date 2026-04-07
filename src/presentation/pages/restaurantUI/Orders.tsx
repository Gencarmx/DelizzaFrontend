import { useState, useEffect, useRef } from "react";
import { Search, Filter, Eye, Loader2, Wifi, WifiOff, ChefHat, Package, X, CheckCircle, Phone, MapPin, User, ShoppingBag, Copy, MessageCircle, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";
import DataTable from "@components/restaurant-ui/tables/DataTable";
import StatusBadge from "@components/restaurant-ui/badges/StatusBadge";
import { useRestaurantNotifications } from "@core/context/RestaurantNotificationsContext";
import { useAuth } from "@core/context/AuthContext";
import { getRecentOrders, updateOrderStatus } from "@core/services/orderService";
import { getBusinessById } from "@core/services/businessService";
import { PrintButton } from "@presentation/components/printing";
import type { Column } from "@components/restaurant-ui/tables/DataTable";
import { supabase } from "@core/supabase/client";


interface Order {
  id: string;
  fullId: string;
  customer: string;
  customerPhone?: string;
  /** String resumido para búsqueda y columnas compactas */
  items: string;
  /** Array estructurado de items — usado para renderizar sin depender de split por coma */
  itemsList?: Array<{ quantity: number; productName: string }>;
  total: number;
  status: "pending" | "awaiting_payment" | "completed" | "cancelled" | "in_progress" | "ready" | "preparing";
  date: string;
  paymentMethod: string;
  originalStatus?: string;
  deliveryType?: string;
  customerId?: string;
  deliveryAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country?: string;
    recipientName?: string;
    recipientPhone?: string;
  } | null;
}

interface OrderDetailData {
  order: Order;
  customerName: string;
  customerPhone: string;
  deliveryAddress: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country?: string;
    recipientName?: string;
    recipientPhone?: string;
  } | null;
  items: {
    quantity: number;
    productName: string;
    price: number;
    addons?: { name: string; price: number; quantity: number }[];
  }[];
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

export default function Orders() {
  const { profileId } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending_and_awaiting");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
  const [businessInfo, setBusinessInfo] = useState<{
    name: string;
    address: string;
    phone: string;
  } | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ order: Order; newStatus: string } | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Obtener notificaciones en tiempo real y estado de conexión
  const {
    hasNewOrder,
    latestOrder,
    isConnected,
    businessId,
    markAsRead
  } = useRestaurantNotifications();

  // Cargar información del negocio cuando cambia el businessId
  useEffect(() => {
    const loadBusinessInfo = async () => {
      if (!businessId) {
        setBusinessInfo(null);
        return;
      }

      try {
        const business = await getBusinessById(businessId);
        if (business) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const businessData = business as any;
          setBusinessInfo({
            name: business.name || "Mi Restaurante",
            address: business.address || "Dirección del restaurante",
            phone: businessData.phone || businessData.profile?.phone_number || "Teléfono",
          });
        }
      } catch (error) {
        console.error('Error cargando información del negocio:', error);
        setBusinessInfo(null);
      }
    };

    loadBusinessInfo();
  }, [businessId]);

  // Función para actualizar el estado de un pedido.
  // updatingOrders usa el UUID completo (fullId) como clave para evitar
  // colisiones entre órdenes que comparten los mismos últimos 8 caracteres.
  const handleStatusChange = async (fullId: string, _displayId: string, newStatus: string) => {
    if (!fullId || fullId === 'undefined') {
      console.error('❌ Error: fullId es undefined o inválido');
      return;
    }

    try {
      setUpdatingOrders(prev => new Set(prev).add(fullId));
      await updateOrderStatus(fullId, newStatus as any, undefined, profileId ?? undefined);

      setOrders(prev => prev.map(order =>
        order.fullId === fullId
          ? { ...order, status: mapOrderStatus(newStatus) }
          : order
      ));
    } catch (error) {
      console.error('Error actualizando estado:', error);
    } finally {
      setUpdatingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(fullId);
        return newSet;
      });
    }
  };

  // Función compartida para formatear órdenes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatOrders = (ordersData: any[]): Order[] =>
    ordersData.map(order => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawItems: Array<{ quantity: number; productName: string }> =
        order.order_items?.map((item: any) => ({
          quantity: item.quantity ?? 1,
          productName: item.product_name || 'Producto',
        })) ?? [];

      return {
        id: order.id.slice(-8).toUpperCase(),
        fullId: order.id,
        customer: order.customer_name || 'Cliente',
        items: rawItems.map(i => `${i.quantity}x ${i.productName}`).join(', ') || 'Sin items',
        itemsList: rawItems,
        total: order.total,
        status: mapOrderStatus(order.status || 'pending'),
        originalStatus: order.status || undefined,
        date: order.created_at
          ? new Date(order.created_at).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
          : 'Sin fecha',
        paymentMethod: order.payment_method || 'No especificado',
        deliveryType: order.delivery_type || undefined,
        customerId: order.customer_id || undefined,
      };
    });

  // Cargar pedidos iniciales
  useEffect(() => {
    const loadOrders = async () => {
      if (!businessId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const ordersData = await getRecentOrders(businessId, 50);
        setOrders(formatOrders(ordersData));
      } catch (error) {
        console.error('Error cargando pedidos:', error);
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, [businessId]);

  // Track which order IDs we've already added to avoid duplicates
  const processedOrderIds = useRef<Set<string>>(new Set());

  // React immediately to a new order from Realtime – prepend it without a full refetch
  useEffect(() => {
    if (!hasNewOrder || !latestOrder || !businessId) return;
    if (processedOrderIds.current.has(latestOrder.id)) return;

    processedOrderIds.current.add(latestOrder.id);

    // Build a formatted Order directly from the latestOrder payload
    const newOrder: Order = {
      id: latestOrder.id.slice(-8).toUpperCase(),
      fullId: latestOrder.id,
      customer: latestOrder.customer_name || 'Cliente',
      items: latestOrder.order_items?.map(
        (item: { quantity: number; product_name: string }) =>
          `${item.quantity}x ${item.product_name || 'Producto'}`
      ).join(', ') || 'Sin items',
      total: latestOrder.total,
      status: mapOrderStatus(latestOrder.status || 'pending'),
      originalStatus: latestOrder.status || undefined,
      date: latestOrder.created_at
        ? new Date(latestOrder.created_at).toLocaleString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
        : 'Ahora',
      paymentMethod: latestOrder.delivery_type || 'No especificado',
      deliveryType: latestOrder.delivery_type || undefined,
      customerId: latestOrder.customer_id || undefined,
    };

    // Prepend: most recent order should appear first
    setOrders(prev => {
      // Guard against duplicates already in the list
      if (prev.some(o => o.fullId === latestOrder.id)) return prev;
      return [newOrder, ...prev];
    });

    markAsRead();
  }, [hasNewOrder, latestOrder, businessId, markAsRead]);


  // Función para mapear estados de orden
  function mapOrderStatus(status: string): Order['status'] {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'awaiting_payment':
        return 'awaiting_payment';
      case 'confirmed':
      case 'preparing':
        return 'preparing';
      case 'ready':
        return 'ready';
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  /** Genera el texto plano con el resumen del pedido para compartir */
  const buildShareText = (detail: OrderDetailData): string => {
    const lines: string[] = [
      `🛒 Pedido #${detail.order.id}`,
      `📅 ${detail.order.date}`,
      ``,
      `👤 Cliente: ${detail.customerName}`,
      `📞 Teléfono: ${detail.customerPhone || 'No disponible'}`,
    ];

    if (detail.deliveryAddress) {
      const addr = detail.deliveryAddress;
      const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ');
      lines.push(`📍 Dirección: ${parts}`);
    }

    lines.push(``, `🍽️ Productos:`);
    detail.items.forEach(item => {
      lines.push(`  • ${item.quantity}x ${item.productName}${item.price > 0 ? ` — $${(item.price * item.quantity).toFixed(2)}` : ''}`);
      item.addons?.forEach(addon => {
        lines.push(`    + ${addon.quantity > 1 ? `${addon.quantity}x ` : ''}${addon.name}${addon.price > 0 ? ` (+$${(addon.price * addon.quantity).toFixed(2)})` : ''}`);
      });
    });

    lines.push(``, `💳 Pago: ${detail.order.paymentMethod}`);
    const deliveryLabel = detail.order.deliveryType === 'delivery'
      ? 'Domicilio'
      : detail.order.deliveryType === 'pickup'
        ? 'Recoger en tienda'
        : detail.order.deliveryType || 'No especificado';
    lines.push(`🚚 Entrega: ${deliveryLabel}`);
    lines.push(`💰 Total: $${detail.order.total}`);

    return lines.join('\n');
  };

  const handleCopyText = async (detail: OrderDetailData) => {
    const text = buildShareText(detail);
    try {
      if (navigator.share) {
        await navigator.share({ title: `Pedido #${detail.order.id}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopiedOrderId(detail.order.id);
        setTimeout(() => setCopiedOrderId(null), 2500);
      }
    } catch {
      // fallback silencioso
    }
  };

  const handleShareWhatsApp = (detail: OrderDetailData) => {
    const text = encodeURIComponent(buildShareText(detail));
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const openOrderDetail = async (order: Order) => {
    setLoadingDetail(true);
    setSelectedOrderDetail(null);
    try {
      const { data: rawOrder, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .eq('id', order.fullId)
        .single();

      if (orderError) throw orderError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customerId = (rawOrder as any)?.customer_id;

      let customerName = order.customer;
      let customerPhone = '';
      let deliveryAddress: OrderDetailData['deliveryAddress'] = null;

      if (customerId) {
        const [profileResult, addressResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, phone_number')
            .eq('id', customerId)
            .maybeSingle(),
          supabase
            .from('addresses')
            .select('*')
            .eq('profile_id', customerId)
            .order('is_default', { ascending: false })
            .limit(1),
        ]);

        // Los errores de perfil y dirección son no-bloqueantes: se registran
        // en consola pero el modal se abre igual con los datos base del pedido.
        if (profileResult.error) {
          console.warn('No se pudo cargar perfil del cliente:', profileResult.error.message);
        } else if (profileResult.data) {
          customerName = profileResult.data.full_name || order.customer;
          customerPhone = profileResult.data.phone_number || addressResult.data?.[0]?.phone || '';
        }

        if (addressResult.error) {
          console.warn('No se pudo cargar dirección del cliente:', addressResult.error.message);
        } else {
          const address = addressResult.data?.[0];
          if (address) {
            deliveryAddress = {
              line1: address.line1 || '',
              line2: address.line2 || undefined,
              city: address.city || '',
              state: address.state || undefined,
              postalCode: address.postal_code || undefined,
              country: address.country || undefined,
              recipientName: address.recipient_name || undefined,
              recipientPhone: address.phone || undefined,
            };
          }
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawItems = (rawOrder as any)?.order_items || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = rawItems.map((item: any) => ({
        quantity: item.quantity || 1,
        productName: item.product_name || 'Producto',
        price: item.price || 0,
        addons: Array.isArray(item.addons) && item.addons.length > 0 ? item.addons : undefined,
      }));

      const enrichedOrder: Order = {
        ...order,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deliveryType: (rawOrder as any)?.delivery_type || order.deliveryType,
        customer: customerName,
        customerPhone: customerPhone || undefined,
        deliveryAddress: deliveryAddress,
      };

      setOrders(prev => prev.map(o => o.fullId === order.fullId ? enrichedOrder : o));

      setSelectedOrderDetail({
        order: enrichedOrder,
        customerName,
        customerPhone,
        deliveryAddress,
        items,
      });
    } catch (error) {
      console.error('Error cargando detalle del pedido:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Determina qué acciones mostrar según el estado
  const getActionsForStatus = (order: Order) => {
    const { status } = order;
    const isUpdating = updatingOrders.has(order.fullId);

    // Debug: verificar que fullId existe
    if (!order.fullId) {
      console.error('❌ Error: order.fullId es undefined para el pedido:', order);
    }

    /** Botones fijos que aparecen en todos los estados */
    const btnView = (
      <button
        onClick={(e) => { e.stopPropagation(); openOrderDetail(order); }}
        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        title="Ver detalles"
      >
        <Eye className="w-4 h-4" />
      </button>
    );

    const btnPrint = (
      <PrintButton
        order={order}
        variant="icon"
        businessName={businessInfo?.name || "Mi Restaurante"}
        businessAddress={businessInfo?.address || "Dirección del restaurante"}
        businessPhone={businessInfo?.phone || "Teléfono"}
      />
    );

    const btnCancel = (
      <button
        onClick={() => setPendingAction({ order, newStatus: 'cancelled' })}
        disabled={isUpdating}
        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
        title="Cancelar pedido"
      >
        <X className="w-4 h-4" />
      </button>
    );

    // ── Flujo secuencial ────────────────────────────────────────────────────
    // pending (cash)           → [Ver] [En preparación] [Cancelar] [Imprimir]
    // pending (mercado_pago)   → [Ver] [Esperando pago] [Cancelar] [Imprimir]
    // awaiting_payment         → [Ver] [Confirmar pago → preparing] [Cancelar] [Imprimir]
    // preparing → [Ver] [Listo para entrega] [Cancelar] [Imprimir]
    // ready     → [Ver] [Entregado] [Cancelar] [Imprimir]
    // completed / cancelled → [Ver] [Imprimir]
    // ────────────────────────────────────────────────────────────────────────

    if (status === 'completed' || status === 'cancelled') {
      return (
        <div className="flex items-center gap-1">
          {btnView}
          {btnPrint}
        </div>
      );
    }

    if (status === 'pending') {
      const isMercadoPago = order.paymentMethod === 'mercado_pago';

      if (isMercadoPago) {
        // Flujo Mercado Pago: pending → awaiting_payment
        return (
          <div className="flex items-center gap-1">
            {btnView}
            <button
              onClick={() => setPendingAction({ order, newStatus: 'awaiting_payment' })}
              disabled={isUpdating}
              className="p-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-full text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
              title="Marcar como esperando pago"
            >
              <CreditCard className="w-4 h-4" />
            </button>
            {btnCancel}
            {btnPrint}
          </div>
        );
      }

      // Flujo efectivo: pending → preparing
      return (
        <div className="flex items-center gap-1">
          {btnView}
          <button
            onClick={() => setPendingAction({ order, newStatus: 'preparing' })}
            disabled={isUpdating}
            className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-full text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors disabled:opacity-50"
            title="Aceptar: En preparación"
          >
            <ChefHat className="w-4 h-4" />
          </button>
          {btnCancel}
          {btnPrint}
        </div>
      );
    }

    if (status === 'preparing') {
      return (
        <div className="flex items-center gap-1">
          {btnView}
          <button
            onClick={() => setPendingAction({ order, newStatus: 'ready' })}
            disabled={isUpdating}
            className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full text-green-500 hover:text-green-600 dark:hover:text-green-400 transition-colors disabled:opacity-50"
            title="Listo para entrega"
          >
            <Package className="w-4 h-4" />
          </button>
          {btnCancel}
          {btnPrint}
        </div>
      );
    }

    if (status === 'ready') {
      return (
        <div className="flex items-center gap-1">
          {btnView}
          <button
            onClick={(e) => { e.stopPropagation(); setPendingAction({ order, newStatus: 'completed' }); }}
            disabled={isUpdating}
            className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
            title="Marcar como entregado"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          {btnCancel}
          {btnPrint}
        </div>
      );
    }

    if (status === 'awaiting_payment') {
      return (
        <div className="flex items-center gap-1">
          {btnView}
          <button
            onClick={() => setPendingAction({ order, newStatus: 'preparing' })}
            disabled={isUpdating}
            className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full text-blue-600 hover:text-blue-700 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
            title="Confirmar pago recibido"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          {btnCancel}
          {btnPrint}
        </div>
      );
    }

    // Fallback (in_progress u otro estado no mapeado)
    return (
      <div className="flex items-center gap-1">
        {btnView}
        {btnCancel}
        {btnPrint}
      </div>
    );
  };


  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "pending_and_awaiting"
          ? order.status === "pending" || order.status === "awaiting_payment"
          : order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Paginación client-side
  const totalOrders = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageOffset = (safeCurrentPage - 1) * pageSize;
  const rangeStart = totalOrders === 0 ? 0 : pageOffset + 1;
  const rangeEnd = Math.min(pageOffset + pageSize, totalOrders);
  const pagedOrders = filteredOrders.slice(pageOffset, pageOffset + pageSize);

  // Reset a página 1 cuando cambian los filtros o la búsqueda
  // (se usa useEffect para no perder el estado entre renders)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setCurrentPage(1); }, [statusFilter, searchTerm, pageSize]);

  const columns: Column<Order>[] = [
    {
      key: "customer",
      header: "Cliente",
      width: "200px",
      render: (order) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-white text-base">
            {order.customer}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {order.paymentMethod}
          </span>
        </div>
      ),
    },
    {
      key: "items",
      header: "Detalle del pedido",
      render: (order) => (
        <div className="flex flex-col gap-1">
          {/* Usar itemsList (array estructurado) en lugar de parsear el string
              con split — evita errores con nombres de productos que contengan comas */}
          {(order.itemsList && order.itemsList.length > 0 ? order.itemsList : []).map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                {item.quantity}x
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                {item.productName}
              </span>
            </div>
          ))}
          {(!order.itemsList || order.itemsList.length === 0) && (
            <span className="text-gray-600 dark:text-gray-400 text-sm">{order.items}</span>
          )}
        </div>
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
      width: "150px",
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
      key: "actions",
      header: "Acciones",
      width: "120px",
      render: (order) => getActionsForStatus(order),
    },

  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Pedidos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Administra los pedidos de tu restaurante
          </p>
        </div>

        {/* Indicador de conexión Realtime */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
              <Wifi className="w-4 h-4" />
              <span>En vivo</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">
              <WifiOff className="w-4 h-4" />
              <span>Desconectado</span>
            </div>
          )}
        </div>
      </div>


      {/* Filters */}
      <div className="flex flex-col gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-3">
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
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          {(
            [
              { value: "pending_and_awaiting", label: "Pendientes" },
              { value: "all",                  label: "Todos" },
              { value: "pending",              label: "Por confirmar" },
              { value: "awaiting_payment",     label: "Esperando pago" },
              { value: "preparing",            label: "En preparación" },
              { value: "ready",                label: "Listo" },
              { value: "completed",            label: "Completados" },
              { value: "cancelled",            label: "Cancelados" },
            ] as const
          ).map((opt) => {
            const isActive = statusFilter === opt.value;
            const colorMap: Record<string, string> = {
              pending_and_awaiting: isActive
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700",
              all: isActive
                ? "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 border-gray-400 dark:border-gray-500"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700",
              pending: isActive
                ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700",
              awaiting_payment: isActive
                ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700",
              preparing: isActive
                ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700",
              ready: isActive
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700",
              completed: isActive
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700",
              cancelled: isActive
                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700",
            };
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${colorMap[opt.value]}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <div className="flex flex-col gap-4 mb-24 sm:mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando pedidos...</span>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={pagedOrders}
              keyExtractor={(order) => order.fullId || order.id}
              emptyMessage="No se encontraron pedidos"
            />
          )}
        </div>

        {/* Paginador — solo si hay datos */}
        {!loading && totalOrders > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Info + selector de tamaño */}
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {rangeStart}–{rangeEnd}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {totalOrders}
                </span>{" "}
                {totalOrders === 1 ? "pedido" : "pedidos"}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-500 dark:text-gray-400">Por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {PAGE_SIZE_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Controles de navegación */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                aria-label="Página anterior"
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[90px] text-center select-none">
                Página {safeCurrentPage} de {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                aria-label="Página siguiente"
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {(selectedOrderDetail || loadingDetail) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
          onClick={() => { setSelectedOrderDetail(null); }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingDetail ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando detalles...</span>
              </div>
            ) : selectedOrderDetail && (
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Pedido #{selectedOrderDetail.order.id}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {selectedOrderDetail.order.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={selectedOrderDetail.order.status} />
                    <button
                      onClick={() => setSelectedOrderDetail(null)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 flex flex-col gap-5">
                  {/* Customer Info */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Datos del cliente
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                        <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {selectedOrderDetail.customerName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                        <Phone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">
                        {selectedOrderDetail.customerPhone || 'Número no disponible'}
                      </span>
                    </div>

                    {/* Share actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleCopyText(selectedOrderDetail)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                        title="Copiar resumen del pedido"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedOrderId === selectedOrderDetail.order.id ? '¡Copiado!' : 'Copiar texto'}
                      </button>
                      <button
                        onClick={() => handleShareWhatsApp(selectedOrderDetail)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors"
                        title="Compartir por WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </button>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {selectedOrderDetail.deliveryAddress && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex flex-col gap-3">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Dirección de entrega
                      </h3>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full mt-0.5">
                          <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          {selectedOrderDetail.deliveryAddress.recipientName && (
                            <span className="text-gray-900 dark:text-white font-medium">
                              {selectedOrderDetail.deliveryAddress.recipientName}
                            </span>
                          )}
                          <span className="text-gray-700 dark:text-gray-300">
                            {selectedOrderDetail.deliveryAddress.line1}
                          </span>
                          {selectedOrderDetail.deliveryAddress.line2 && (
                            <span className="text-gray-700 dark:text-gray-300">
                              {selectedOrderDetail.deliveryAddress.line2}
                            </span>
                          )}
                          <span className="text-gray-700 dark:text-gray-300">
                            {[
                              selectedOrderDetail.deliveryAddress.city,
                              selectedOrderDetail.deliveryAddress.state,
                              selectedOrderDetail.deliveryAddress.postalCode,
                            ].filter(Boolean).join(', ')}
                          </span>
                          {selectedOrderDetail.deliveryAddress.country && (
                            <span className="text-gray-500 dark:text-gray-400 text-sm">
                              {selectedOrderDetail.deliveryAddress.country}
                            </span>
                          )}
                          {selectedOrderDetail.deliveryAddress.recipientPhone && (
                            <span className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                              Tel: {selectedOrderDetail.deliveryAddress.recipientPhone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      Productos
                    </h3>
                    <div className="flex flex-col gap-2">
                      {selectedOrderDetail.items.map((item, index) => (
                        <div key={index} className="flex flex-col gap-1">
                          {/* Producto */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                                {item.quantity}x
                              </span>
                              <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                                {item.productName}
                              </span>
                            </div>
                            {item.price > 0 && (
                              <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            )}
                          </div>
                          {/* Extras del producto */}
                          {item.addons && item.addons.length > 0 && (
                            <div className="ml-8 flex flex-col gap-0.5">
                              {item.addons.map((addon, i) => (
                                <div key={i} className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {addon.quantity > 1 ? `${addon.quantity}x ` : '+ '}{addon.name}
                                  </span>
                                  {addon.price > 0 && (
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                      +${(addon.price * addon.quantity).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Método de pago</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium capitalize">
                        {selectedOrderDetail.order.paymentMethod}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Tipo de entrega</span>
                      <span className="text-gray-700 dark:text-gray-300 font-medium capitalize">
                        {selectedOrderDetail.order.deliveryType === 'delivery' ? 'Domicilio' : selectedOrderDetail.order.deliveryType === 'pickup' ? 'Recoger en tienda' : selectedOrderDetail.order.deliveryType || 'No especificado'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-2 mt-1">
                      <span className="font-bold text-gray-900 dark:text-white">Total</span>
                      <span className="font-bold text-xl text-gray-900 dark:text-white">
                        ${selectedOrderDetail.order.total}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirm Action Modal — compacto, aplica a todos los cambios de estado */}
      {pendingAction && (() => {
        const { order, newStatus } = pendingAction;
        const cfg: Record<string, { label: string; accent: string; btnClass: string; iconEl: React.ReactNode }> = {
          awaiting_payment: {
            label: '¿Marcar como esperando pago?',
            accent: 'bg-indigo-100 dark:bg-indigo-900/30',
            btnClass: 'bg-indigo-600 hover:bg-indigo-700',
            iconEl: <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
          },
          confirmed: {
            label: '¿Confirmar pago recibido?',
            accent: 'bg-blue-100 dark:bg-blue-900/30',
            btnClass: 'bg-blue-600 hover:bg-blue-700',
            iconEl: <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
          },
          preparing: {
            label: '¿Iniciar preparación?',
            accent: 'bg-orange-100 dark:bg-orange-900/30',
            btnClass: 'bg-orange-500 hover:bg-orange-600',
            iconEl: <ChefHat className="w-4 h-4 text-orange-600 dark:text-orange-400" />,
          },
          ready: {
            label: '¿Listo para entrega?',
            accent: 'bg-green-100 dark:bg-green-900/30',
            btnClass: 'bg-green-600 hover:bg-green-700',
            iconEl: <Package className="w-4 h-4 text-green-600 dark:text-green-400" />,
          },
          completed: {
            label: '¿Marcar como entregado?',
            accent: 'bg-blue-100 dark:bg-blue-900/30',
            btnClass: 'bg-blue-600 hover:bg-blue-700',
            iconEl: <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
          },
          cancelled: {
            label: '¿Cancelar este pedido?',
            accent: 'bg-red-100 dark:bg-red-900/30',
            btnClass: 'bg-red-500 hover:bg-red-600',
            iconEl: <X className="w-4 h-4 text-red-600 dark:text-red-400" />,
          },
        };
        const { label, accent, btnClass, iconEl } = cfg[newStatus] ?? cfg.completed;
        const isUpdating = updatingOrders.has(order.fullId);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={() => setPendingAction(null)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xs p-5 flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Encabezado */}
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${accent}`}>
                  {iconEl}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    #{order.id} · {order.customer}
                  </p>
                </div>
              </div>

              {/* Info extra solo para "completado" */}
              {newStatus === 'completed' && (
                <div className={`rounded-xl px-3 py-2 flex items-center justify-between text-sm border ${
                  order.deliveryType === 'delivery'
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }`}>
                  <span className="text-gray-600 dark:text-gray-300">
                    Comisión ({order.deliveryType === 'delivery' ? 'domicilio' : 'recoger'})
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    ${order.deliveryType === 'delivery' ? '18.00' : '10.00'}
                  </span>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPendingAction(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  No
                </button>
                <button
                  onClick={() => {
                    handleStatusChange(order.fullId, order.id, newStatus);
                    setPendingAction(null);
                  }}
                  disabled={isUpdating}
                  className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 ${btnClass}`}
                >
                  {isUpdating
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : 'Sí'
                  }
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
