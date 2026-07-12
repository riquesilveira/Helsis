import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ClipboardList, DollarSign, Receipt, Wallet, ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";
import { api } from "../services/api";
import { Funcionario, OrdemServico } from "../types";
import { formatarReais, tempoRelativo } from "../utils/formatters";

const ROTULO_STATUS: Record<string, string> = {
  RECEBIDO: "Recebido",
  DIAGNOSTICO: "Em diagnóstico",
  AGUARDANDO_PECA: "Aguardando peça",
  EM_REPARO: "Em reparo",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

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
    <div className="bg-white border border-grafite-200 rounded-lg p-5 hover:border-grafite-400 transition-colors h-full">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
          <Icone size={18} className="text-teal-700" />
        </div>
        <p className="text-xs text-grafite-600">{rotulo}</p>
      </div>
      <p className="codigo text-2xl font-semibold text-grafite-900 mt-1">{valor}</p>
      {tendencia !== null && tendencia !== undefined && (
        <p
          className={`text-xs mt-2 flex items-center gap-1 ${
            tendencia >= 0 ? "text-status-concluido" : "text-status-cancelado"
          }`}
        >
          {tendencia >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {Math.abs(tendencia).toFixed(1)}% vs mês passado
        </p>
      )}
    </div>
  );
  return to ? <Link to={to}>{conteudo}</Link> : conteudo;
}

function GraficoFaturamento({ dados }: { dados: { dia: string; valor: number }[] }) {
  return (
    <div className="bg-white border border-grafite-200 rounded-lg p-5">
      <h2 className="text-sm font-medium text-grafite-900 mb-4">Faturamento nos últimos 30 dias</h2>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={dados} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="corFaturamento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0F8B8D" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#0F8B8D" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDF1F4" />
          <XAxis
            dataKey="dia"
            tick={{ fontSize: 11, fill: "#8A99A6" }}
            axisLine={false}
            tickLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#8A99A6" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `R$${v}`}
            width={54}
          />
          <Tooltip
            formatter={(value: number) => [formatarReais(value), "Faturamento"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #D3DAE0", fontSize: 12 }}
          />
          <Area type="monotone" dataKey="valor" stroke="#0F8B8D" strokeWidth={2} fill="url(#corFaturamento)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function DespesasPorTipo({ dados }: { dados: { tipo: string; valor: number }[] }) {
  const total = dados.reduce((soma, d) => soma + d.valor, 0);
  return (
    <div className="bg-white border border-grafite-200 rounded-lg p-5">
      <h2 className="text-sm font-medium text-grafite-900 mb-4">Despesas por tipo no mês</h2>
      <div className="space-y-3.5">
        {dados.map((d) => {
          const pct = total > 0 ? (d.valor / total) * 100 : 0;
          return (
            <div key={d.tipo}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-grafite-900">{d.tipo}</span>
                <span className="codigo text-grafite-600">{formatarReais(d.valor)}</span>
              </div>
              <div className="h-1.5 bg-grafite-100 rounded-full overflow-hidden">
                <div className="h-full bg-teal-600 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        {dados.every((d) => d.valor === 0) && (
          <p className="text-sm text-grafite-500">Nenhuma despesa registrada este mês.</p>
        )}
      </div>
    </div>
  );
}

export function Dashboard() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);

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
    const doDia = abertas.filter((o) => o.funcionario?.id === f.id && o.dataAgendada?.slice(0, 10) === hoje);
    return { funcionario: f, quantidade: doDia.length, proxima: doDia[0] };
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-4">
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

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <GraficoFaturamento dados={serieDiaria} />
        </div>
        <DespesasPorTipo dados={despesasPorTipo} />
      </div>

      <div>
        <h2 className="text-sm font-medium text-grafite-900 mb-3">Agenda de hoje, por técnico</h2>
        <div className="bg-white border border-grafite-200 rounded-lg divide-y divide-grafite-100">
          {agendaDoDia.map(({ funcionario, quantidade, proxima }) => (
            <Link
              key={funcionario.id}
              to={`/funcionarios/${funcionario.id}/rota`}
              className="flex items-center justify-between px-5 py-3 hover:bg-grafite-50"
            >
              <div>
                <p className="text-sm text-grafite-900">{funcionario.usuario.nome}</p>
                <p className="text-xs text-grafite-500">{funcionario.cargo}</p>
              </div>
              <div className="text-right">
                <p className="codigo text-sm text-teal-700">
                  {quantidade === 0 ? "Nenhum atendimento hoje" : `${quantidade} atendimento(s) hoje`}
                </p>
                {proxima && (
                  <p className="text-xs text-grafite-500 mt-0.5">
                    Próximo: {proxima.cliente.nome} — {proxima.equipamento.tipo}
                  </p>
                )}
              </div>
            </Link>
          ))}
          {agendaDoDia.length === 0 && (
            <p className="text-sm text-grafite-500 px-5 py-4">Nenhum técnico cadastrado ainda.</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-grafite-900 mb-3">Ordens de serviço em aberto</h2>
        <div className="bg-white border border-grafite-200 rounded-lg divide-y divide-grafite-100">
          {abertas.map((os) => (
            <Link
              key={os.id}
              to={`/ordens-servico/${os.id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-grafite-50"
            >
              <div>
                <p className="text-sm text-grafite-900">
                  <span className="codigo text-grafite-500">#{os.numero}</span>{" "}
                  {os.cliente.nome} — {os.equipamento.tipo}
                </p>
                <p className="text-xs text-grafite-500 mt-0.5">{os.descricaoProblema}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <span className="text-xs codigo text-teal-700">{ROTULO_STATUS[os.statusAtual] ?? os.statusAtual}</span>
                <p className="text-[11px] text-grafite-400 mt-0.5" title={new Date(os.dataAbertura).toLocaleString("pt-BR")}>
                  {tempoRelativo(os.dataAbertura)}
                </p>
              </div>
            </Link>
          ))}
          {abertas.length === 0 && (
            <p className="text-sm text-grafite-500 px-5 py-4">Nenhuma OS em aberto no momento.</p>
          )}
        </div>
      </div>
    </div>
  );
}
