import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { OPCOES_STATUS, OrdemServico, StatusOS } from "../../types";

type Periodo = "todas" | "24h" | "7dias" | "15dias" | "30dias" | "personalizado";

const OPCOES_PERIODO: { chave: Periodo; rotulo: string }[] = [
  { chave: "todas", rotulo: "Qualquer período" },
  { chave: "24h", rotulo: "Últimas 24h" },
  { chave: "7dias", rotulo: "Última semana" },
  { chave: "15dias", rotulo: "Últimos 15 dias" },
  { chave: "30dias", rotulo: "Último mês" },
  { chave: "personalizado", rotulo: "Personalizado..." },
];

const DIAS_POR_PERIODO: Record<"24h" | "7dias" | "15dias" | "30dias", number> = {
  "24h": 1,
  "7dias": 7,
  "15dias": 15,
  "30dias": 30,
};

function dentroDoPeriodo(os: OrdemServico, periodo: Periodo, dataInicio: string, dataFim: string): boolean {
  if (periodo === "todas") return true;

  if (periodo === "personalizado") {
    if (!dataInicio && !dataFim) return true; // ainda não escolheu um intervalo
    const dataOS = new Date(os.dataAbertura).getTime();
    const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`).getTime() : -Infinity;
    const fim = dataFim ? new Date(`${dataFim}T23:59:59`).getTime() : Infinity;
    return dataOS >= inicio && dataOS <= fim;
  }

  const limiteMs = DIAS_POR_PERIODO[periodo] * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(os.dataAbertura).getTime() <= limiteMs;
}

function tempoRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutos = Math.floor(diffMs / 60_000);
  const horas = Math.floor(diffMs / 3_600_000);
  const dias = Math.floor(diffMs / 86_400_000);

  if (minutos < 1) return "agora mesmo";
  if (minutos < 60) return `há ${minutos} min`;
  if (horas < 24) return `há ${horas}h`;
  if (dias < 30) return `há ${dias} dia${dias > 1 ? "s" : ""}`;
  const meses = Math.floor(dias / 30);
  return `há ${meses} ${meses > 1 ? "meses" : "mês"}`;
}

const ABAS_STATUS: { chave: StatusOS | "todos"; rotulo: string }[] = [
  { chave: "todos", rotulo: "Todos" },
  ...OPCOES_STATUS.map((op) => ({ chave: op.status, rotulo: op.rotulo })),
];

export function OrdensServicoList() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [statusFiltro, setStatusFiltro] = useState<StatusOS | "todos">("todos");
  const [periodo, setPeriodo] = useState<Periodo>("todas");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    api.get("/ordens-servico").then((r) => setOrdens(r.data)).catch(() => {});
  }, []);

  const contagemPorStatus = useMemo(() => {
    const contagem = {} as Record<StatusOS | "todos", number>;
    ABAS_STATUS.forEach((aba) => {
      contagem[aba.chave] =
        aba.chave === "todos" ? ordens.length : ordens.filter((o) => o.statusAtual === aba.chave).length;
    });
    return contagem;
  }, [ordens]);

  const ordensFiltradas = ordens
    .filter((o) => statusFiltro === "todos" || o.statusAtual === statusFiltro)
    .filter((o) => dentroDoPeriodo(o, periodo, dataInicio, dataFim))
    .filter((o) => {
      if (!busca.trim()) return true;
      const termo = busca.trim().toLowerCase();
      return (
        o.cliente.nome.toLowerCase().includes(termo) ||
        String(o.numero).includes(termo) ||
        o.equipamento.tipo.toLowerCase().includes(termo)
      );
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-grafite-900">Ordens de serviço</h1>
        <Link
          to="/ordens-servico/nova"
          className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md px-4 py-2 transition-colors"
        >
          + Nova OS
        </Link>
      </div>

      <div className="flex items-center gap-1 border-b border-grafite-200 overflow-x-auto">
        {ABAS_STATUS.map((aba) => (
          <button
            key={aba.chave}
            onClick={() => setStatusFiltro(aba.chave)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              statusFiltro === aba.chave
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-grafite-500 hover:text-grafite-900"
            }`}
          >
            {aba.rotulo}
            <span
              className={`codigo text-[11px] px-1.5 rounded-full ${
                statusFiltro === aba.chave ? "bg-teal-100 text-teal-700" : "bg-grafite-100 text-grafite-500"
              }`}
            >
              {contagemPorStatus[aba.chave]}
            </span>
          </button>
        ))}
      </div>

      {periodo === "personalizado" && (
        <div className="flex items-center gap-3 bg-grafite-50 border border-grafite-200 rounded-md px-4 py-3">
          <label className="text-xs text-grafite-600 flex items-center gap-2">
            De
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="border border-grafite-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </label>
          <label className="text-xs text-grafite-600 flex items-center gap-2">
            Até
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="border border-grafite-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </label>
          {(dataInicio || dataFim) && (
            <button
              onClick={() => {
                setDataInicio("");
                setDataFim("");
              }}
              className="text-xs text-teal-700 hover:text-teal-800 font-medium"
            >
              Limpar
            </button>
          )}
          {!dataInicio && !dataFim && (
            <span className="text-xs text-grafite-500">Escolha um período pra filtrar.</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Buscar por cliente, nº da OS ou equipamento..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 border border-grafite-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as Periodo)}
          className="border border-grafite-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[180px]"
        >
          {OPCOES_PERIODO.map((op) => (
            <option key={op.chave} value={op.chave}>
              {op.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-grafite-200 rounded-lg divide-y divide-grafite-100">
        {ordensFiltradas.map((os) => (
          <Link
            key={os.id}
            to={`/ordens-servico/${os.id}`}
            className="flex items-center justify-between px-5 py-4 hover:bg-grafite-50"
          >
            <div>
              <p className="text-sm text-grafite-900">
                <span className="codigo text-grafite-500">#{os.numero}</span> {os.cliente.nome}
              </p>
              <p className="text-xs text-grafite-500 mt-0.5">
                {os.equipamento.tipo} — {os.descricaoProblema}
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <span className="text-xs codigo text-teal-700">{os.statusAtual}</span>
              <p className="text-[11px] text-grafite-400 mt-0.5" title={new Date(os.dataAbertura).toLocaleString("pt-BR")}>
                {tempoRelativo(os.dataAbertura)}
              </p>
            </div>
          </Link>
        ))}
        {ordensFiltradas.length === 0 && (
          <p className="text-sm text-grafite-500 px-5 py-4">
            {ordens.length === 0
              ? "Nenhuma ordem de serviço cadastrada."
              : "Nenhuma OS encontrada com esses filtros."}
          </p>
        )}
      </div>
    </div>
  );
}
