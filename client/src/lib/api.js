import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("medvault_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("medvault_token");
      localStorage.removeItem("medvault_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  getMe: () => api.get("/auth/me"),
  changePassword: (data) => api.put("/auth/change-password", data),
  getHealthCenters: () => api.get("/auth/health-centers"),
};

// Medicine API
export const medicineAPI = {
  getAll: (params) => api.get("/medicines", { params }),
  getById: (id) => api.get(`/medicines/${id}`),
  getStats: (params) => api.get("/medicines/stats", { params }),
  create: (data) => api.post("/medicines", data),
  update: (id, data) => api.put(`/medicines/${id}`, data),
  adjustStock: (id, data) => api.patch(`/medicines/${id}/stock`, data),
  dispenseByQR: (data) => api.post("/medicines/dispense/qr", data),
  remove: (id) => api.delete(`/medicines/${id}`),
};

// Alert API
export const alertAPI = {
  getAll: (params) => api.get("/alerts", { params }),
  getUnreadCount: () => api.get("/alerts/unread-count"),
  markAsRead: (id) => api.patch(`/alerts/${id}/read`),
  markAllAsRead: () => api.patch("/alerts/read-all"),
};

// User API
export const userAPI = {
  getAll: (params) => api.get("/users", { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  toggleStatus: (id) => api.patch(`/users/${id}/toggle-status`),
  createHealthCenter: (data) => api.post("/users/health-centers", data),
};

// Report API
export const reportAPI = {
  generatePDF: (params) =>
    api.get("/reports/inventory-pdf", { params, responseType: "blob" }),
  generateLogsPDF: (params) =>
    api.get("/reports/logs-pdf", { params, responseType: "blob" }),
  getAuditLogs: (params) => api.get("/reports/audit-logs", { params }),
  getDispensingHistory: (params) => api.get("/reports/dispensing-history", { params }),
  getForecast60Day: (params) => api.get("/reports/forecast-60-day", { params }),
};

export default api;
