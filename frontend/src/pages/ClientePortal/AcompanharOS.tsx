import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../services/api";
import { StatusHistoricoItem, StatusOS } from "../../types";
import { StatusTimeline } from "../../components/StatusTimeline";
import { formatarNumeroOS } from "../../utils/formatters";

interface AcompanhamentoPublico {
  numero: number;
  statusAtual: StatusOS;
  equipamento: { tipo: string; marca?: string; modelo?: string };
  statusHistoricos: StatusHistoricoItem[];
}

/**
 * Tela que o cliente acessa por um link público (ex: enviado por WhatsApp/SMS)
 * para acompanhar o atendimento sem precisar criar conta — igual rastreio
 * de encomenda.
 */
export function AcompanharOS() {
  const { id } = useParams();
  const [dados, setDados] = useState<AcompanhamentoPublico | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    api
      .get(`/ordens-servico/${id}/acompanhamento-publico`)
      .then((r) => setDados(r.data))
      .catch(() => setErro(true));
  }, [id]);

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grafite-50 px-4">
        <p className="text-sm text-grafite-600">Não encontramos esse atendimento.</p>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grafite-50 px-4">
        <p className="text-sm text-grafite-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grafite-50 px-4 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <p className="codigo text-xs text-grafite-500">ATENDIMENTO Nº {formatarNumeroOS(dados.numero)}</p>
          <h1 className="text-lg font-semibold text-grafite-900 mt-1">{dados.equipamento.tipo}</h1>
          {dados.equipamento.marca && (
            <p className="text-sm text-grafite-600">
              {dados.equipamento.marca} {dados.equipamento.modelo}
            </p>
          )}
        </div>

        <StatusTimeline historico={dados.statusHistoricos} statusAtual={dados.statusAtual} />

        <p className="text-xs text-center text-grafite-400">
          Essa página é atualizada automaticamente conforme o técnico avança no atendimento.
        </p>
      </div>
    </div>
  );
}
