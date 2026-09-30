import { StatusOS, TipoOS } from "../types";
import { useEtapasStatus } from "../hooks/useEtapasStatus";
import { Badge } from "./shadcn/badge";

// Pill sólida: cor cheia do status + texto branco. Cada etapa tem a sua cor,
// bem destacada, pra ser reconhecida num relance.
const CLASSE_STATUS: Record<StatusOS, string> = {
  RECEBIDO: "bg-status-recebido text-white",
  DIAGNOSTICO: "bg-status-diagnostico text-white",
  AGUARDANDO_PECA: "bg-status-aguardando text-white",
  EM_REPARO: "bg-status-reparo text-white animate-pulse",
  AGUARDANDO_VALIDACAO: "bg-status-validacao text-white",
  CONCLUIDO: "bg-status-concluido text-white",
  CANCELADO: "bg-status-cancelado text-white",
};

export function StatusBadge({ status, className = "" }: { status: StatusOS; className?: string }) {
  const { rotulo } = useEtapasStatus();
  return (
    <Badge className={`border-transparent font-medium ${CLASSE_STATUS[status]} ${className}`}>
      {rotulo(status)}
    </Badge>
  );
}

export function TipoBadge({ tipo, className = "" }: { tipo: TipoOS; className?: string }) {
  const corretiva = tipo === "CORRETIVA";
  return (
    <Badge
      className={`border-transparent ${
        corretiva ? "bg-warning/10 text-warning" : "bg-secondary text-muted-foreground"
      } ${className}`}
    >
      {corretiva ? "Corretiva" : "Preventiva"}
    </Badge>
  );
}
