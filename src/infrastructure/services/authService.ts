import axiosClient from "../api/axiosClient";

export interface User {
  id: string;
  name: string;
  phone: string;
  // Add other user fields as needed
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegisterData {
  name: string;
  phone: string;
  password: string;
}

export interface LoginData {
  phone: string;
  password: string;
}

export interface VerifyPhoneData {
  phone: string;
  otp: string;
}

export const authService = {
  register: async (data: RegisterData): Promise<User> => {
    const response = await axiosClient.post<User>("/user", data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await axiosClient.post<AuthResponse>("/login", data);
    return response.data;
  },

  verifyPhone: async (data: VerifyPhoneData): Promise<User> => {
    const response = await axiosClient.post<User>("/verify-phone", data);
    return response.data;
  },
};
