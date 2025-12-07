import axios from "axios";
import { useAuthStore } from "@presentation/store/authStore";

// TODO: Replace with actual environment variable or config
const BASE_URL = "http://localhost:3000";

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle global errors here (e.g., 401 Unauthorized)
    if (error.response && error.response.status === 401) {
      // specific logic for 401
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
