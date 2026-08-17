import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plus, Search, UserRound } from "lucide-react";
import { api } from "../../services/api";
import { usuarioLogado } from "../../services/auth";
import { OrdemServico, StatusOS } from "../../types";
import { useEtapasStatus } from "../../hooks/useEtapasStatus";
import { tempoRelativo, formatarNumeroOS } from "../../utils/formatters";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { Card } from "../../components/shadcn/card";
import { Button } from "../../components/shadcn/button";
import { Badge } from "../../components/shadcn/badge";
import { Input } from "../../components/shadcn/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/shadcn/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/shadcn/select";

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

export function OrdensServicoList() {
  const { opcoes } = useEtapasStatus();
  const abasStatus = useMemo<{ chave: StatusOS | "todos"; rotulo: string }[]>(
    () => [
      { chave: "todos", rotulo: "Todos" },
      ...opcoes.map((op) => ({ chave: op.status, rotulo: op.rotulo })),
    ],
    [opcoes]
  );

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
    abasStatus.forEach((aba) => {
      contagem[aba.chave] =
        aba.chave === "todos" ? ordens.length : ordens.filter((o) => o.statusAtual === aba.chave).length;
    });
    return contagem;
  }, [ordens, abasStatus]);

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
        formatarNumeroOS(o.numero),
        o.equipamento.tipo,
        o.funcionario?.usuario?.nome,
      ]
        .filter(Boolean)
        .some((campo) => normalizar(campo as string).includes(termo));
    });

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Ordens de serviço"
        subtitulo="Acompanhe e gerencie os chamados técnicos."
        acoes={
          podeAbrirChamado ? (
            <Button asChild>
              <Link to="/ordens-servico/nova">
                <Plus />
                Nova OS
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
        {abasStatus.map((aba) => (
          <button
            key={aba.chave}
            onClick={() => setStatusFiltro(aba.chave)}
            className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              statusFiltro === aba.chave
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {aba.rotulo}
            <Badge variant="secondary" className="h-4 px-1.5 text-[11px]">
              {contagemPorStatus[aba.chave]}
            </Badge>
          </button>
        ))}
      </div>

      {periodo === "personalizado" && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted px-4 py-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            De
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-auto"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Até
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-auto"
            />
          </label>
          {(dataInicio || dataFim) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDataInicio("");
                setDataFim("");
              }}
            >
              Limpar
            </Button>
          )}
          {!dataInicio && !dataFim && (
            <span className="text-xs text-muted-foreground">Escolha um período pra filtrar.</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por cliente, nº da OS ou equipamento..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={funcionarioFiltro || "TODOS"}
          onValueChange={(v) => setFuncionarioFiltro(v === "TODOS" ? "" : v)}
        >
          <SelectTrigger className="w-auto min-w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os técnicos</SelectItem>
            {tecnicos.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
          <SelectTrigger className="w-auto min-w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPCOES_PERIODO.map((op) => (
              <SelectItem key={op.chave} value={op.chave}>
                {op.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="px-5 text-xs font-medium text-muted-foreground">
                Ordem
              </TableHead>
              <TableHead className="px-5 text-xs font-medium text-muted-foreground">
                Problema
              </TableHead>
              <TableHead className="px-5 text-xs font-medium text-muted-foreground">
                Técnico
              </TableHead>
              <TableHead className="px-5 text-xs font-medium text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="px-5 text-right text-xs font-medium text-muted-foreground">
                <span className="sr-only">Detalhes</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando && (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell colSpan={5} className="px-5 py-4 text-sm text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!carregando &&
              ordensFiltradas.map((os) => (
                <TableRow key={os.id} className="group border-border hover:bg-muted/50">
                  <TableCell className="px-5 py-4">
                    <Link
                      to={`/ordens-servico/${os.id}`}
                      className="flex min-w-0 flex-col gap-1"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge variant="secondary" className="codigo shrink-0">
                          #{formatarNumeroOS(os.numero)}
                        </Badge>
                        <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                          {os.cliente.nome}
                        </span>
                      </div>
                      <span className="truncate text-xs text-muted-foreground">
                        {os.equipamento.tipo}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-muted-foreground">
                    <span className="line-clamp-1">{os.descricaoProblema}</span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    {os.funcionario?.usuario?.nome ? (
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <UserRound size={12} className="shrink-0 text-muted-foreground" />
                        {os.funcionario.usuario.nome}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <UserRound size={12} className="shrink-0" />
                        Sem técnico atribuído
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <StatusBadge status={os.statusAtual} />
                    <p
                      className="mt-1 text-[11px] text-muted-foreground"
                      title={new Date(os.dataAbertura).toLocaleString("pt-BR")}
                    >
                      {tempoRelativo(os.dataAbertura)}
                    </p>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right">
                    <Link
                      to={`/ordens-servico/${os.id}`}
                      aria-label="Ver ordem de serviço"
                      className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            {!carregando && ordensFiltradas.length === 0 && (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell colSpan={5} className="px-5 py-4 text-sm text-muted-foreground">
                  {ordens.length === 0
                    ? "Nenhuma ordem de serviço cadastrada."
                    : "Nenhuma OS encontrada com esses filtros."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
