import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Landing from "./pages/Landing.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import SGSST from "./pages/SGSST.tsx";
import Trabajadores from "./pages/Trabajadores.tsx";
import TrabajadorDetail from "./pages/TrabajadorDetail.tsx";
import Clientes from "./pages/Clientes.tsx";
import Portal from "./pages/Portal.tsx";
import NotFound from "./pages/NotFound.tsx";
import Accidentalidad from "./pages/Accidentalidad.tsx";
import Ausentismo from "./pages/Ausentismo.tsx";
import ExamenesMedicos from "./pages/ExamenesMedicos.tsx";
import Capacitaciones from "./pages/Capacitaciones.tsx";
import FirmaCapacitacion from "./pages/FirmaCapacitacion.tsx";
import Calendario from "./pages/Calendario.tsx";
import PlanAnual from "./pages/PlanAnual.tsx";
import MiEmpresa from "./pages/MiEmpresa.tsx";
import Inspecciones from "./pages/Inspecciones.tsx";
import Estadisticas from "./pages/Estadisticas.tsx";
import Proveedores from "./pages/Proveedores.tsx";
import Planes from "./pages/Planes.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth" element={<Navigate to="/login" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sgsst"
              element={
                <ProtectedRoute>
                  <SGSST />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trabajadores"
              element={
                <ProtectedRoute>
                  <Trabajadores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trabajadores/:id"
              element={
                <ProtectedRoute>
                  <TrabajadorDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clientes"
              element={
                <ProtectedRoute>
                  <Clientes />
                </ProtectedRoute>
              }
            />
            <Route path="/portal" element={<Portal />} />
            <Route
              path="/accidentalidad"
              element={
                <ProtectedRoute>
                  <Accidentalidad />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ausentismo"
              element={
                <ProtectedRoute>
                  <Ausentismo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/examenes-medicos"
              element={
                <ProtectedRoute>
                  <ExamenesMedicos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/capacitaciones"
              element={
                <ProtectedRoute>
                  <Capacitaciones />
                </ProtectedRoute>
              }
            />
            <Route path="/firma" element={<FirmaCapacitacion />} />
            <Route
              path="/calendario"
              element={
                <ProtectedRoute>
                  <Calendario />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plan-anual"
              element={
                <ProtectedRoute>
                  <PlanAnual />
                </ProtectedRoute>
              }
            />
            <Route
              path="/empresa"
              element={
                <ProtectedRoute>
                  <MiEmpresa />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspecciones"
              element={
                <ProtectedRoute>
                  <Inspecciones />
                </ProtectedRoute>
              }
            />
            <Route
              path="/estadisticas"
              element={
                <ProtectedRoute>
                  <Estadisticas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/proveedores"
              element={
                <ProtectedRoute>
                  <Proveedores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planes"
              element={
                <ProtectedRoute>
                  <Planes />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
