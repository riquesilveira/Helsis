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
  paraCliente = false,
}: {
  historico: StatusHistoricoItem[];
  statusAtual?: StatusOS;
  /** No portal do cliente, usa o "Texto mostrado ao cliente" de cada etapa
   *  (Configurações › Fluxo de etapas) em vez do rótulo interno. */
  paraCliente?: boolean;
}) {
  const { rotulo: rotuloInterno, etapas } = useEtapasStatus();
  const rotulo = (status: StatusOS) =>
    (paraCliente ? etapas.find((e) => e.status === status)?.rotuloCliente : undefined) ??
    rotuloInterno(status);
  // Uma entrada por etapa: designar/reatribuir o técnico grava um histórico com
  // o MESMO status, que aparecia como um segundo "Recebido". Entradas iguais
  // seguidas viram um evento só (data de quando a etapa começou), com todas as
  // observações embaixo; as que vieram depois levam a própria hora.
  const agrupados: { base: StatusHistoricoItem; notas: { texto: string; criadoEm?: string }[] }[] = [];
  for (const h of historico) {
    const atual = agrupados[agrupados.length - 1];
    if (atual && atual.base.status === h.status) {
      if (h.observacao) atual.notas.push({ texto: h.observacao, criadoEm: h.criadoEm });
    } else {
      agrupados.push({ base: h, notas: h.observacao ? [{ texto: h.observacao }] : [] });
    }
  }
  const eventos = agrupados.reverse();

  return (
    <ol>
      {eventos.map(({ base: evento, notas }, i) => {
        const recente = i === 0;
        const ultimo = i === eventos.length - 1;
        return (
          <li key={i} className="flex gap-3">
            {/* Trilho: bolinha (stroke) + linha vertical até a próxima */}
            <div className="flex flex-col items-center self-stretch">
              <span
                className={`mt-1 h-3 w-3 shrink-0 rounded-full border-[3px] border-solid bg-card ${BORDA_STATUS[evento.status]} ${
                  recente ? "animate-pulse" : ""
                }`}
              />
              {!ultimo && <span className="w-px flex-1 bg-border" />}
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
              {notas.map((nota, j) => (
                <p key={j} className="mt-0.5 text-sm text-muted-foreground">
                  {nota.criadoEm && (
                    <span className="codigo mr-1.5 text-xs">{formatarData(nota.criadoEm)} ·</span>
                  )}
                  {nota.texto}
                </p>
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
