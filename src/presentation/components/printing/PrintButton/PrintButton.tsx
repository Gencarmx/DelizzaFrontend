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
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Courier New', Courier, 'Lucida Console', monospace;
              margin: 0;
              padding: 0;
              background: white;
            }

            .order-ticket {
              width: 80mm;
              margin: 0 auto;
              padding: 4mm 4mm;
              font-size: 11px;
              font-weight: 700;
              line-height: 1.5;
              color: #000;
            }

            .ticket-header {
              text-align: center;
              margin-bottom: 8px;
            }

            .business-name {
              font-size: 15px;
              font-weight: 900;
              margin: 0 0 4px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              word-break: break-word;
              white-space: normal;
            }

            .business-info {
              font-size: 10px;
              font-weight: 700;
              margin: 2px 0;
              word-break: break-word;
            }

            .divider {
              border: none;
              border-top: 2px dashed #000;
              margin: 5px 0;
            }

            .divider-thin {
              border: none;
              border-top: 1px solid #000;
              margin: 3px 0;
            }

            .ticket-section {
              margin-bottom: 2px;
              text-align: left;
            }

            .info-row {
              display: block;
              margin: 3px 0;
              font-size: 10px;
              font-weight: 700;
              word-break: break-word;
              overflow-wrap: break-word;
            }

            .label {
              font-weight: 900;
              display: inline;
            }

            .label::after {
              content: ' ';
            }

            .value {
              font-weight: 700;
              display: inline;
              word-break: break-word;
              overflow-wrap: break-word;
            }

            .section-title {
              font-size: 10px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0 0 3px 0;
              text-decoration: underline;
            }

            .address-line {
              font-size: 10px;
              font-weight: 700;
              margin: 2px 0;
              word-break: break-word;
              overflow-wrap: break-word;
            }

            .items-header {
              display: flex;
              justify-content: space-between;
              font-weight: 900;
              font-size: 10px;
              margin-bottom: 2px;
              text-transform: uppercase;
            }

            .col-qty {
              width: 12%;
              text-align: left;
              flex-shrink: 0;
            }

            .col-item {
              flex: 1;
              text-align: left;
              padding: 0 4px;
              word-break: break-word;
              overflow-wrap: break-word;
            }

            .col-price {
              width: 26%;
              text-align: right;
              flex-shrink: 0;
            }

            .item-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin: 3px 0;
              font-size: 10px;
              font-weight: 700;
            }

            .total-row {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              font-size: 13px;
              font-weight: 900;
              margin: 6px 0;
            }

            .total-label {
              font-size: 13px;
              font-weight: 900;
            }

            .total-value {
              font-size: 15px;
              font-weight: 900;
            }

            .ticket-footer {
              text-align: center;
              margin-top: 6px;
            }

            .footer-text {
              margin: 3px 0;
              font-size: 10px;
              font-weight: 900;
            }

            .footer-small {
              margin: 3px 0;
              font-size: 9px;
              font-weight: 700;
              color: #000;
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
