import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../services/api";
import { ResumoMensal } from "../../types";
import { formatarReais } from "../../utils/formatters";

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

  if (!resumo) return <p className="text-sm text-grafite-500">Carregando...</p>;

  const descricaoComissao =
    resumo.tipoComissao === "PERCENTUAL"
      ? `${resumo.valorConfigComissao ?? 0}% sobre a mão de obra de cada atendimento`
      : resumo.tipoComissao === "FIXO"
      ? `${formatarReais(resumo.valorConfigComissao ?? 0)} fixos por atendimento concluído`
      : "Sem comissão configurada";

  return (
    <div className="max-w-2xl mx-auto space-y-5 print:max-w-none print:space-y-0">
      <div className="flex items-center justify-between print:hidden">
        <Link to={`/funcionarios/${id}`} className="text-xs font-medium text-teal-700 hover:text-teal-800">
          ← Voltar pro desempenho
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => mudarMes(-1)}
              className="w-7 h-7 rounded-md border border-grafite-200 text-grafite-600 hover:bg-grafite-100 flex items-center justify-center"
              aria-label="Mês anterior"
            >
              ‹
            </button>
            <span className="text-sm font-medium text-grafite-900 w-36 text-center">
              {NOMES_MESES[mes - 1]} de {ano}
            </span>
            <button
              onClick={() => mudarMes(1)}
              className="w-7 h-7 rounded-md border border-grafite-200 text-grafite-600 hover:bg-grafite-100 flex items-center justify-center"
              aria-label="Próximo mês"
            >
              ›
            </button>
          </div>
          <button
            onClick={() => window.print()}
            className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md px-4 py-2 transition-colors"
          >
            Imprimir
          </button>
        </div>
      </div>

      <div className="bg-white border border-grafite-200 rounded-lg p-8 print:border-0 print:shadow-none print:rounded-none print:p-0">
        <div className="flex items-start justify-between border-b border-grafite-200 pb-6 mb-6">
          <div>
            <h1 className="text-lg font-semibold text-grafite-900">Resumo mensal</h1>
            <p className="text-sm text-grafite-600 mt-1">
              {NOMES_MESES[mes - 1]} de {ano}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-grafite-500">Gerado em</p>
            <p className="text-sm text-grafite-900">{new Date().toLocaleDateString("pt-BR")}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5 mb-8">
          <div>
            <p className="text-xs text-grafite-500">Colaborador</p>
            <p className="text-sm font-medium text-grafite-900 mt-0.5">{resumo.nome}</p>
          </div>
          <div>
            <p className="text-xs text-grafite-500">Cargo</p>
            <p className="text-sm text-grafite-900 mt-0.5">{resumo.cargo}</p>
          </div>
          <div>
            <p className="text-xs text-grafite-500">E-mail</p>
            <p className="text-sm text-grafite-900 mt-0.5">{resumo.email}</p>
          </div>
          <div>
            <p className="text-xs text-grafite-500">Regra de comissão</p>
            <p className="text-sm text-grafite-900 mt-0.5">{descricaoComissao}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-grafite-500 border-b border-grafite-200">
              <th className="pb-2 font-medium">Descrição</th>
              <th className="pb-2 font-medium text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grafite-100">
            <tr>
              <td className="py-3 text-grafite-900 font-medium">Salário base</td>
              <td className="py-3 text-right codigo text-grafite-900 font-medium">
                {formatarReais(resumo.salarioBase)}
              </td>
            </tr>
            {resumo.atendimentos.map((a) => (
              <tr key={a.ordemServicoId}>
                <td className="py-2.5 text-grafite-700">
                  Comissão — OS #{a.numero} ({a.clienteNome})
                  <span className="block text-xs text-grafite-400 mt-0.5">
                    Mão de obra {formatarReais(a.valorMaoDeObra)} · concluída em{" "}
                    {new Date(a.dataConclusao).toLocaleDateString("pt-BR")}
                  </span>
                </td>
                <td className="py-2.5 text-right codigo text-grafite-700 align-top">
                  {formatarReais(a.valorComissao)}
                </td>
              </tr>
            ))}
            {resumo.atendimentos.length === 0 && (
              <tr>
                <td className="py-3 text-grafite-500" colSpan={2}>
                  Nenhum atendimento concluído com comissão neste mês.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-grafite-100 text-sm">
          <span className="text-grafite-600">Subtotal de comissões</span>
          <span className="codigo text-grafite-900">{formatarReais(resumo.totalComissoes)}</span>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-grafite-900">
          <span className="text-sm font-semibold text-grafite-900">Total a receber no mês</span>
          <span className="codigo text-xl font-semibold text-teal-700">{formatarReais(resumo.totalAPagar)}</span>
        </div>

        <p className="text-xs text-grafite-400 mt-8 pt-5 border-t border-grafite-100">
          Resumo informativo gerado automaticamente a partir do histórico de atendimentos — não substitui o
          holerite oficial. Comissões referentes a atendimentos com data de conclusão dentro de{" "}
          {NOMES_MESES[mes - 1].toLowerCase()} de {ano}.
        </p>
      </div>
    </div>
  );
}
