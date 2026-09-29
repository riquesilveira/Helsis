import { StatusHistoricoItem, StatusOS } from "../types";
import { useEtapasStatus } from "../hooks/useEtapasStatus";

const CORES_STATUS: Record<StatusOS, string> = {
  RECEBIDO: "bg-status-recebido",
  DIAGNOSTICO: "bg-status-diagnostico",
  AGUARDANDO_PECA: "bg-status-aguardando",
  EM_REPARO: "bg-status-reparo",
  AGUARDANDO_VALIDACAO: "bg-status-validacao",
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
 * Registro de eventos do atendimento — cada mudança de status real, do mais
 * recente pro mais antigo, com uma linha divisória entre cada uma. Pensado pra
 * ser usado DENTRO de um Card (não traz card/padding horizontal próprio).
 */
export function StatusTimeline({
  historico,
}: {
  historico: StatusHistoricoItem[];
  statusAtual?: StatusOS;
}) {
  const { rotulo } = useEtapasStatus();
  const eventos = historico.slice().reverse();

  return (
    <ol className="divide-y divide-border">
      {eventos.map((evento, i) => {
        const recente = i === 0;
        return (
          <li key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span
              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${CORES_STATUS[evento.status]}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p
                  className={`text-sm ${
                    recente ? "font-semibold text-foreground" : "text-foreground"
                  }`}
                >
                  {rotulo(evento.status)}
                  {evento.tentativaNumero && evento.tentativaNumero > 1 && (
                    <span className="codigo ml-2 rounded-full bg-status-aguardando/12 px-1.5 py-0.5 text-[11px] text-status-aguardando">
                      tentativa {evento.tentativaNumero}
                    </span>
                  )}
                </p>
                <span className="codigo shrink-0 text-xs text-muted-foreground">
                  {formatarData(evento.criadoEm)}
                </span>
              </div>
              {evento.observacao && (
                <p className="mt-0.5 text-sm text-muted-foreground">{evento.observacao}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
