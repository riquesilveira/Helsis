import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../services/api";
import { DesempenhoFuncionario, Funcionario, TipoComissao } from "../../types";
import { Campo, classeInput } from "../../components/Modal";

function CartaoMetrica({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="bg-white border border-grafite-200 rounded-lg p-5">
      <p className="text-xs text-grafite-500">{rotulo}</p>
      <p className={`codigo text-2xl font-semibold mt-1 ${destaque ? "text-teal-600" : "text-grafite-900"}`}>
        {valor}
      </p>
    </div>
  );
}

function formatarReais(valor: number) {
  return `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export function FuncionarioDesempenho() {
  const { id } = useParams();
  const [desempenho, setDesempenho] = useState<DesempenhoFuncionario | null>(null);
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);

  // formulário de comissão
  const [tipoComissao, setTipoComissao] = useState<"" | TipoComissao>("");
  const [valorComissao, setValorComissao] = useState("");
  const [salvandoComissao, setSalvandoComissao] = useState(false);

  function carregarFuncionario() {
    api.get(`/funcionarios/${id}`).then((r) => {
      setFuncionario(r.data);
      setTipoComissao(r.data.tipoComissao ?? "");
      setValorComissao(r.data.valorComissao != null ? String(r.data.valorComissao) : "");
    });
  }

  useEffect(() => {
    api.get(`/desempenho/${id}`).then((r) => setDesempenho(r.data));
    carregarFuncionario();
  }, [id]);

  async function salvarComissao(e: FormEvent) {
    e.preventDefault();
    setSalvandoComissao(true);
    try {
      await api.patch(`/funcionarios/${id}/comissao`, {
        tipoComissao: tipoComissao || null,
        valorComissao: tipoComissao ? Number(valorComissao) : null,
      });
      carregarFuncionario();
    } finally {
      setSalvandoComissao(false);
    }
  }

  if (!desempenho || !funcionario) return <p className="text-sm text-grafite-500">Carregando...</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-grafite-900">{desempenho.nome}</h1>
          <p className="text-sm text-grafite-600 mt-1">{desempenho.cargo}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link to={`/funcionarios/${id}/resumo`} className="text-xs font-medium text-teal-700 hover:text-teal-800">
            Resumo mensal (contracheque) →
          </Link>
          <Link to={`/funcionarios/${id}/rota`} className="text-xs font-medium text-teal-700 hover:text-teal-800">
            Ver rota do dia →
          </Link>
        </div>
      </div>

      <p className="text-xs text-grafite-500 max-w-md">
        Essas métricas são calculadas a partir do histórico real de ordens de serviço —
        é a base objetiva usada para avaliar pedidos de aumento.
      </p>

      <div className="grid grid-cols-3 gap-4">
        <CartaoMetrica
          rotulo="Taxa de acerto na 1ª visita"
          valor={`${Math.round(desempenho.taxaResolucaoPrimeiraTentativa * 100)}%`}
          destaque
        />
        <CartaoMetrica rotulo="OS concluídas" valor={String(desempenho.totalOrdensConcluidas)} />
        <CartaoMetrica
          rotulo="Média de tentativas por OS"
          valor={desempenho.mediaTentativasPorOrdem.toFixed(1)}
        />
        <CartaoMetrica
          rotulo="Tempo médio de resolução"
          valor={
            desempenho.tempoMedioResolucaoHoras
              ? `${Math.round(desempenho.tempoMedioResolucaoHoras)}h`
              : "—"
          }
        />
        <CartaoMetrica
          rotulo="Custo total de deslocamento"
          valor={formatarReais(desempenho.custoTotalDeslocamento)}
        />
        <CartaoMetrica
          rotulo="Peças trocadas sem resolver"
          valor={String(desempenho.pecasTrocadasQueNaoResolveram)}
        />
      </div>

      <div>
        <h2 className="text-sm font-medium text-grafite-900 mb-3">Remuneração</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-grafite-200 rounded-lg p-5">
            <p className="text-xs text-grafite-500">Salário atual</p>
            <p className="codigo text-xl font-semibold text-grafite-900 mt-1">
              {formatarReais(funcionario.salarioAtual)}
            </p>
          </div>
          <div className="bg-white border border-grafite-200 rounded-lg p-5">
            <p className="text-xs text-grafite-500">Comissão acumulada (atendimentos concluídos)</p>
            <p className="codigo text-xl font-semibold text-teal-600 mt-1">
              {formatarReais(desempenho.comissaoAcumulada)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-grafite-200 rounded-lg p-5 max-w-md">
        <h2 className="text-sm font-medium text-grafite-900 mb-1">Configurar comissão</h2>
        <p className="text-xs text-grafite-500 mb-4">
          A comissão incide só sobre o valor de mão de obra de cada atendimento — nunca sobre peças.
        </p>
        <form onSubmit={salvarComissao}>
          <Campo rotulo="Tipo de comissão">
            <select
              className={classeInput}
              value={tipoComissao}
              onChange={(e) => setTipoComissao(e.target.value as "" | TipoComissao)}
            >
              <option value="">Nenhuma (só salário fixo)</option>
              <option value="PERCENTUAL">Percentual sobre a mão de obra</option>
              <option value="FIXO">Valor fixo por atendimento concluído</option>
            </select>
          </Campo>
          {tipoComissao && (
            <Campo rotulo={tipoComissao === "PERCENTUAL" ? "Percentual (%)" : "Valor fixo (R$)"}>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                className={classeInput}
                value={valorComissao}
                onChange={(e) => setValorComissao(e.target.value)}
              />
            </Campo>
          )}
          <button
            type="submit"
            disabled={salvandoComissao}
            className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md px-4 py-2 transition-colors disabled:opacity-60"
          >
            {salvandoComissao ? "Salvando..." : "Salvar comissão"}
          </button>
        </form>
      </div>
    </div>
  );
}
