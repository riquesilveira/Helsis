import { StatusHistoricoItem, StatusOS } from "../types";
import { useEtapasStatus } from "../hooks/useEtapasStatus";
import { Card } from "./shadcn/card";

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
 * Registro de eventos do atendimento como uma timeline vertical conectada —
 * lê-se como um rastreio de entrega. Cada evento é uma mudança de status real
 * que aconteceu na OS, do mais recente pro mais antigo.
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
    <Card className="py-0">
      <ol className="px-5 py-4">
        {eventos.map((evento, i) => {
          const recente = i === 0;
          const ehUltimo = i === eventos.length - 1;
          return (
            <li key={i} className="flex gap-3">
              {/* Trilho: ponto + linha vertical conectando ao próximo */}
              <div className="flex flex-col items-center self-stretch">
                <span
                  className={`mt-1 shrink-0 rounded-full ring-4 ring-card ${CORES_STATUS[evento.status]} ${
                    recente ? "h-3 w-3" : "h-2.5 w-2.5"
                  }`}
                />
                {!ehUltimo && <span className="w-px flex-1 bg-border" />}
              </div>
              <div className={`min-w-0 flex-1 ${ehUltimo ? "pb-0" : "pb-5"}`}>
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
    </Card>
  );
}
