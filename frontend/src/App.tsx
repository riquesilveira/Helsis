import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/Layout/AppLayout";
import { Login } from "./pages/Login";
import { usuarioLogado } from "./services/auth";

// Login e AppLayout ficam no bundle inicial (são o caminho crítico do primeiro
// paint). As demais páginas entram por code-splitting (lazy) — cada rota vira
// um chunk separado, carregado só quando o usuário navega até ela. Isso derruba
// o tamanho do bundle inicial, que passou de 500kB depois do recharts.
const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const OrdensServicoList = lazy(() =>
  import("./pages/OrdensServico/OrdensServicoList").then((m) => ({ default: m.OrdensServicoList }))
);
const OrdemServicoDetail = lazy(() =>
  import("./pages/OrdensServico/OrdemServicoDetail").then((m) => ({ default: m.OrdemServicoDetail }))
);
const NovaOS = lazy(() =>
  import("./pages/OrdensServico/NovaOS").then((m) => ({ default: m.NovaOS }))
);
const ManutencoesPreventivas = lazy(() =>
  import("./pages/ManutencoesPreventivas/ManutencoesPreventivas").then((m) => ({
    default: m.ManutencoesPreventivas,
  }))
);
const ClientesList = lazy(() =>
  import("./pages/Clientes/ClientesList").then((m) => ({ default: m.ClientesList }))
);
const ClienteDetail = lazy(() =>
  import("./pages/Clientes/ClienteDetail").then((m) => ({ default: m.ClienteDetail }))
);
const FuncionariosList = lazy(() =>
  import("./pages/Funcionarios/FuncionariosList").then((m) => ({ default: m.FuncionariosList }))
);
const FuncionarioDesempenho = lazy(() =>
  import("./pages/Funcionarios/FuncionarioDesempenho").then((m) => ({
    default: m.FuncionarioDesempenho,
  }))
);
const RotaFuncionario = lazy(() =>
  import("./pages/Funcionarios/RotaFuncionario").then((m) => ({ default: m.RotaFuncionario }))
);
const ResumoMensalFuncionario = lazy(() =>
  import("./pages/Funcionarios/ResumoMensalFuncionario").then((m) => ({
    default: m.ResumoMensalFuncionario,
  }))
);
const MinhaRota = lazy(() =>
  import("./pages/Funcionarios/MinhaRota").then((m) => ({ default: m.MinhaRota }))
);
const AcompanharOS = lazy(() =>
  import("./pages/ClientePortal/AcompanharOS").then((m) => ({ default: m.AcompanharOS }))
);
const Configuracoes = lazy(() =>
  import("./pages/Configuracoes").then((m) => ({ default: m.Configuracoes }))
);
const FolhaDePonto = lazy(() =>
  import("./pages/FolhaDePonto/FolhaDePonto").then((m) => ({ default: m.FolhaDePonto }))
);
const CatalogoDiagnostico = lazy(() =>
  import("./pages/Diagnostico/CatalogoDiagnostico").then((m) => ({
    default: m.CatalogoDiagnostico,
  }))
);
const ContratosList = lazy(() =>
  import("./pages/Contratos/ContratosList").then((m) => ({ default: m.ContratosList }))
);
const SemPermissao = lazy(() =>
  import("./pages/SemPermissao").then((m) => ({ default: m.SemPermissao }))
);

function RotaProtegida({ children }: { children: React.ReactNode }) {
  const autenticado = Boolean(localStorage.getItem("token"));
  return autenticado ? <>{children}</> : <Navigate to="/login" replace />;
}

function RotaProtegidaPorPapel({
  children,
  papeis,
}: {
  children: React.ReactNode;
  papeis: string[];
}) {
  const usuario = usuarioLogado();
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }
  if (!papeis.includes(usuario.papel)) {
    return <SemPermissao />;
  }
  return <>{children}</>;
}

// Fallback discreto enquanto o chunk da rota é baixado. Curto o suficiente pra
// não piscar em conexões rápidas, visível o bastante pra não parecer travado.
function CarregandoRota() {
  return (
    <div className="flex h-40 items-center justify-center">
      <p className="text-sm text-muted-foreground">Carregando…</p>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<CarregandoRota />}>
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
          <Route
            path="/minha-rota"
            element={
              <RotaProtegidaPorPapel papeis={["TECNICO"]}>
                <MinhaRota />
              </RotaProtegidaPorPapel>
            }
          />
          <Route path="/ordens-servico" element={<OrdensServicoList />} />
          <Route
            path="/ordens-servico/nova"
            element={
              <RotaProtegidaPorPapel papeis={["DONO", "GESTOR", "SUPORTE"]}>
                <NovaOS />
              </RotaProtegidaPorPapel>
            }
          />
          <Route path="/ordens-servico/:id" element={<OrdemServicoDetail />} />
          <Route path="/manutencoes-preventivas" element={<ManutencoesPreventivas />} />
          <Route path="/clientes" element={<ClientesList />} />
          <Route path="/clientes/:id" element={<ClienteDetail />} />
          <Route
            path="/funcionarios"
            element={
              <RotaProtegidaPorPapel papeis={["DONO", "GESTOR"]}>
                <FuncionariosList />
              </RotaProtegidaPorPapel>
            }
          />
          <Route
            path="/funcionarios/:id"
            element={
              <RotaProtegidaPorPapel papeis={["DONO", "GESTOR"]}>
                <FuncionarioDesempenho />
              </RotaProtegidaPorPapel>
            }
          />
          <Route
            path="/funcionarios/:id/rota"
            element={
              <RotaProtegidaPorPapel papeis={["DONO", "GESTOR"]}>
                <RotaFuncionario />
              </RotaProtegidaPorPapel>
            }
          />
          <Route
            path="/funcionarios/:id/resumo"
            element={
              <RotaProtegidaPorPapel papeis={["DONO", "GESTOR"]}>
                <ResumoMensalFuncionario />
              </RotaProtegidaPorPapel>
            }
          />
          <Route
            path="/folha-de-ponto"
            element={
              <RotaProtegidaPorPapel papeis={["DONO", "GESTOR", "SUPORTE", "TECNICO"]}>
                <FolhaDePonto />
              </RotaProtegidaPorPapel>
            }
          />
          <Route
            path="/catalogo-diagnostico"
            element={
              <RotaProtegidaPorPapel papeis={["DONO", "GESTOR"]}>
                <CatalogoDiagnostico />
              </RotaProtegidaPorPapel>
            }
          />
          <Route
            path="/contratos"
            element={
              <RotaProtegidaPorPapel papeis={["DONO", "GESTOR"]}>
                <ContratosList />
              </RotaProtegidaPorPapel>
            }
          />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
