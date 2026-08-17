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
  const { etapasTrilha, rotulo } = useEtapasStatus();
  const indiceAtual = etapasTrilha.findIndex((e) => e.status === statusAtual);

  return (
    <Card className="gap-0 py-0">
      {/* Trilho de etapas padrão (o "quanto falta") */}
      <div className="flex items-center overflow-x-auto px-5 pt-5 pb-4">
        {etapasTrilha.map((etapa, i) => {
          const concluida = i <= indiceAtual && statusAtual !== "CANCELADO";
          return (
            <div key={etapa.status} className="flex shrink-0 items-center">
              <div className="flex min-w-[84px] flex-col items-center gap-1.5">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    concluida ? CORES_STATUS[etapa.status] : "bg-border"
                  }`}
                />
                <span
                  className={`text-center text-[11px] leading-tight ${
                    concluida ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {etapa.rotulo}
                </span>
              </div>
              {i < etapasTrilha.length - 1 && (
                <div className={`h-px w-8 ${concluida ? "bg-muted-foreground" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Registro real de eventos — o histórico bruto, tipo log de rastreio */}
      <div className="divide-y divide-border border-t border-border">
        {historico
          .slice()
          .reverse()
          .map((evento, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-3">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${CORES_STATUS[evento.status]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">
                  {rotulo(evento.status)}
                  {evento.tentativaNumero && evento.tentativaNumero > 1 && (
                    <span className="codigo ml-2 text-xs text-status-aguardando">
                      tentativa {evento.tentativaNumero}
                    </span>
                  )}
                </p>
                {evento.observacao && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{evento.observacao}</p>
                )}
              </div>
              <span className="codigo shrink-0 text-xs text-muted-foreground">
                {formatarData(evento.criadoEm)}
              </span>
            </div>
          ))}
      </div>
    </Card>
  );
}
