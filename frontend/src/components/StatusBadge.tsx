import { StatusOS, TipoOS } from "../types";
import { useEtapasStatus } from "../hooks/useEtapasStatus";
import { Badge } from "./shadcn/badge";

// Fundo suave (10% da cor) + texto forte, usando os tokens de status.
// A maioria dos estados é neutra (cinza); só as exceções/desfechos têm cor.
const CLASSE_STATUS: Record<StatusOS, string> = {
  RECEBIDO: "bg-status-recebido/10 text-status-recebido",
  DIAGNOSTICO: "bg-status-diagnostico/10 text-status-diagnostico",
  AGUARDANDO_PECA: "bg-status-aguardando/10 text-status-aguardando",
  EM_REPARO: "bg-status-reparo/10 text-status-reparo",
  AGUARDANDO_VALIDACAO: "bg-status-validacao/10 text-status-validacao",
  CONCLUIDO: "bg-status-concluido/10 text-status-concluido",
  CANCELADO: "bg-status-cancelado/10 text-status-cancelado",
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
