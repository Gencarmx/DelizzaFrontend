import type { Order } from "../types";
import "./OrderTicket.css";

interface OrderTicketProps {
  order: Order;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
}

export default function OrderTicket({
  order,
  businessName = "Mi Restaurante",
  businessAddress = "Dirección del restaurante",
  businessPhone = "Teléfono",
}: OrderTicketProps) {
  const deliveryLabel =
    order.deliveryType === "delivery"
      ? "Domicilio"
      : order.deliveryType === "pickup"
        ? "Recoger en tienda"
        : order.deliveryType || null;

  return (
    <div className="order-ticket">
      {/* Encabezado del Restaurante */}
      <div className="ticket-header">
        <h1 className="business-name">{businessName}</h1>
        <p className="business-info">{businessAddress}</p>
        <p className="business-info">{businessPhone}</p>
        <div className="divider" />
      </div>

      {/* Información del Pedido */}
      <div className="ticket-section">
        <div className="order-id-block">
          <span className="order-id-label">PEDIDO #</span>
          <span className="order-id-value">{order.id}</span>
        </div>
        <div className="info-row">
          <span className="label">Fecha:</span>
          <span className="value">{order.date}</span>
        </div>
        <div className="info-row">
          <span className="label">Cliente:</span>
          <span className="value">{order.customer}</span>
        </div>
        {order.customerPhone && (
          <div className="info-row">
            <span className="label">Teléfono:</span>
            <span className="value">{order.customerPhone}</span>
          </div>
        )}
        <div className="info-row">
          <span className="label">Pago:</span>
          <span className="value">{order.paymentMethod}</span>
        </div>
        {deliveryLabel && (
          <div className="info-row">
            <span className="label">Entrega:</span>
            <span className="value-badge">{deliveryLabel}</span>
          </div>
        )}
        <div className="divider-thick" />
      </div>

      {/* Dirección de entrega - solo para domicilio */}
      {order.deliveryType === "delivery" && order.deliveryAddress && (
        <div className="ticket-section">
          <p className="section-title">DIRECCIÓN DE ENTREGA</p>
          {order.deliveryAddress.recipientName && (
            <p className="address-line">{order.deliveryAddress.recipientName}</p>
          )}
          <p className="address-line">{order.deliveryAddress.line1}</p>
          {order.deliveryAddress.line2 && (
            <p className="address-line">{order.deliveryAddress.line2}</p>
          )}
          <p className="address-line">
            {[
              order.deliveryAddress.city,
              order.deliveryAddress.state,
              order.deliveryAddress.postalCode,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
          {order.deliveryAddress.country && (
            <p className="address-line">{order.deliveryAddress.country}</p>
          )}
          {order.deliveryAddress.recipientPhone && (
            <p className="address-line">Tel: {order.deliveryAddress.recipientPhone}</p>
          )}
          <div className="divider" />
        </div>
      )}

      {/* Recoger en tienda */}
      {order.deliveryType === "pickup" && (
        <div className="ticket-section">
          <p className="section-title">RECOGER EN TIENDA</p>
          <p className="address-line">{businessAddress}</p>
          {businessPhone && <p className="address-line">Tel: {businessPhone}</p>}
          <div className="divider" />
        </div>
      )}

      {/* Items del Pedido */}
      <div className="ticket-section items-section">
        <div className="items-header">
          <span className="col-qty">CANT</span>
          <span className="col-item">PRODUCTO</span>
          <span className="col-price">PRECIO</span>
        </div>

        {order.items.split(", ").map((item: string, index: number) => {
          const match = item.match(/(\d+)x\s(.+)/);
          if (match) {
            const [, quantity, productName] = match;
            const itemPrice = (order.total / order.items.split(", ").length).toFixed(2);
            return (
              <div key={index} className="item-row">
                <span className="col-qty">{quantity}</span>
                <span className="col-item">{productName}</span>
                <span className="col-price">${itemPrice}</span>
              </div>
            );
          }
          return null;
        })}

        <div className="divider" />
      </div>

      {/* Total */}
      <div className="ticket-section">
        <div className="total-row">
          <span className="total-label">TOTAL</span>
          <span className="total-value">${order.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="ticket-footer">
        <div className="divider-thick" />
        <p className="footer-text highlight">¡GRACIAS POR SU COMPRA!</p>
        <p className="footer-text">Visítenos pronto</p>
        <div className="divider-thin" />
        <p className="footer-small">ESTADO DEL PEDIDO</p>
        <p className="footer-status">{getStatusText(order.status).toUpperCase()}</p>
        <div className="barcode-placeholder">
          *{order.id.substring(0, 8)}*
        </div>
      </div>
    </div>
  );
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Pendiente",
    preparing: "En Preparación",
    ready: "Listo para Entrega",
    completed: "Completado",
    cancelled: "Cancelado",
  };
  return statusMap[status] || status;
}
