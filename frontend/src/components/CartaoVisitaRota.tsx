import { Link } from "react-router-dom";
import { OrdemServico } from "../types";

const ROTULO_STATUS: Record<string, string> = {
  RECEBIDO: "Recebido",
  DIAGNOSTICO: "Diagnóstico",
  AGUARDANDO_PECA: "Aguardando peça",
  EM_REPARO: "Em reparo",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const COR_STATUS: Record<string, string> = {
  RECEBIDO: "bg-grafite-100 text-grafite-600",
  DIAGNOSTICO: "bg-amber-50 text-status-diagnostico",
  AGUARDANDO_PECA: "bg-red-50 text-status-aguardando",
  EM_REPARO: "bg-teal-100 text-teal-700",
  CONCLUIDO: "bg-green-50 text-status-concluido",
  CANCELADO: "bg-red-50 text-status-cancelado",
};

/**
 * Cartão de uma visita na rota do dia — usado tanto na tela do dono
 * ("rota do técnico") quanto na do próprio técnico ("minha rota").
 * Mostra o que foi solicitado e, se já houve progresso, um resumo do que
 * foi feito (último evento + peças trocadas).
 */
export function CartaoVisitaRota({ os }: { os: OrdemServico }) {
  const ultimoEvento =
    os.statusHistoricos.length > 0 ? os.statusHistoricos[os.statusHistoricos.length - 1] : null;

  return (
    <Link
      to={`/ordens-servico/${os.id}`}
      className="block bg-white border border-grafite-200 rounded-lg p-4 hover:border-grafite-400 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-grafite-900 truncate">
            {os.cliente.nome} <span className="text-grafite-400">·</span> {os.equipamento.tipo}
          </p>
          <p className="text-xs text-grafite-500 mt-1">
            <span className="text-grafite-400">Solicitado: </span>
            {os.descricaoProblema}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className={`codigo text-[11px] font-medium px-2 py-0.5 rounded-full ${COR_STATUS[os.statusAtual]}`}
          >
            {ROTULO_STATUS[os.statusAtual]}
          </span>
          <span className="codigo text-[10px] text-grafite-400">
            {os.tipo === "PREVENTIVA" ? "preventiva" : "corretiva"}
          </span>
        </div>
      </div>

      {(ultimoEvento || (os.pecasTrocadas && os.pecasTrocadas.length > 0)) && (
        <div className="mt-3 pt-3 border-t border-grafite-100">
          {ultimoEvento && (
            <p className="text-xs text-grafite-600">
              <span className="text-grafite-400">Feito até agora: </span>
              {ultimoEvento.observacao ?? ROTULO_STATUS[ultimoEvento.status]}
            </p>
          )}
          {os.pecasTrocadas && os.pecasTrocadas.length > 0 && (
            <p className="text-xs text-grafite-600 mt-1">
              <span className="text-grafite-400">Peças: </span>
              {os.pecasTrocadas.map((p) => p.pecaCatalogo.nome).join(", ")}
            </p>
          )}
        </div>
      )}
    </Link>
  );
}
