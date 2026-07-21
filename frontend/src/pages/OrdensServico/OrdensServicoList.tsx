import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plus, UserRound } from "lucide-react";
import { api } from "../../services/api";
import { usuarioLogado } from "../../services/auth";
import { OPCOES_STATUS, OrdemServico, StatusOS } from "../../types";
import { tempoRelativo } from "../../utils/formatters";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/Badge";
import { classeBotao } from "../../components/ui/Button";
import { HospitalLogo } from "../../components/ui/HospitalLogo";

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

function normalizar(texto: string) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const ABAS_STATUS: { chave: StatusOS | "todos"; rotulo: string }[] = [
  { chave: "todos", rotulo: "Todos" },
  ...OPCOES_STATUS.map((op) => ({ chave: op.status, rotulo: op.rotulo })),
];

export function OrdensServicoList() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [statusFiltro, setStatusFiltro] = useState<StatusOS | "todos">("todos");
  const [periodo, setPeriodo] = useState<Periodo>("todas");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [busca, setBusca] = useState("");
  const [funcionarioFiltro, setFuncionarioFiltro] = useState("");

  useEffect(() => {
    setCarregando(true);
    api.get("/ordens-servico").then((r) => setOrdens(r.data)).catch(() => {}).finally(() => setCarregando(false));
  }, []);

  // Abertura de chamado é função do Suporte (N2) para cima — o técnico (N1)
  // apenas preenche os chamados que recebe, então não vê o botão "Nova OS".
  const podeAbrirChamado = usuarioLogado()?.papel !== "TECNICO";

  const contagemPorStatus = useMemo(() => {
    const contagem = {} as Record<StatusOS | "todos", number>;
    ABAS_STATUS.forEach((aba) => {
      contagem[aba.chave] =
        aba.chave === "todos" ? ordens.length : ordens.filter((o) => o.statusAtual === aba.chave).length;
    });
    return contagem;
  }, [ordens]);

  const tecnicos = useMemo(() => {
    const mapa = new Map<string, string>();
    ordens.forEach((o) => {
      if (o.funcionario?.id && o.funcionario.usuario?.nome) {
        mapa.set(o.funcionario.id, o.funcionario.usuario.nome);
      }
    });
    return [...mapa.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [ordens]);

  const ordensFiltradas = ordens
    .filter((o) => statusFiltro === "todos" || o.statusAtual === statusFiltro)
    .filter((o) => !funcionarioFiltro || o.funcionario?.id === funcionarioFiltro)
    .filter((o) => dentroDoPeriodo(o, periodo, dataInicio, dataFim))
    .filter((o) => {
      const termo = normalizar(busca.trim());
      if (!termo) return true;
      return [
        o.cliente.nome,
        `#${o.numero}`,
        String(o.numero),
        o.equipamento.tipo,
        o.funcionario?.usuario?.nome,
      ]
        .filter(Boolean)
        .some((campo) => normalizar(campo as string).includes(termo));
    });

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Ordens de serviço"
        subtitulo="Acompanhe e gerencie os chamados técnicos."
        acoes={
          podeAbrirChamado ? (
            <Link to="/ordens-servico/nova" className={classeBotao("primary")}>
              <Plus size={16} />
              Nova OS
            </Link>
          ) : undefined
        }
      />

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
        <div className="flex items-center gap-3 bg-grafite-50 border border-grafite-100 rounded-xl px-4 py-3">
          <label className="text-xs text-grafite-600 flex items-center gap-2">
            De
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="input-base w-auto py-1.5"
            />
          </label>
          <label className="text-xs text-grafite-600 flex items-center gap-2">
            Até
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="input-base w-auto py-1.5"
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
          className="input-base flex-1"
        />
        <select
          value={funcionarioFiltro}
          onChange={(e) => setFuncionarioFiltro(e.target.value)}
          className="input-base w-auto min-w-[180px]"
        >
          <option value="">Todos os técnicos</option>
          {tecnicos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as Periodo)}
          className="input-base w-auto min-w-[180px]"
        >
          {OPCOES_PERIODO.map((op) => (
            <option key={op.chave} value={op.chave}>
              {op.rotulo}
            </option>
          ))}
        </select>
      </div>

      {carregando && (
        <Card className="px-5 py-4 text-sm text-grafite-500">Carregando...</Card>
      )}

      {!carregando && ordensFiltradas.length > 0 && (
        <div className="space-y-0.5">
          {ordensFiltradas.map((os) => (
            <Link
              key={os.id}
              to={`/ordens-servico/${os.id}`}
              className="card group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:border-grafite-300"
            >
              <div className="flex min-w-0 items-center gap-3">
                <HospitalLogo nome={os.cliente.nome} size={40} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="codigo flex-shrink-0 rounded-full bg-grafite-100 px-2 py-0.5 text-[11px] font-medium text-grafite-600">
                      #{os.numero}
                    </span>
                    <p className="truncate text-sm font-semibold text-grafite-900">{os.cliente.nome}</p>
                  </div>
                  <p className="text-xs text-grafite-500 mt-0.5 truncate">
                    {os.equipamento.tipo} — {os.descricaoProblema}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] truncate">
                    <UserRound size={12} className="flex-shrink-0 text-grafite-400" />
                    {os.funcionario?.usuario?.nome ? (
                      <span className="font-medium text-grafite-700">{os.funcionario.usuario.nome}</span>
                    ) : (
                      <span className="text-grafite-400">Sem técnico atribuído</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                <div className="text-right">
                  <StatusBadge status={os.statusAtual} />
                  <p className="text-[11px] text-grafite-400 mt-1" title={new Date(os.dataAbertura).toLocaleString("pt-BR")}>
                    {tempoRelativo(os.dataAbertura)}
                  </p>
                </div>
                <ChevronRight size={16} className="text-grafite-300 transition-colors group-hover:text-grafite-500" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {!carregando && ordensFiltradas.length === 0 && (
        <Card className="px-5 py-4 text-sm text-grafite-500">
          {ordens.length === 0
            ? "Nenhuma ordem de serviço cadastrada."
            : "Nenhuma OS encontrada com esses filtros."}
        </Card>
      )}
    </div>
  );
}
