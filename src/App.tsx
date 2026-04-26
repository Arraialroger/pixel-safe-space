import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Propostas from "./pages/Propostas";
import PropostaNova from "./pages/PropostaNova";
import Contratos from "./pages/Contratos";
import ContratoDetalhe from "./pages/ContratoDetalhe";
import PropostaDetalhe from "./pages/PropostaDetalhe";
import PropostaPublica from "./pages/PropostaPublica";
import ContratoPublico from "./pages/ContratoPublico";
import Cofre from "./pages/Cofre";
import Clientes from "./pages/Clientes";
import Configuracoes from "./pages/Configuracoes";
import ConfiguracoesWorkspace from "./pages/ConfiguracoesWorkspace";
import Assinatura from "./pages/Assinatura";
import AssinaturaFaturas from "./pages/AssinaturaFaturas";
import NotFound from "./pages/NotFound";
import Install from "./pages/Install";
import Acordos from "./pages/Acordos";
import AcordoNovo from "./pages/AcordoNovo";
import AcordoDetalhe from "./pages/AcordoDetalhe";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
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
                path="/propostas/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout><PropostaDetalhe /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contratos"
                element={
                  <ProtectedRoute>
                    <AppLayout><Contratos /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contratos/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout><ContratoDetalhe /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cofre"
                element={
                  <ProtectedRoute>
                    <AppLayout><Cofre /></AppLayout>
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
              <Route
                path="/assinatura"
                element={
                  <ProtectedRoute>
                    <AppLayout><Assinatura /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assinatura/faturas"
                element={
                  <ProtectedRoute>
                    <AppLayout><AssinaturaFaturas /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/acordos"
                element={
                  <ProtectedRoute>
                    <AppLayout><Acordos /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/acordos/novo"
                element={
                  <ProtectedRoute>
                    <AppLayout><AcordoNovo /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/acordos/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout><AcordoDetalhe /></AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/install" element={<Install />} />
              <Route path="/p/:id" element={<PropostaPublica />} />
              <Route path="/c/:id" element={<ContratoPublico />} />
              <Route
                path="*"
                element={
                  <ProtectedRoute>
                    <AppLayout><NotFound /></AppLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
