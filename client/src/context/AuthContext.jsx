import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("medvault_token");
    const storedUser = localStorage.getItem("medvault_user");

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("medvault_token");
        localStorage.removeItem("medvault_user");
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    // Warm up API first to reduce cold-start failures on free hosting.
    try {
      await authAPI.healthCheck();
    } catch {
      // Continue to login attempt; retry block below handles transient failures.
    }

    const isTransientError = (err) => {
      const status = err?.response?.status;
      return err?.code === "ERR_NETWORK" || status === 502 || status === 503 || status === 504;
    };

    let response;
    try {
      response = await authAPI.login({ email, password });
    } catch (err) {
      if (!isTransientError(err)) throw err;
      await new Promise((resolve) => setTimeout(resolve, 4000));
      response = await authAPI.login({ email, password });
    }

    const { data } = response;
    localStorage.setItem("medvault_token", data.token);
    localStorage.setItem("medvault_user", JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (userData) => {
    const { data } = await authAPI.register(userData);
    localStorage.setItem("medvault_token", data.token);
    localStorage.setItem("medvault_user", JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("medvault_token");
    localStorage.removeItem("medvault_user");
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authAPI.getMe();
      localStorage.setItem("medvault_user", JSON.stringify(data.user));
      setUser(data.user);
    } catch {
      logout();
    }
  }, [logout]);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isCHOAdmin: user?.role === "cho_admin",
    isStaff: user?.role === "barangay_staff",
    isCHOMonitor: user?.role === "cho_monitor",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
