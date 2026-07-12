import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/Layout/AppLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { OrdensServicoList } from "./pages/OrdensServico/OrdensServicoList";
import { OrdemServicoDetail } from "./pages/OrdensServico/OrdemServicoDetail";
import { NovaOS } from "./pages/OrdensServico/NovaOS";
import { ManutencoesPreventivas } from "./pages/ManutencoesPreventivas/ManutencoesPreventivas";
import { ClientesList } from "./pages/Clientes/ClientesList";
import { ClienteDetail } from "./pages/Clientes/ClienteDetail";
import { FuncionariosList } from "./pages/Funcionarios/FuncionariosList";
import { FuncionarioDesempenho } from "./pages/Funcionarios/FuncionarioDesempenho";
import { RotaFuncionario } from "./pages/Funcionarios/RotaFuncionario";
import { ResumoMensalFuncionario } from "./pages/Funcionarios/ResumoMensalFuncionario";
import { MinhaRota } from "./pages/Funcionarios/MinhaRota";
import { AcompanharOS } from "./pages/ClientePortal/AcompanharOS";
import { Configuracoes } from "./pages/Configuracoes";

function RotaProtegida({ children }: { children: React.ReactNode }) {
  const autenticado = Boolean(localStorage.getItem("token"));
  return autenticado ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/acompanhar/:id" element={<AcompanharOS />} />

      {/* Área interna (dono, gestor, técnico) */}
      <Route
        element={
          <RotaProtegida>
            <AppLayout />
          </RotaProtegida>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/minha-rota" element={<MinhaRota />} />
        <Route path="/ordens-servico" element={<OrdensServicoList />} />
        <Route path="/ordens-servico/nova" element={<NovaOS />} />
        <Route path="/ordens-servico/:id" element={<OrdemServicoDetail />} />
        <Route path="/manutencoes-preventivas" element={<ManutencoesPreventivas />} />
        <Route path="/clientes" element={<ClientesList />} />
        <Route path="/clientes/:id" element={<ClienteDetail />} />
        <Route path="/funcionarios" element={<FuncionariosList />} />
        <Route path="/funcionarios/:id" element={<FuncionarioDesempenho />} />
        <Route path="/funcionarios/:id/rota" element={<RotaFuncionario />} />
        <Route path="/funcionarios/:id/resumo" element={<ResumoMensalFuncionario />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Route>
    </Routes>
  );
}
