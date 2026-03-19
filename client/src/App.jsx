import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import InventoryPage from "@/pages/InventoryPage";
import ScannerPage from "@/pages/ScannerPage";
import AlertsPage from "@/pages/AlertsPage";
import ReportsPage from "@/pages/ReportsPage";
import LogsPage from "@/pages/LogsPage";
import UsersPage from "@/pages/UsersPage";

function OversightRoute({ children }) {
  const { isCHOAdmin, isCHOMonitor } = useAuth();
  return isCHOAdmin || isCHOMonitor ? children : <Navigate to="/dashboard" replace />;
}

function AdminRoute({ children }) {
  const { isCHOAdmin } = useAuth();
  return isCHOAdmin ? children : <Navigate to="/dashboard" replace />;
}

function ScannerRoute({ children }) {
  const { isCHOMonitor } = useAuth();
  return !isCHOMonitor ? children : <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/scanner" element={<ScannerRoute><ScannerPage /></ScannerRoute>} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/reports" element={<OversightRoute><ReportsPage /></OversightRoute>} />
            <Route path="/logs" element={<OversightRoute><LogsPage /></OversightRoute>} />
            <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
