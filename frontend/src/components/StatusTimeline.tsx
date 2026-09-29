import { Check } from "lucide-react";
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

const TEXTO_STATUS: Record<StatusOS, string> = {
  RECEBIDO: "text-status-recebido",
  DIAGNOSTICO: "text-status-diagnostico",
  AGUARDANDO_PECA: "text-status-aguardando",
  EM_REPARO: "text-status-reparo",
  AGUARDANDO_VALIDACAO: "text-status-validacao",
  CONCLUIDO: "text-status-concluido",
  CANCELADO: "text-status-cancelado",
};

const ANEL_STATUS: Record<StatusOS, string> = {
  RECEBIDO: "ring-status-recebido/25",
  DIAGNOSTICO: "ring-status-diagnostico/25",
  AGUARDANDO_PECA: "ring-status-aguardando/25",
  EM_REPARO: "ring-status-reparo/25",
  AGUARDANDO_VALIDACAO: "ring-status-validacao/25",
  CONCLUIDO: "ring-status-concluido/25",
  CANCELADO: "ring-status-cancelado/25",
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
 * Linha do tempo do atendimento. Em cima, um stepper com o progresso do fluxo
 * (etapas concluídas com ✓, a etapa atual destacada com anel, as futuras
 * vazias). Embaixo, o registro real de eventos como uma timeline vertical
 * conectada — lê-se como um rastreio de entrega.
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
  const cancelado = statusAtual === "CANCELADO";
  const eventos = historico.slice().reverse();

  return (
    <Card className="gap-0 py-0">
      {/* Stepper do fluxo padrão (o "quanto falta") */}
      <div className="flex items-start overflow-x-auto px-5 pt-5 pb-4">
        {etapasTrilha.map((etapa, i) => {
          const concluida = !cancelado && i < indiceAtual;
          const atual = !cancelado && i === indiceAtual;
          const feito = concluida || atual;
          const cor = CORES_STATUS[etapa.status];
          return (
            <div key={etapa.status} className="flex shrink-0 items-start">
              <div className="flex min-w-[84px] flex-col items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                    concluida
                      ? `${cor} text-white`
                      : atual
                        ? `${cor} text-white ring-2 ring-offset-2 ring-offset-card ${ANEL_STATUS[etapa.status]}`
                        : "border-2 border-border bg-card"
                  }`}
                >
                  {concluida && <Check size={13} strokeWidth={3} />}
                  {atual && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <span
                  className={`text-center text-[11px] leading-tight ${
                    atual
                      ? `font-semibold ${TEXTO_STATUS[etapa.status]}`
                      : concluida
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {etapa.rotulo}
                </span>
              </div>
              {i < etapasTrilha.length - 1 && (
                <div
                  className={`mt-3 h-0.5 w-8 rounded-full ${
                    concluida ? "bg-foreground/30" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Registro real de eventos — timeline vertical conectada (log de rastreio) */}
      <ol className="border-t border-border px-5 py-4">
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
