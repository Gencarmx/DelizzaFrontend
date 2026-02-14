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
  return (
    <div className="order-ticket">
      {/* Encabezado del Restaurante */}
      <div className="ticket-header">
        <h1 className="business-name">{businessName}</h1>
        <p className="business-info">{businessAddress}</p>
        <p className="business-info">{businessPhone}</p>
        <div className="divider">================================</div>
      </div>

      {/* Información del Pedido */}
      <div className="ticket-order-info">
        <div className="info-row">
          <span className="label">Pedido #:</span>
          <span className="value">{order.id}</span>
        </div>
        <div className="info-row">
          <span className="label">Fecha:</span>
          <span className="value">{order.date}</span>
        </div>
        <div className="info-row">
          <span className="label">Cliente:</span>
          <span className="value">{order.customer}</span>
        </div>
        <div className="info-row">
          <span className="label">Pago:</span>
          <span className="value">{order.paymentMethod}</span>
        </div>
        <div className="divider">================================</div>
      </div>

      {/* Items del Pedido */}
      <div className="ticket-items">
        <div className="items-header">
          <span className="col-qty">Cant.</span>
          <span className="col-item">Producto</span>
          <span className="col-price">Precio</span>
        </div>
        <div className="divider-thin">--------------------------------</div>
        
        {order.items.split(', ').map((item: string, index: number) => {
          const match = item.match(/(\d+)x\s(.+)/);
          if (match) {
            const [, quantity, productName] = match;
            // Calcular precio por item (esto es una aproximación)
            const itemPrice = (order.total / order.items.split(', ').length).toFixed(2);
            
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
        
        <div className="divider">================================</div>
      </div>

      {/* Total */}
      <div className="ticket-total">
        <div className="total-row">
          <span className="total-label">TOTAL:</span>
          <span className="total-value">${order.total.toFixed(2)}</span>
        </div>
        <div className="divider">================================</div>
      </div>

      {/* Footer */}
      <div className="ticket-footer">
        <p className="footer-text">¡Gracias por su compra!</p>
        <p className="footer-text">Vuelva pronto</p>
        <div className="divider-thin">--------------------------------</div>
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
