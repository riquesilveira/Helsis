import { StatusOS, TipoOS } from "../types";
import { Badge } from "./shadcn/badge";

const ROTULO_STATUS: Record<StatusOS, string> = {
  RECEBIDO: "Recebido",
  DIAGNOSTICO: "Em diagnóstico",
  AGUARDANDO_PECA: "Aguardando peça",
  EM_REPARO: "Em reparo",
  AGUARDANDO_VALIDACAO: "Aguardando validação",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

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
  return (
    <Badge className={`gap-1.5 border-transparent ${CLASSE_STATUS[status]} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${PONTO_STATUS[status]}`} />
      {ROTULO_STATUS[status] ?? status}
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
