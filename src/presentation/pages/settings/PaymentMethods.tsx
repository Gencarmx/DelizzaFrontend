import { ChevronLeft, CreditCard, Plus, MoreVertical, Check } from "lucide-react";
import { useNavigate } from "react-router";
import { useState } from "react";

export default function PaymentMethods() {
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState(1);

  const paymentMethods = [
    {
      id: 1,
      type: "Visa",
      last4: "4242",
      expiry: "12/25",
      holderName: "Juan Pérez",
      isDefault: true,
      color: "bg-gradient-to-br from-blue-500 to-blue-700",
    },
    {
      id: 2,
      type: "Mastercard",
      last4: "8888",
      expiry: "08/26",
      holderName: "Juan Pérez",
      isDefault: false,
      color: "bg-gradient-to-br from-gray-700 to-gray-900",
    },
    {
      id: 3,
      type: "American Express",
      last4: "1234",
      expiry: "03/27",
      holderName: "Juan Pérez",
      isDefault: false,
      color: "bg-gradient-to-br from-green-600 to-green-800",
    },
  ];

  return (
    <div className="flex flex-col pt-2 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 bg-white sticky top-0 z-10 py-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h2 className="font-bold text-lg text-gray-900">Métodos de pago</h2>
      </div>

      {/* Payment Methods List */}
      <div className="flex flex-col gap-4 mb-6">
        {paymentMethods.map((card) => (
          <div
            key={card.id}
            className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100"
          >
            {/* Card Visual */}
            <div
              className={`${card.color} rounded-xl p-4 mb-4 text-white relative overflow-hidden`}
            >
              {/* Card Pattern */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <CreditCard className="w-8 h-8" strokeWidth={1.5} />
                  {card.isDefault && (
                    <span className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                      Predeterminada
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <div className="text-lg tracking-wider font-mono">
                    •••• •••• •••• {card.last4}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] opacity-70 mb-1">
                      TITULAR
                    </div>
                    <div className="text-sm font-medium">{card.holderName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] opacity-70 mb-1">EXPIRA</div>
                    <div className="text-sm font-medium">{card.expiry}</div>
                  </div>
                  <div className="text-sm font-bold">{card.type}</div>
                </div>
              </div>
            </div>

            {/* Card Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedCard(card.id)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedCard === card.id
                      ? "border-amber-400 bg-amber-400"
                      : "border-gray-300"
                  }`}
                >
                  {selectedCard === card.id && (
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  )}
                </div>
                <span>Usar esta tarjeta</span>
              </button>

              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <MoreVertical className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Card Button */}
      <button className="w-full bg-white border-2 border-dashed border-gray-300 text-gray-700 font-medium py-4 rounded-xl flex items-center justify-center gap-2 hover:border-amber-400 hover:text-amber-400 transition-colors">
        <Plus className="w-5 h-5" />
        <span>Agregar nueva tarjeta</span>
      </button>

      {/* Payment Info */}
      <div className="mt-6 bg-amber-50 border border-amber-100 rounded-xl p-4">
        <p className="text-xs text-gray-600 leading-relaxed">
          <span className="font-semibold text-gray-800">
            Tus datos están seguros.
          </span>{" "}
          Utilizamos encriptación de nivel bancario para proteger tu información
          de pago.
        </p>
      </div>
    </div>
  );
}
