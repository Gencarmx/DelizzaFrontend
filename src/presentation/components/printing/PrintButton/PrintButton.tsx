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
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para imprimir');
      return;
    }

    const ticketContent = printRef.current?.innerHTML || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ticket - Pedido ${order.id}</title>
          <style>
            @media print {
              @page {
                margin: 0;
                size: 58mm auto;
              }
              html, body {
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

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  };

  return (
    <>
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
