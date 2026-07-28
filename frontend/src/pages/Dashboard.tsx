import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ClipboardList, DollarSign, Receipt, Wallet, ArrowUpRight, ArrowDownRight, ChevronRight, LucideIcon } from "lucide-react";
import { api } from "../services/api";
import { Funcionario, OrdemServico } from "../types";
import { formatarReais, tempoRelativo, formatarNumeroOS } from "../utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "../components/shadcn/card";
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
}: {
  rotulo: string;
  valor: string | number;
  icone: LucideIcon;
  tendencia?: number | null;
  to?: string;
}) {
  const conteudo = (
    <Card className={`h-full p-5${to ? " transition-shadow hover:shadow-md" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted shrink-0">
          <Icone size={19} className="text-foreground" />
        </div>
        {tendencia !== null && tendencia !== undefined && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {tendencia >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(tendencia).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className="codigo mt-1 text-[26px] font-semibold leading-tight text-foreground">{valor}</p>
      {tendencia !== null && tendencia !== undefined && (
        <p className="mt-1 text-[11px] text-muted-foreground">vs. mês passado</p>
      )}
    </Card>
  );
  return to ? <Link to={to} className="block h-full">{conteudo}</Link> : conteudo;
}

function GraficoFaturamento({ dados }: { dados: { dia: string; valor: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Faturamento nos últimos 30 dias</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={dados} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="corFaturamento" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0} />
              </linearGradient>
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
              tickFormatter={(v) => `R$${v}`}
              width={54}
            />
            <Tooltip
              formatter={(value: number) => [formatarReais(value), "Faturamento"]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                boxShadow: "0 8px 24px rgba(18,24,31,0.12)",
                fontSize: 12,
              }}
            />
            <Area type="monotone" dataKey="valor" stroke="var(--foreground)" strokeWidth={2.5} fill="url(#corFaturamento)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function DespesasPorTipo({ dados }: { dados: { tipo: string; valor: number }[] }) {
  const total = dados.reduce((soma, d) => soma + d.valor, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Despesas por tipo no mês</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {dados.map((d) => {
          const pct = total > 0 ? (d.valor / total) * 100 : 0;
          return (
            <div key={d.tipo}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-foreground">{d.tipo}</span>
                <span className="codigo font-medium text-foreground">{formatarReais(d.valor)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {dados.every((d) => d.valor === 0) && (
          <p className="text-sm text-muted-foreground">Nenhuma despesa registrada este mês.</p>
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

  const serieDiaria = Array.from({ length: 30 }, (_, i) => {
    const dia = new Date();
    dia.setDate(dia.getDate() - (29 - i));
    const chave = dia.toISOString().slice(0, 10);
    const valor = ordens
      .filter((o) => o.dataConclusao?.slice(0, 10) === chave)
      .reduce((soma, o) => soma + valorTotal(o), 0);
    return { dia: dia.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), valor };
  });

  const despesasPorTipo = [
    { tipo: "Salários", valor: salariosFixos },
    { tipo: "Comissões", valor: comissoesMes },
    { tipo: "Passagem aérea", valor: somaPorCampo(concluidasNoMes, "custoPassagem") },
    { tipo: "Hotel", valor: somaPorCampo(concluidasNoMes, "custoHospedagem") },
    { tipo: "Alimentação", valor: somaPorCampo(concluidasNoMes, "custoAlimentacao") },
  ];

  const hoje = new Date().toISOString().slice(0, 10);
  const agendaDoDia = funcionarios.map((f) => {
    const doDia = abertas
      .filter((o) => o.funcionario?.id === f.id && o.dataAgendada?.slice(0, 10) === hoje)
      .sort((a, b) => (a.dataAgendada ?? "").localeCompare(b.dataAgendada ?? ""));
    return { funcionario: f, quantidade: doDia.length, atendimentos: doDia };
  });

  const tecnicoAtivoId = abaTecnico || agendaDoDia[0]?.funcionario.id || "";
  const agendaAtiva = agendaDoDia.find((a) => a.funcionario.id === tecnicoAtivoId);

  return (
    <div className="space-y-8">
      <PageHeader titulo="Painel" subtitulo="Visão geral da operação neste mês." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CartaoMetrica rotulo="Tickets abertos" valor={abertas.length} icone={ClipboardList} to="/ordens-servico" />
        <CartaoMetrica
          rotulo="Faturamento do mês"
          valor={formatarReais(faturamentoMes)}
          icone={DollarSign}
          tendencia={calcularTendencia(faturamentoMes, faturamentoMesPassado)}
        />
        <CartaoMetrica
          rotulo="Ticket médio do mês"
          valor={formatarReais(ticketMedioMes)}
          icone={Receipt}
          tendencia={calcularTendencia(ticketMedioMes, ticketMedioMesPassado)}
        />
        <CartaoMetrica
          rotulo="Despesas mensais"
          valor={formatarReais(despesasMes)}
          icone={Wallet}
          tendencia={calcularTendencia(despesasMes, despesasMesPassado)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <GraficoFaturamento dados={serieDiaria} />
        </div>
        <DespesasPorTipo dados={despesasPorTipo} />
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Agenda de hoje, por técnico</h2>
        {agendaDoDia.length === 0 ? (
          <Card className="px-5 py-4 text-sm text-muted-foreground">Nenhum técnico cadastrado ainda.</Card>
        ) : (
          <Card className="p-0">
            {/* Abas dos técnicos */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-3 pt-2">
              {agendaDoDia.map(({ funcionario, quantidade }) => {
                const ativo = funcionario.id === tecnicoAtivoId;
                return (
                  <button
                    key={funcionario.id}
                    onClick={() => setAbaTecnico(funcionario.id)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2.5 text-sm transition-colors ${
                      ativo
                        ? "border-foreground text-foreground font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {funcionario.usuario.nome.split(" ")[0]}
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
                          <Badge variant="secondary" className="codigo shrink-0">
                            #{formatarNumeroOS(os.numero)}
                          </Badge>
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
                  {agendaAtiva && (
                    <Button asChild variant="link" size="sm">
                      <Link to={`/funcionarios/${agendaAtiva.funcionario.id}/rota`}>Ver rota</Link>
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
                    <Badge variant="secondary" className="codigo shrink-0">
                      #{formatarNumeroOS(os.numero)}
                    </Badge>
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
