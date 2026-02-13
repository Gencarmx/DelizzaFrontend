import { useRef } from "react";
import { Printer } from "lucide-react";
import type { Order } from "../types";
import OrderTicket from "../OrderTicket/OrderTicket";
import "./PrintButton.css";

interface PrintButtonProps {
  order: Order;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  variant?: "icon" | "button";
  className?: string;
}

export default function PrintButton({
  order,
  businessName,
  businessAddress,
  businessPhone,
  variant = "icon",
  className = "",
}: PrintButtonProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    // Crear una ventana de impresión
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para imprimir');
      return;
    }

    // Obtener el contenido del ticket
    const ticketContent = printRef.current?.innerHTML || '';

    // Crear el HTML completo para la impresión
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ticket - Pedido ${order.id}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Courier New', Courier, monospace;
              margin: 0;
              padding: 0;
              background: white;
            }

            .order-ticket {
              width: 80mm;
              margin: 0 auto;
              padding: 5mm;
              font-size: 11px;
              line-height: 1.4;
              color: black;
            }

            .ticket-header {
              text-align: center;
              margin-bottom: 10px;
            }

            .business-name {
              font-size: 16px;
              font-weight: bold;
              margin: 0 0 5px 0;
              text-transform: uppercase;
            }

            .business-info {
              font-size: 10px;
              margin: 2px 0;
            }

            .divider {
              margin: 5px 0;
              font-size: 10px;
            }

            .divider-thin {
              margin: 3px 0;
              font-size: 10px;
            }

            .ticket-order-info {
              margin-bottom: 10px;
            }

            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
              font-size: 10px;
            }

            .label {
              font-weight: bold;
            }

            .value {
              text-align: right;
            }

            .ticket-items {
              margin-bottom: 10px;
            }

            .items-header {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              font-size: 10px;
              margin-bottom: 3px;
            }

            .col-qty {
              width: 15%;
              text-align: left;
            }

            .col-item {
              width: 60%;
              text-align: left;
            }

            .col-price {
              width: 25%;
              text-align: right;
            }

            .item-row {
              display: flex;
              justify-content: space-between;
              margin: 4px 0;
              font-size: 10px;
            }

            .ticket-total {
              margin-bottom: 10px;
            }

            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 14px;
              font-weight: bold;
              margin: 8px 0;
            }

            .total-label {
              font-size: 14px;
            }

            .total-value {
              font-size: 16px;
            }

            .ticket-footer {
              text-align: center;
              margin-top: 10px;
            }

            .footer-text {
              margin: 4px 0;
              font-size: 11px;
              font-weight: bold;
            }

            .footer-small {
              margin: 4px 0;
              font-size: 9px;
              color: #666;
            }

            @media print {
              @page {
                margin: 0;
                size: 80mm auto;
              }

              body {
                margin: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          ${ticketContent}
        </body>
      </html>
    `);

    printWindow.document.close();

    // Esperar a que se cargue el contenido y luego imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  };

  return (
    <>
      {/* Botón visible */}
      {variant === "icon" ? (
        <button
          onClick={handlePrint}
          className={`print-button-icon ${className}`}
          title="Imprimir ticket"
        >
          <Printer className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={handlePrint}
          className={`print-button-full ${className}`}
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir</span>
        </button>
      )}

      {/* Ticket oculto para impresión */}
      <div ref={printRef} className="print-hidden">
        <OrderTicket
          order={order}
          businessName={businessName}
          businessAddress={businessAddress}
          businessPhone={businessPhone}
        />
      </div>
    </>
  );
}
