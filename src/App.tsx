import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Propostas from "./pages/Propostas";
import PropostaNova from "./pages/PropostaNova";
import Clientes from "./pages/Clientes";
import Configuracoes from "./pages/Configuracoes";
import ConfiguracoesWorkspace from "./pages/ConfiguracoesWorkspace";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout><Index /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/propostas"
                element={
                  <ProtectedRoute>
                    <AppLayout><Propostas /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/propostas/nova"
                element={
                  <ProtectedRoute>
                    <AppLayout><PropostaNova /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clientes"
                element={
                  <ProtectedRoute>
                    <AppLayout><Clientes /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configuracoes"
                element={
                  <ProtectedRoute>
                    <AppLayout><Configuracoes /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configuracoes-workspace"
                element={
                  <ProtectedRoute>
                    <AppLayout><ConfiguracoesWorkspace /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
