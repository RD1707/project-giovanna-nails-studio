import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientReport from "./pages/ClientReport";
import Services from "./pages/Services";
import Schedule from "./pages/Schedule";
import DailyCash from "./pages/DailyCash";
import FinancialEntries from "./pages/FinancialEntries";
import BillsToPay from "./pages/BillsToPay";
import MonthlyReport from "./pages/MonthlyReport";
import Tasks from "./pages/Tasks";
import Notifications from "./pages/Notifications";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
            <Route path="/clientes" element={<ProtectedPage><Clients /></ProtectedPage>} />
            <Route path="/cliente/:id/relatorio" element={<ProtectedPage><ClientReport /></ProtectedPage>} />
            <Route path="/servicos" element={<ProtectedPage><Services /></ProtectedPage>} />
            <Route path="/agenda" element={<ProtectedPage><Schedule /></ProtectedPage>} />
            <Route path="/caixa-diario" element={<ProtectedPage><DailyCash /></ProtectedPage>} />
            <Route path="/lancamentos" element={<ProtectedPage><FinancialEntries /></ProtectedPage>} />
            <Route path="/contas-a-pagar" element={<ProtectedPage><BillsToPay /></ProtectedPage>} />
            <Route path="/relatorio" element={<ProtectedPage><MonthlyReport /></ProtectedPage>} />
            <Route path="/tarefas" element={<ProtectedPage><Tasks /></ProtectedPage>} />
            <Route path="/notificacoes" element={<ProtectedPage><Notifications /></ProtectedPage>} />
            <Route path="/configuracoes" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
