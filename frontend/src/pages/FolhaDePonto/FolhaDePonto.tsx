import { useEffect, useMemo, useState } from "react";
import { Clock, LogIn, LogOut } from "lucide-react";
import { api } from "../../services/api";
import { PageHeader } from "../../components/ui/PageHeader";
import { usuarioLogado } from "../../services/auth";
import { Funcionario, RegistroPonto } from "../../types";

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Duração entre entrada e saída (ou "em andamento" se ainda aberto).
function duracao(entrada: string, saida: string | null): string {
  const fim = saida ? new Date(saida).getTime() : Date.now();
  const min = Math.max(0, Math.round((fim - new Date(entrada).getTime()) / 60000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m}min`;
}

export function FolhaDePonto() {
  const usuario = usuarioLogado();
  const podeConsolidar = usuario?.papel === "DONO" || usuario?.papel === "GESTOR";

  const [atual, setAtual] = useState<RegistroPonto | null>(null);
  const [meus, setMeus] = useState<RegistroPonto[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // visão consolidada (gerente/dono)
  const [consolidado, setConsolidado] = useState<RegistroPonto[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [filtroFuncionario, setFiltroFuncionario] = useState("");

  function carregarMeus() {
    api.get("/ponto/atual").then((r) => setAtual(r.data)).catch(() => {});
    api.get("/ponto/meus").then((r) => setMeus(r.data)).catch(() => {});
  }

  function carregarConsolidado() {
    const params = filtroFuncionario ? `?funcionarioId=${filtroFuncionario}` : "";
    api.get(`/ponto${params}`).then((r) => setConsolidado(r.data)).catch(() => {});
  }

  useEffect(carregarMeus, []);
  useEffect(() => {
    if (podeConsolidar) {
      api.get("/funcionarios").then((r) => setFuncionarios(r.data)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (podeConsolidar) carregarConsolidado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroFuncionario]);

  async function baterPonto() {
    setErro(null);
    setEnviando(true);
    try {
      await api.post(`/ponto/${atual ? "saida" : "entrada"}`);
      carregarMeus();
      if (podeConsolidar) carregarConsolidado();
    } catch (err: any) {
      setErro(err?.response?.data?.erro ?? "Não foi possível registrar o ponto. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const horasHoje = useMemo(() => {
    const hoje = new Date().toDateString();
    const min = meus
      .filter((r) => new Date(r.entrada).toDateString() === hoje)
      .reduce((acc, r) => {
        const fim = r.saida ? new Date(r.saida).getTime() : Date.now();
        return acc + Math.max(0, (fim - new Date(r.entrada).getTime()) / 60000);
      }, 0);
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m}min`;
  }, [meus]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Folha de ponto"
        subtitulo="Registre sua entrada e saída e acompanhe suas horas."
      />

      {/* Cartão de bater ponto */}
      <div className="bg-white border border-grafite-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              atual ? "bg-status-reparo/10 text-status-reparo" : "bg-grafite-100 text-grafite-500"
            }`}
          >
            <Clock size={20} />
          </div>
          <div>
            <p className="text-sm font-medium text-grafite-900">
              {atual ? "Turno em andamento" : "Fora do expediente"}
            </p>
            <p className="text-xs text-grafite-500">
              {atual
                ? `Entrada às ${formatarDataHora(atual.entrada)} · ${duracao(atual.entrada, null)}`
                : `Horas hoje: ${horasHoje}`}
            </p>
          </div>
        </div>
        <button
          onClick={baterPonto}
          disabled={enviando}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 ${
            atual ? "bg-status-cancelado hover:opacity-90" : "bg-teal-600 hover:bg-teal-700"
          }`}
        >
          {atual ? <LogOut size={16} /> : <LogIn size={16} />}
          {enviando ? "Registrando..." : atual ? "Registrar saída" : "Registrar entrada"}
        </button>
      </div>
      {erro && <p className="text-sm text-red-500">{erro}</p>}

      {/* Meus registros */}
      <div className="bg-white border border-grafite-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-grafite-200">
          <h2 className="text-sm font-medium text-grafite-900">Meus registros</h2>
        </div>
        {meus.length === 0 ? (
          <p className="px-5 py-6 text-sm text-grafite-400">Nenhum registro de ponto ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-grafite-500 border-b border-grafite-100">
                <th className="px-5 py-2 font-medium">Entrada</th>
                <th className="px-5 py-2 font-medium">Saída</th>
                <th className="px-5 py-2 font-medium">Duração</th>
              </tr>
            </thead>
            <tbody>
              {meus.map((r) => (
                <tr key={r.id} className="border-b border-grafite-50 last:border-0">
                  <td className="px-5 py-2.5 text-grafite-900">{formatarDataHora(r.entrada)}</td>
                  <td className="px-5 py-2.5 text-grafite-600">
                    {r.saida ? formatarDataHora(r.saida) : <span className="text-status-reparo">em andamento</span>}
                  </td>
                  <td className="px-5 py-2.5 codigo text-grafite-700">{duracao(r.entrada, r.saida)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Visão consolidada — gerente/dono */}
      {podeConsolidar && (
        <div className="bg-white border border-grafite-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-grafite-200 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-grafite-900">Folha da equipe</h2>
            <select
              className="text-sm border border-grafite-200 rounded-md px-2 py-1.5 text-grafite-700"
              value={filtroFuncionario}
              onChange={(e) => setFiltroFuncionario(e.target.value)}
            >
              <option value="">Todos os funcionários</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.usuario.nome}
                </option>
              ))}
            </select>
          </div>
          {consolidado.length === 0 ? (
            <p className="px-5 py-6 text-sm text-grafite-400">Nenhum registro no período.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-grafite-500 border-b border-grafite-100">
                  <th className="px-5 py-2 font-medium">Funcionário</th>
                  <th className="px-5 py-2 font-medium">Entrada</th>
                  <th className="px-5 py-2 font-medium">Saída</th>
                  <th className="px-5 py-2 font-medium">Duração</th>
                </tr>
              </thead>
              <tbody>
                {consolidado.map((r) => (
                  <tr key={r.id} className="border-b border-grafite-50 last:border-0">
                    <td className="px-5 py-2.5 text-grafite-900">
                      {r.funcionario?.usuario.nome ?? "—"}
                    </td>
                    <td className="px-5 py-2.5 text-grafite-600">{formatarDataHora(r.entrada)}</td>
                    <td className="px-5 py-2.5 text-grafite-600">
                      {r.saida ? formatarDataHora(r.saida) : <span className="text-status-reparo">em andamento</span>}
                    </td>
                    <td className="px-5 py-2.5 codigo text-grafite-700">{duracao(r.entrada, r.saida)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
