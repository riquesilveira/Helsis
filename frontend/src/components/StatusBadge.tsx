import { StatusOS, TipoOS } from "../types";
import { useEtapasStatus } from "../hooks/useEtapasStatus";
import { Badge } from "./shadcn/badge";

// Fundo suave (12% da cor) + anel sutil + texto forte, usando os tokens de
// status. Cada etapa tem cor própria pra ser reconhecida num relance.
const CLASSE_STATUS: Record<StatusOS, string> = {
  RECEBIDO: "bg-status-recebido/12 text-status-recebido ring-1 ring-inset ring-status-recebido/20",
  DIAGNOSTICO: "bg-status-diagnostico/12 text-status-diagnostico ring-1 ring-inset ring-status-diagnostico/20",
  AGUARDANDO_PECA: "bg-status-aguardando/12 text-status-aguardando ring-1 ring-inset ring-status-aguardando/20",
  EM_REPARO: "bg-status-reparo/12 text-status-reparo ring-1 ring-inset ring-status-reparo/20",
  AGUARDANDO_VALIDACAO: "bg-status-validacao/12 text-status-validacao ring-1 ring-inset ring-status-validacao/20",
  CONCLUIDO: "bg-status-concluido/12 text-status-concluido ring-1 ring-inset ring-status-concluido/20",
  CANCELADO: "bg-status-cancelado/12 text-status-cancelado ring-1 ring-inset ring-status-cancelado/20",
};

const PONTO_STATUS: Record<StatusOS, string> = {
  RECEBIDO: "bg-status-recebido",
  DIAGNOSTICO: "bg-status-diagnostico",
  AGUARDANDO_PECA: "bg-status-aguardando",
  EM_REPARO: "bg-status-reparo",
  AGUARDANDO_VALIDACAO: "bg-status-validacao",
  CONCLUIDO: "bg-status-concluido",
  CANCELADO: "bg-status-cancelado",
};

export function StatusBadge({ status, className = "" }: { status: StatusOS; className?: string }) {
  const { rotulo } = useEtapasStatus();
  return (
    <Badge className={`gap-1.5 border-transparent ${CLASSE_STATUS[status]} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${PONTO_STATUS[status]}`} />
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
