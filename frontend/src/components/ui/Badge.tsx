import { StatusOS, TipoOS } from "../../types";

const ROTULO_STATUS: Record<StatusOS, string> = {
  RECEBIDO: "Recebido",
  DIAGNOSTICO: "Em diagnóstico",
  AGUARDANDO_PECA: "Aguardando peça",
  EM_REPARO: "Em reparo",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

// Cada status carrega sua cor semântica (definida no tailwind.config).
// O fundo usa a mesma cor com 10% de opacidade — pílula suave, texto forte.
const CLASSE_STATUS: Record<StatusOS, string> = {
  RECEBIDO: "bg-status-recebido/10 text-status-recebido",
  DIAGNOSTICO: "bg-status-diagnostico/10 text-status-diagnostico",
  AGUARDANDO_PECA: "bg-status-aguardando/10 text-status-aguardando",
  EM_REPARO: "bg-status-reparo/10 text-status-reparo",
  CONCLUIDO: "bg-status-concluido/10 text-status-concluido",
  CANCELADO: "bg-status-cancelado/10 text-status-cancelado",
};

const PONTO_STATUS: Record<StatusOS, string> = {
  RECEBIDO: "bg-status-recebido",
  DIAGNOSTICO: "bg-status-diagnostico",
  AGUARDANDO_PECA: "bg-status-aguardando",
  EM_REPARO: "bg-status-reparo",
  CONCLUIDO: "bg-status-concluido",
  CANCELADO: "bg-status-cancelado",
};

export function StatusBadge({ status, className = "" }: { status: StatusOS; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${CLASSE_STATUS[status]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${PONTO_STATUS[status]}`} />
      {ROTULO_STATUS[status] ?? status}
    </span>
  );
}

export function TipoBadge({ tipo, className = "" }: { tipo: TipoOS; className?: string }) {
  const corretiva = tipo === "CORRETIVA";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        corretiva ? "bg-status-aguardando/10 text-status-aguardando" : "bg-teal-600/10 text-teal-700"
      } ${className}`}
    >
      {corretiva ? "Corretiva" : "Preventiva"}
    </span>
  );
}

/** Pílula neutra genérica (contagens, metadados). */
export function Chip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-grafite-100 px-2 py-0.5 text-[11px] font-medium text-grafite-600 ${className}`}
    >
      {children}
    </span>
  );
}
