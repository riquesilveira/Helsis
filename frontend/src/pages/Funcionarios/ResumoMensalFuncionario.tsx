import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../services/api";
import { ResumoMensal } from "../../types";
import { formatarReais, formatarNumeroOS } from "../../utils/formatters";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/shadcn/card";
import { Button } from "../../components/shadcn/button";

const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function ResumoMensalFuncionario() {
  const { id } = useParams();
  const agora = new Date();
  const [mes, setMes] = useState(agora.getMonth() + 1);
  const [ano, setAno] = useState(agora.getFullYear());
  const [resumo, setResumo] = useState<ResumoMensal | null>(null);

  useEffect(() => {
    api.get(`/desempenho/${id}/resumo-mensal`, { params: { mes, ano } }).then((r) => setResumo(r.data)).catch(() => {});
  }, [id, mes, ano]);

  function mudarMes(delta: number) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes > 12) {
      novoMes = 1;
      novoAno += 1;
    } else if (novoMes < 1) {
      novoMes = 12;
      novoAno -= 1;
    }
    setMes(novoMes);
    setAno(novoAno);
  }

  if (!resumo) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const descricaoComissao =
    resumo.tipoComissao === "PERCENTUAL"
      ? `${resumo.valorConfigComissao ?? 0}% sobre a mão de obra de cada atendimento`
      : resumo.tipoComissao === "FIXO"
      ? `${formatarReais(resumo.valorConfigComissao ?? 0)} fixos por atendimento concluído`
      : "Sem comissão configurada";

  return (
    <div className="max-w-2xl mx-auto space-y-5 print:max-w-none print:space-y-0">
      <div className="flex items-center justify-between print:hidden">
        <Link
          to={`/funcionarios/${id}`}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← Voltar pro desempenho
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => mudarMes(-1)}
              aria-label="Mês anterior"
            >
              ‹
            </Button>
            <span className="text-sm font-medium text-foreground w-36 text-center">
              {NOMES_MESES[mes - 1]} de {ano}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => mudarMes(1)}
              aria-label="Próximo mês"
            >
              ›
            </Button>
          </div>
          <Button onClick={() => window.print()}>Imprimir</Button>
        </div>
      </div>

      <Card className="py-8 gap-6 print:rounded-none print:py-0 print:shadow-none print:ring-0">
        <CardHeader className="items-start px-8 pb-6 border-b border-border print:px-0">
          <CardTitle className="text-lg font-semibold text-foreground">Resumo mensal</CardTitle>
          <CardDescription>
            {NOMES_MESES[mes - 1]} de {ano}
          </CardDescription>
          <CardAction className="text-right">
            <p className="text-xs text-muted-foreground">Gerado em</p>
            <p className="text-sm text-foreground">{new Date().toLocaleDateString("pt-BR")}</p>
          </CardAction>
        </CardHeader>

        <CardContent className="px-8 print:px-0">
          <div className="grid grid-cols-2 gap-5 mb-8">
            <div>
              <p className="text-xs text-muted-foreground">Colaborador</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{resumo.nome}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cargo</p>
              <p className="text-sm text-foreground mt-0.5">{resumo.cargo}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">E-mail</p>
              <p className="text-sm text-foreground mt-0.5">{resumo.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Regra de comissão</p>
              <p className="text-sm text-foreground mt-0.5">{descricaoComissao}</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="pb-2 font-medium">Descrição</th>
                <th className="pb-2 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="py-3 text-foreground font-medium">Salário base</td>
                <td className="py-3 text-right codigo text-foreground font-medium">
                  {formatarReais(resumo.salarioBase)}
                </td>
              </tr>
              {resumo.atendimentos.map((a) => (
                <tr key={a.ordemServicoId}>
                  <td className="py-2.5 text-muted-foreground">
                    Comissão — OS #{formatarNumeroOS(a.numero)} ({a.clienteNome})
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Mão de obra {formatarReais(a.valorMaoDeObra)} · concluída em{" "}
                      {new Date(a.dataConclusao).toLocaleDateString("pt-BR")}
                    </span>
                  </td>
                  <td className="py-2.5 text-right codigo text-muted-foreground align-top">
                    {formatarReais(a.valorComissao)}
                  </td>
                </tr>
              ))}
              {resumo.atendimentos.length === 0 && (
                <tr>
                  <td className="py-3 text-muted-foreground" colSpan={2}>
                    Nenhum atendimento concluído com comissão neste mês.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-sm">
            <span className="text-muted-foreground">Subtotal de comissões</span>
            <span className="codigo text-foreground">{formatarReais(resumo.totalComissoes)}</span>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-foreground">
            <span className="text-sm font-semibold text-foreground">Total a receber no mês</span>
            <span className="codigo text-xl font-semibold text-foreground">{formatarReais(resumo.totalAPagar)}</span>
          </div>

          <p className="text-xs text-muted-foreground mt-8 pt-5 border-t border-border">
            Resumo informativo gerado automaticamente a partir do histórico de atendimentos — não substitui o
            holerite oficial. Comissões referentes a atendimentos com data de conclusão dentro de{" "}
            {NOMES_MESES[mes - 1].toLowerCase()} de {ano}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
