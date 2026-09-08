import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { ChevronRight, ClipboardList, DollarSign, Receipt, Wallet, LucideIcon } from "lucide-react";
import { api } from "../services/api";
import { Funcionario, OrdemServico } from "../types";
import { formatarReais, tempoRelativo, formatarNumeroOS } from "../utils/formatters";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "../components/shadcn/card";
import { Badge } from "../components/shadcn/badge";
import { Button } from "../components/shadcn/button";
import { StatusBadge } from "../components/StatusBadge";
import { HospitalLogo } from "../components/HospitalLogo";
import { PageHeader } from "../components/PageHeader";

function mesmoMes(iso: string | null, data: Date) {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getMonth() === data.getMonth() && d.getFullYear() === data.getFullYear();
}

function valorPecas(os: OrdemServico) {
  return (os.pecasTrocadas ?? []).reduce((soma, p) => soma + (p.precoUnitario ?? 0) * p.quantidade, 0);
}

function valorTotal(os: OrdemServico) {
  return valorPecas(os) + (os.valorMaoDeObra ?? 0);
}

function custoDeslocamento(os: OrdemServico) {
  return (os.deslocamentos ?? []).reduce(
    (soma, d) => soma + (d.custoPassagem ?? 0) + (d.custoHospedagem ?? 0) + (d.custoAlimentacao ?? 0),
    0
  );
}

function somaPorCampo(ordens: OrdemServico[], campo: "custoPassagem" | "custoHospedagem" | "custoAlimentacao") {
  return ordens.reduce(
    (soma, o) => soma + (o.deslocamentos ?? []).reduce((s, d) => s + (d[campo] ?? 0), 0),
    0
  );
}

// Dados fictícios para DEMONSTRAÇÃO — usados só quando não há dados reais no
// período (ex: seed antigo). Determinísticos (sem Math.random, pra não "tremer"
// a cada render). Duas séries: este período (área) e o anterior (tracejado).
// Faixas suaves em platôs (sem cair a zero) pro gráfico em degraus ficar como
// a referência — zeros no meio virariam "blocos quadrados" na área hachurada.
const CURVA_FATURAMENTO_MOCK = [
  3200, 3200, 3800, 3800, 3800, 3100, 3100, 4600, 4600, 4600, 5400, 5400, 5400,
  4900, 4900, 5800, 5800, 5800, 6300, 6300, 5600, 5600, 5600, 6900, 6900, 7400,
  7400, 7100, 7100, 7600,
];
const CURVA_FATURAMENTO_ANTERIOR_MOCK = [
  2600, 2600, 2400, 2400, 3100, 3100, 3100, 2800, 2800, 3600, 3600, 3600, 4200,
  4200, 3900, 3900, 4500, 4500, 4100, 4100, 4800, 4800, 4400, 4400, 5200, 5200,
  4900, 4900, 5300, 5300,
];

function serieFaturamentoMock(): { dia: string; valor: number; valorAnterior: number }[] {
  return Array.from({ length: 30 }, (_, i) => {
    const dia = new Date();
    dia.setDate(dia.getDate() - (29 - i));
    return {
      dia: dia.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      valor: CURVA_FATURAMENTO_MOCK[i] ?? 0,
      valorAnterior: CURVA_FATURAMENTO_ANTERIOR_MOCK[i] ?? 0,
    };
  });
}

// Gastos fictícios das categorias variáveis (o salário é real e vem dos dados).
const GASTOS_MOCK = {
  comissoes: 4280,
  passagem: 3760,
  hotel: 2540,
  alimentacao: 1490,
};

/** Formata valores em reais de forma compacta pros eixos (ex: R$5,4k). */
function reaisCompacto(v: number): string {
  if (v >= 1000) return `R$${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return `R$${v}`;
}

/** % de variação em relação ao mês anterior. null quando não há base de comparação. */
function calcularTendencia(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

function CartaoMetrica({
  rotulo,
  valor,
  icone: Icone,
  tendencia,
  to,
  rodape = "vs. mês passado",
}: {
  rotulo: string;
  valor: string | number;
  icone: LucideIcon;
  tendencia?: number | null;
  to?: string;
  rodape?: string;
}) {
  const temTendencia = tendencia !== null && tendencia !== undefined;
  const legenda = temTendencia
    ? `${(tendencia as number) >= 0 ? "+" : "-"}${Math.abs(tendencia as number)
        .toFixed(1)
        .replace(".", ",")}% vs. mês passado`
    : rodape;
  const conteudo = (
    <Card className={`h-full gap-2${to ? " transition-shadow hover:shadow-md" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">{rotulo}</CardTitle>
        <Icone className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{valor}</div>
        {legenda && <p className="mt-1 text-xs text-muted-foreground">{legenda}</p>}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to} className="block h-full">{conteudo}</Link> : conteudo;
}

const ESTILO_TOOLTIP = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "0 8px 24px rgba(18,24,31,0.12)",
  fontSize: 12,
} as const;

function GraficoFaturamento({ dados }: { dados: { dia: string; valor: number; valorAnterior: number }[] }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Faturamento nos últimos 30 dias</CardTitle>
        <CardAction>
          <span className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground">
            Últimos 30 dias
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-3.5 rounded-sm bg-muted-foreground/25 ring-1 ring-muted-foreground/40" />
            Este período
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden>
              <line x1="0" y1="3" x2="18" y2="3" stroke="var(--foreground)" strokeWidth="2" strokeDasharray="4 3" />
            </svg>
            Período anterior
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={dados} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <pattern
                id="hachuraFaturamento"
                patternUnits="userSpaceOnUse"
                width="6"
                height="6"
                patternTransform="rotate(45)"
              >
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--muted-foreground)" strokeOpacity="0.35" strokeWidth="1" />
              </pattern>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="dia"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={reaisCompacto}
              width={52}
            />
            <Tooltip
              formatter={(value: number, name) => [
                formatarReais(value),
                name === "valor" ? "Este período" : "Período anterior",
              ]}
              contentStyle={ESTILO_TOOLTIP}
            />
            {/* Período anterior (tracejado) desenhado antes pra ficar atrás da área */}
            <Line
              type="stepAfter"
              dataKey="valorAnterior"
              name="valorAnterior"
              stroke="var(--foreground)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
            />
            <Area
              type="stepAfter"
              dataKey="valor"
              name="valor"
              stroke="var(--muted-foreground)"
              strokeWidth={2}
              fill="url(#hachuraFaturamento)"
              dot={false}
              activeDot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function GastosPorCategoria({ dados }: { dados: { tipo: string; valor: number }[] }) {
  const itens = [...dados].sort((a, b) => b.valor - a.valor);
  const temAlgumGasto = (itens[0]?.valor ?? 0) > 0;
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Gastos por categorias</CardTitle>
      </CardHeader>
      <CardContent>
        {temAlgumGasto ? (
          <ResponsiveContainer width="100%" height={232}>
            <BarChart data={itens} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }} barCategoryGap="24%">
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="number"
                tickFormatter={reaisCompacto}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="tipo"
                width={104}
                interval={0}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                formatter={(value: number) => [formatarReais(value), "Gasto"]}
                contentStyle={ESTILO_TOOLTIP}
              />
              <Bar dataKey="valor" radius={[0, 6, 6, 0]} barSize={18}>
                {itens.map((d, i) => (
                  <Cell
                    key={d.tipo}
                    fill={i === 0 ? "var(--foreground)" : "var(--muted-foreground)"}
                    fillOpacity={i === 0 ? 1 : 0.55}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-[232px] items-center text-xs text-muted-foreground">
            Nenhum gasto registrado este mês.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [abaTecnico, setAbaTecnico] = useState<string>("");

  useEffect(() => {
    api.get("/ordens-servico").then((r) => setOrdens(r.data)).catch(() => {});
    api.get("/funcionarios").then((r) => setFuncionarios(r.data)).catch(() => {});
  }, []);

  const agora = new Date();
  const mesPassado = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);

  const abertas = ordens.filter((o) => o.statusAtual !== "CONCLUIDO" && o.statusAtual !== "CANCELADO");

  // "Fechadas no mês" = tiveram dataConclusao dentro do mês.
  const concluidasNoMes = ordens.filter((o) => mesmoMes(o.dataConclusao, agora));
  const concluidasMesPassado = ordens.filter((o) => mesmoMes(o.dataConclusao, mesPassado));

  const faturamentoMes = concluidasNoMes.reduce((soma, o) => soma + valorTotal(o), 0);
  const faturamentoMesPassado = concluidasMesPassado.reduce((soma, o) => soma + valorTotal(o), 0);

  const comissoesMes = concluidasNoMes.reduce((soma, o) => soma + (o.valorComissao ?? 0), 0);
  const comissoesMesPassado = concluidasMesPassado.reduce((soma, o) => soma + (o.valorComissao ?? 0), 0);

  const deslocamentoMes = concluidasNoMes.reduce((soma, o) => soma + custoDeslocamento(o), 0);
  const deslocamentoMesPassado = concluidasMesPassado.reduce((soma, o) => soma + custoDeslocamento(o), 0);

  // Salário é um custo fixo mensal — soma de todos os técnicos ativos,
  // independente de quantos atendimentos cada um fez. Como não guardamos
  // histórico de salário, usamos o valor atual pros dois meses.
  const salariosFixos = funcionarios.reduce((soma, f) => soma + f.salarioAtual, 0);

  const despesasMes = salariosFixos + comissoesMes + deslocamentoMes;
  const despesasMesPassado = salariosFixos + comissoesMesPassado + deslocamentoMesPassado;

  const ticketMedioMes = concluidasNoMes.length > 0 ? faturamentoMes / concluidasNoMes.length : 0;
  const ticketMedioMesPassado =
    concluidasMesPassado.length > 0 ? faturamentoMesPassado / concluidasMesPassado.length : 0;

  // Modo demonstração: sem OS concluídas no mês (seed antigo), preenche os
  // indicadores com valores fictícios coerentes com os gráficos, pra a tela
  // não ficar zerada na hora de apresentar.
  const modoDemo = concluidasNoMes.length === 0;
  const gastosVariaveisMock =
    GASTOS_MOCK.comissoes + GASTOS_MOCK.passagem + GASTOS_MOCK.hotel + GASTOS_MOCK.alimentacao;
  const faturamentoMesView = modoDemo ? 96400 : faturamentoMes;
  const faturamentoMesPassadoView = modoDemo ? 81200 : faturamentoMesPassado;
  const ticketMedioMesView = modoDemo ? 5074 : ticketMedioMes;
  const ticketMedioMesPassadoView = modoDemo ? 4510 : ticketMedioMesPassado;
  const despesasMesView = modoDemo ? salariosFixos + gastosVariaveisMock : despesasMes;
  const despesasMesPassadoView = modoDemo ? salariosFixos + 9800 : despesasMesPassado;

  const faturamentoDoDia = (offsetDias: number) => {
    const dia = new Date();
    dia.setDate(dia.getDate() - offsetDias);
    const chave = dia.toISOString().slice(0, 10);
    return ordens
      .filter((o) => o.dataConclusao?.slice(0, 10) === chave)
      .reduce((soma, o) => soma + valorTotal(o), 0);
  };

  const serieDiaria = Array.from({ length: 30 }, (_, i) => {
    const dia = new Date();
    dia.setDate(dia.getDate() - (29 - i));
    return {
      dia: dia.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      valor: faturamentoDoDia(29 - i), // este período
      valorAnterior: faturamentoDoDia(29 - i + 30), // 30 dias antes
    };
  });

  // Sem faturamento real no período → usa a série de demonstração.
  const serieFaturamento = serieDiaria.some((d) => d.valor > 0) ? serieDiaria : serieFaturamentoMock();

  // Sem OS concluídas no mês (seed antigo) → usa gastos variáveis de demonstração.
  const semGastosVariaveis = concluidasNoMes.length === 0;
  const despesasPorTipo = [
    { tipo: "Salários", valor: salariosFixos },
    { tipo: "Comissões", valor: semGastosVariaveis ? GASTOS_MOCK.comissoes : comissoesMes },
    { tipo: "Passagem aérea", valor: semGastosVariaveis ? GASTOS_MOCK.passagem : somaPorCampo(concluidasNoMes, "custoPassagem") },
    { tipo: "Hotel", valor: semGastosVariaveis ? GASTOS_MOCK.hotel : somaPorCampo(concluidasNoMes, "custoHospedagem") },
    { tipo: "Alimentação", valor: semGastosVariaveis ? GASTOS_MOCK.alimentacao : somaPorCampo(concluidasNoMes, "custoAlimentacao") },
  ];

  const hoje = new Date().toISOString().slice(0, 10);
  const agendaReal = funcionarios.map((f) => {
    const doDia = abertas
      .filter((o) => o.funcionario?.id === f.id && o.dataAgendada?.slice(0, 10) === hoje)
      .sort((a, b) => (a.dataAgendada ?? "").localeCompare(b.dataAgendada ?? ""));
    return { funcionario: f, atendimentos: doDia };
  });

  // Mock: sem nada agendado pra hoje (dados de seed antigos), distribui as OS
  // em aberto entre os técnicos pra a agenda ficar apresentável na demo.
  const temAgendaReal = agendaReal.some((a) => a.atendimentos.length > 0);
  const agendaBase =
    temAgendaReal || funcionarios.length === 0
      ? agendaReal
      : funcionarios.map((f, idx) => ({
          funcionario: f,
          atendimentos: abertas.filter((_, i) => i % funcionarios.length === idx),
        }));

  // Aba "Todos" agrega os atendimentos de todos os técnicos.
  const todosAtendimentos = agendaBase.flatMap((a) => a.atendimentos);
  const abasAgenda = [
    { id: "todos", rotulo: "Todos", quantidade: todosAtendimentos.length, atendimentos: todosAtendimentos, funcionarioId: null as string | null },
    ...agendaBase.map((a) => ({
      id: a.funcionario.id,
      rotulo: a.funcionario.usuario.nome.split(" ")[0],
      quantidade: a.atendimentos.length,
      atendimentos: a.atendimentos,
      funcionarioId: a.funcionario.id as string | null,
    })),
  ];

  const tecnicoAtivoId = abaTecnico || "todos";
  const agendaAtiva = abasAgenda.find((a) => a.id === tecnicoAtivoId) ?? abasAgenda[0];

  return (
    <div className="space-y-8">
      <PageHeader titulo="Painel" subtitulo="Visão geral da operação neste mês." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CartaoMetrica
          rotulo="Tickets abertos"
          valor={abertas.length}
          icone={ClipboardList}
          to="/ordens-servico"
          rodape="Aguardando atendimento"
        />
        <CartaoMetrica
          rotulo="Faturamento do mês"
          valor={formatarReais(faturamentoMesView)}
          icone={DollarSign}
          tendencia={calcularTendencia(faturamentoMesView, faturamentoMesPassadoView)}
        />
        <CartaoMetrica
          rotulo="Ticket médio do mês"
          valor={formatarReais(ticketMedioMesView)}
          icone={Receipt}
          tendencia={calcularTendencia(ticketMedioMesView, ticketMedioMesPassadoView)}
        />
        <CartaoMetrica
          rotulo="Despesas mensais"
          valor={formatarReais(despesasMesView)}
          icone={Wallet}
          tendencia={calcularTendencia(despesasMesView, despesasMesPassadoView)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <GraficoFaturamento dados={serieFaturamento} />
        </div>
        <GastosPorCategoria dados={despesasPorTipo} />
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Agenda diária</h2>
        {funcionarios.length === 0 ? (
          <Card className="px-5 py-4 text-sm text-muted-foreground">Nenhum técnico cadastrado ainda.</Card>
        ) : (
          <Card className="p-0">
            {/* Abas: Todos + um por técnico */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-3 pt-2">
              {abasAgenda.map(({ id, rotulo, quantidade }) => {
                const ativo = id === tecnicoAtivoId;
                return (
                  <button
                    key={id}
                    onClick={() => setAbaTecnico(id)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2.5 text-sm transition-colors ${
                      ativo
                        ? "border-foreground text-foreground font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {rotulo}
                    <Badge variant={ativo ? "default" : "secondary"} className="codigo">
                      {quantidade}
                    </Badge>
                  </button>
                );
              })}
            </div>

            {/* Atendimentos do técnico selecionado */}
            <div className="divide-y divide-border">
              {agendaAtiva && agendaAtiva.atendimentos.length > 0 ? (
                agendaAtiva.atendimentos.map((os) => (
                  <Link
                    key={os.id}
                    to={`/ordens-servico/${os.id}`}
                    className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <HospitalLogo nome={os.cliente.nome} size={36} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="codigo shrink-0 text-xs text-muted-foreground">#{formatarNumeroOS(os.numero)}</span>
                          <p className="truncate text-sm font-semibold text-foreground">{os.cliente.nome}</p>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{os.equipamento.tipo}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge status={os.statusAtual} />
                      <ChevronRight size={16} className="text-muted-foreground transition-colors group-hover:text-foreground" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex items-center justify-between px-5 py-6">
                  <p className="text-sm text-muted-foreground">Livre hoje — nenhum atendimento agendado.</p>
                  {agendaAtiva?.funcionarioId && (
                    <Button asChild variant="link" size="sm">
                      <Link to={`/funcionarios/${agendaAtiva.funcionarioId}/rota`}>Ver rota</Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Ordens de serviço em aberto</h2>
        <Card className="p-0 divide-y divide-border">
          {abertas.map((os) => (
            <Link
              key={os.id}
              to={`/ordens-servico/${os.id}`}
              className="group flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex min-w-0 items-center gap-3">
                <HospitalLogo nome={os.cliente.nome} size={40} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="codigo shrink-0 text-xs text-muted-foreground">#{formatarNumeroOS(os.numero)}</span>
                    <p className="truncate text-sm font-semibold text-foreground">{os.cliente.nome}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {os.equipamento.tipo} — {os.descricaoProblema}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <StatusBadge status={os.statusAtual} />
                  <p className="text-[11px] text-muted-foreground mt-1" title={new Date(os.dataAbertura).toLocaleString("pt-BR")}>
                    {tempoRelativo(os.dataAbertura)}
                  </p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          ))}
          {abertas.length === 0 && (
            <p className="text-sm text-muted-foreground px-5 py-4">Nenhuma OS em aberto no momento.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
