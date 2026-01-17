import {
  ChevronLeft,
  MapPin,
  Home,
  Briefcase,
  Plus,
  MoreVertical,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useState } from "react";

export default function SavedAddresses() {
  const navigate = useNavigate();
  const [selectedAddress, setSelectedAddress] = useState(1);

  const addresses = [
    {
      id: 1,
      type: "home",
      label: "Casa",
      address: "Calle 25 77517 Izamal, Yucatán",
      details: "Casa blanca con portón negro",
      icon: Home,
      isDefault: true,
    },
    {
      id: 2,
      type: "work",
      label: "Trabajo",
      address: "Av. Reforma 456, Col. Centro, Mérida",
      details: "Edificio azul, piso 3",
      icon: Briefcase,
      isDefault: false,
    },
    {
      id: 3,
      type: "other",
      label: "Casa de mamá",
      address: "Calle 42 #123, Col. García Ginerés, Mérida",
      details: "Portón café, timbre rojo",
      icon: MapPin,
      isDefault: false,
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
        <h2 className="font-bold text-lg text-gray-900">
          Direcciones guardadas
        </h2>
      </div>

      {/* Addresses List */}
      <div className="flex flex-col gap-4 mb-6">
        {addresses.map((address) => (
          <div
            key={address.id}
            className="bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100"
          >
            <div className="flex gap-4">
              {/* Icon */}
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <address.icon
                  className="w-6 h-6 text-amber-600"
                  strokeWidth={1.5}
                />
              </div>

              {/* Address Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {address.label}
                    </h3>
                    {address.isDefault && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        Predeterminada
                      </span>
                    )}
                  </div>
                  <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-1">{address.address}</p>
                <p className="text-xs text-gray-500">{address.details}</p>

                {/* Select Button */}
                <button
                  onClick={() => setSelectedAddress(address.id)}
                  className="flex items-center gap-2 mt-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedAddress === address.id
                        ? "border-amber-400 bg-amber-400"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedAddress === address.id && (
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    )}
                  </div>
                  <span>Usar esta dirección</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Address Button */}
      <button className="w-full bg-white border-2 border-dashed border-gray-300 text-gray-700 font-medium py-4 rounded-xl flex items-center justify-center gap-2 hover:border-amber-400 hover:text-amber-400 transition-colors">
        <Plus className="w-5 h-5" />
        <span>Agregar nueva dirección</span>
      </button>

      {/* Info Message */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs text-gray-600 leading-relaxed">
          <span className="font-semibold text-gray-800">
            Entrega más rápida.
          </span>{" "}
          Guarda tus direcciones frecuentes para hacer pedidos más rápido y
          recibir mejores estimaciones de tiempo.
        </p>
      </div>
    </div>
  );
}
