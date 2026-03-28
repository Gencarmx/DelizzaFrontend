import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { addressService, type Address } from "@core/services/addressService";
import { useAuth } from "./AuthContext";

interface AddressContextType {
  selectedAddress: Address | null;
  addresses: Address[];
  loading: boolean;
  setSelectedAddress: (address: Address | null) => void;
  refreshAddresses: () => Promise<void>;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

export function AddressProvider({ children }: { children: ReactNode }) {
  const { user, profileId } = useAuth();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Flag de cancelación: evita que setters de estado se ejecuten si el usuario
    // cambia (logout / login) mientras la carga asíncrona está en vuelo,
    // previniendo que datos de una sesión anterior contaminen la nueva.
    let cancelled = false;

    const loadAddresses = async () => {
      if (!user || !profileId) {
        setAddresses([]);
        setSelectedAddress(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // profileId ya está resuelto por AuthContext — no es necesario re-consultar profiles
        const userAddresses = await addressService.getAddressesByProfileId(profileId);

        if (cancelled) return;

        setAddresses(userAddresses);

        const defaultAddress = userAddresses.find(addr => addr.is_default);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress);
        } else if (userAddresses.length > 0) {
          setSelectedAddress(userAddresses[0]);
        }
      } catch (error) {
        if (!cancelled) console.error("Error loading addresses:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAddresses();

    return () => {
      cancelled = true;
    };
  }, [user, profileId]);

  const refreshAddresses = async () => {
    // Re-fetch directo sin flag de cancelación — se llama explícitamente por el usuario.
    if (!user || !profileId) return;
    try {
      setLoading(true);
      // profileId ya está resuelto por AuthContext — no es necesario re-consultar profiles
      const userAddresses = await addressService.getAddressesByProfileId(profileId);
      setAddresses(userAddresses);

      const defaultAddress = userAddresses.find(addr => addr.is_default);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      } else if (userAddresses.length > 0) {
        setSelectedAddress(userAddresses[0]);
      }
    } catch (error) {
      console.error("Error refreshing addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AddressContext.Provider
      value={{
        selectedAddress,
        addresses,
        loading,
        setSelectedAddress,
        refreshAddresses,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
}

export function useAddress() {
  const context = useContext(AddressContext);
  if (context === undefined) {
    throw new Error("useAddress must be used within an AddressProvider");
  }
  return context;
}
