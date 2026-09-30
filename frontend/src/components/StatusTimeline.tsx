import { StatusHistoricoItem, StatusOS } from "../types";
import { useEtapasStatus } from "../hooks/useEtapasStatus";

// Bolinhas como contorno colorido (stroke), miolo na cor do card.
const BORDA_STATUS: Record<StatusOS, string> = {
  RECEBIDO: "border-status-recebido",
  DIAGNOSTICO: "border-status-diagnostico",
  AGUARDANDO_PECA: "border-status-aguardando",
  EM_REPARO: "border-status-reparo",
  AGUARDANDO_VALIDACAO: "border-status-validacao",
  CONCLUIDO: "border-status-concluido",
  CANCELADO: "border-status-cancelado",
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
 * Timeline vertical do atendimento — uma linha contínua liga todas as bolinhas
 * (contorno colorido por status), do evento mais recente pro mais antigo.
 * Pensada pra ser usada DENTRO de um Card.
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
    <ol>
      {eventos.map((evento, i) => {
        const recente = i === 0;
        const ultimo = i === eventos.length - 1;
        return (
          <li key={i} className="flex gap-3">
            {/* Trilho: bolinha (stroke) + linha vertical até a próxima */}
            <div className="flex flex-col items-center self-stretch">
              <span
                className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 bg-card ${BORDA_STATUS[evento.status]}`}
              />
              {!ultimo && <span className="w-0.5 flex-1 bg-border" />}
            </div>
            <div className={`min-w-0 flex-1 ${ultimo ? "pb-0" : "pb-5"}`}>
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
