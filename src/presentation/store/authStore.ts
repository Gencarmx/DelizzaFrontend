import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authService } from "@infrastructure/services/authService";
import type {
  User,
  RegisterData,
  LoginData,
} from "@infrastructure/services/authService";

interface AuthState {
  user: User | null;
  token: string | null;
  status: "unauthenticated" | "pending_verification" | "authenticated";
  tempPhone: string | null; // Used during registration flow before verification
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      status: "unauthenticated",
      tempPhone: null,

      login: async (data: LoginData) => {
        try {
          const response = await authService.login(data);
          set({
            user: response.user,
            token: response.token,
            status: "authenticated",
            tempPhone: null,
          });
        } catch (error) {
          console.error("Login failed:", error);
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        try {
          const user = await authService.register(data);
          set({
            user: user, // User exists but no token yet
            status: "pending_verification",
            tempPhone: data.phone,
          });
        } catch (error) {
          console.error("Registration failed:", error);
          throw error;
        }
      },

      verifyOtp: async (otp: string) => {
        const { tempPhone } = get();
        if (!tempPhone) {
          throw new Error("No phone number to verify");
        }
        try {
          const response = (await authService.verifyPhone({
            phone: tempPhone,
            otp,
          })) as { user?: User; token?: string };

          if (response.token) {
            set({
              user: response.user || get().user,
              token: response.token,
              status: "authenticated",
              tempPhone: null,
            });
          } else {
            set({
              status: "authenticated",
              tempPhone: null,
            });
          }
        } catch (error) {
          console.error("OTP Verification failed:", error);
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          status: "unauthenticated",
          tempPhone: null,
        });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
