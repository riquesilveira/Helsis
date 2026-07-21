import { ETAPAS_STATUS, StatusHistoricoItem, StatusOS } from "../types";

const CORES_STATUS: Record<StatusOS, string> = {
  RECEBIDO: "bg-status-recebido",
  DIAGNOSTICO: "bg-status-diagnostico",
  AGUARDANDO_PECA: "bg-status-aguardando",
  EM_REPARO: "bg-status-reparo",
  CONCLUIDO: "bg-status-concluido",
  CANCELADO: "bg-status-cancelado",
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Linha do tempo do atendimento — pensada para ser lida como uma ficha técnica
 * (código + carimbo de hora em monoespaçada), não como uma decoração genérica
 * de "stepper". Cada etapa carimbada é um evento real que aconteceu na OS.
 */
export function StatusTimeline({
  historico,
  statusAtual,
}: {
  historico: StatusHistoricoItem[];
  statusAtual: StatusOS;
}) {
  const indiceAtual = ETAPAS_STATUS.findIndex((e) => e.status === statusAtual);

  return (
    <div className="card">
      {/* Trilho de etapas padrão (o "quanto falta") */}
      <div className="flex items-center px-5 pt-5 pb-4 overflow-x-auto">
        {ETAPAS_STATUS.map((etapa, i) => {
          const concluida = i <= indiceAtual && statusAtual !== "CANCELADO";
          return (
            <div key={etapa.status} className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center gap-1.5 min-w-[84px]">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    concluida ? CORES_STATUS[etapa.status] : "bg-grafite-200"
                  }`}
                />
                <span
                  className={`text-[11px] text-center leading-tight ${
                    concluida ? "text-grafite-900 font-medium" : "text-grafite-400"
                  }`}
                >
                  {etapa.rotulo}
                </span>
              </div>
              {i < ETAPAS_STATUS.length - 1 && (
                <div className={`h-px w-8 ${concluida ? "bg-grafite-600" : "bg-grafite-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Registro real de eventos — o histórico bruto, tipo log de rastreio */}
      <div className="border-t border-grafite-100 divide-y divide-grafite-100">
        {historico
          .slice()
          .reverse()
          .map((evento, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-3">
              <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${CORES_STATUS[evento.status]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-grafite-900">
                  {ETAPAS_STATUS.find((e) => e.status === evento.status)?.rotulo ?? evento.status}
                  {evento.tentativaNumero && evento.tentativaNumero > 1 && (
                    <span className="ml-2 text-xs text-status-aguardando codigo">
                      tentativa {evento.tentativaNumero}
                    </span>
                  )}
                </p>
                {evento.observacao && (
                  <p className="text-sm text-grafite-600 mt-0.5">{evento.observacao}</p>
                )}
              </div>
              <span className="codigo text-xs text-grafite-400 flex-shrink-0">
                {formatarData(evento.criadoEm)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
