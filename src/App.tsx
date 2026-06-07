import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { AuthGateProvider } from "@/hooks/use-auth-gate";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import RulesStudio from "./pages/RulesStudio";
import SimulationLab from "./pages/SimulationLab";
import Analytics from "./pages/Analytics";
import Operations from "./pages/Operations";
import Settings from "./pages/Settings";
import ApiDocs from "./pages/ApiDocs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthGateProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/cases" element={<Cases />} />
              <Route path="/cases/:id" element={<CaseDetail />} />
              <Route path="/rules" element={<RulesStudio />} />
              <Route path="/simulation" element={<SimulationLab />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/operations" element={<Operations />} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/api-docs" element={<ApiDocs />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthGateProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
