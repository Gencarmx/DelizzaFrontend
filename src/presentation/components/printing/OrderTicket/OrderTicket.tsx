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
        <div className="info-row">
          <span className="label">PEDIDO #</span>
          <span className="value">{order.id}</span>
        </div>
        <div className="info-row">
          <span className="label">FECHA</span>
          <span className="value">{order.date}</span>
        </div>
        <div className="info-row">
          <span className="label">CLIENTE</span>
          <span className="value">{order.customer}</span>
        </div>
        {order.customerPhone && (
          <div className="info-row">
            <span className="label">TELÉFONO</span>
            <span className="value">{order.customerPhone}</span>
          </div>
        )}
        <div className="info-row">
          <span className="label">PAGO</span>
          <span className="value">{order.paymentMethod}</span>
        </div>
        {deliveryLabel && (
          <div className="info-row">
            <span className="label">ENTREGA</span>
            <span className="value">{deliveryLabel}</span>
          </div>
        )}
        <div className="divider" />
      </div>

      {/* Dirección de entrega - solo para domicilio */}
      {order.deliveryType === "delivery" && order.deliveryAddress && (
        <div className="ticket-section">
          <p className="section-title">DIRECCIÓN DE ENTREGA</p>
          {order.deliveryAddress.recipientName && (
            <p className="address-line">
              {order.deliveryAddress.recipientName}
            </p>
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
            <p className="address-line">
              Tel: {order.deliveryAddress.recipientPhone}
            </p>
          )}
          <div className="divider" />
        </div>
      )}

      {/* Recoger en tienda */}
      {order.deliveryType === "pickup" && (
        <div className="ticket-section">
          <p className="section-title">RECOGER EN TIENDA</p>
          <p className="address-line">{businessAddress}</p>
          {businessPhone && (
            <p className="address-line">Tel: {businessPhone}</p>
          )}
          <div className="divider" />
        </div>
      )}

      {/* Items del Pedido */}
      <div className="ticket-section">
        <div className="items-header">
          <span className="col-qty">CANT.</span>
          <span className="col-item">PRODUCTO</span>
          <span className="col-price">PRECIO</span>
        </div>
        <div className="divider-thin" />

        {order.ticketItems
          ? order.ticketItems.map((item, index) => (
              <div key={index} className="item-row">
                <span className="col-qty">{item.quantity}</span>
                <span className="col-item">{item.productName}</span>
                <span className="col-price">${item.price.toFixed(2)}</span>
              </div>
            ))
          : order.items.split(", ").map((item: string, index: number) => {
              const match = item.match(/(\d+)x\s(.+)/);
              if (match) {
                const [, quantity, productName] = match;
                // Calcular precio por item (esto es una aproximación)
                const itemPrice = (
                  order.total / order.items.split(", ").length
                ).toFixed(2);

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
        <div className="divider" />
      </div>

      {/* Footer */}
      <div className="ticket-footer">
        <p className="footer-text">¡Gracias por su compra!</p>
        <p className="footer-text">Vuelva pronto</p>
        <div className="divider-thin" />
        <p className="footer-small">Estado: {getStatusText(order.status)}</p>
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
