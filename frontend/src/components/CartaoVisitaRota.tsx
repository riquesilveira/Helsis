import { Link } from "react-router-dom";
import { OrdemServico } from "../types";
import { useEtapasStatus } from "../hooks/useEtapasStatus";

// Pill sólida (cor cheia + texto branco), via tokens de status — mesma
// linguagem do StatusBadge.
const COR_STATUS: Record<string, string> = {
  RECEBIDO: "bg-status-recebido text-white",
  DIAGNOSTICO: "bg-status-diagnostico text-white",
  AGUARDANDO_PECA: "bg-status-aguardando text-white",
  EM_REPARO: "bg-status-reparo text-white",
  AGUARDANDO_VALIDACAO: "bg-status-validacao text-white",
  CONCLUIDO: "bg-status-concluido text-white",
  CANCELADO: "bg-status-cancelado text-white",
};

/**
 * Cartão de uma visita na rota do dia — usado tanto na tela do dono
 * ("rota do técnico") quanto na do próprio técnico ("minha rota").
 * Mostra o que foi solicitado e, se já houve progresso, um resumo do que
 * foi feito (último evento + peças trocadas).
 */
export function CartaoVisitaRota({ os }: { os: OrdemServico }) {
  const { rotulo } = useEtapasStatus();
  const ultimoEvento =
    os.statusHistoricos.length > 0 ? os.statusHistoricos[os.statusHistoricos.length - 1] : null;

  return (
    <Link
      to={`/ordens-servico/${os.id}`}
      className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-muted-foreground/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {os.cliente.nome} <span className="text-muted-foreground">·</span> {os.equipamento.tipo}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="text-muted-foreground">Solicitado: </span>
            {os.descricaoProblema}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`codigo rounded-full px-2 py-0.5 text-[11px] font-medium ${COR_STATUS[os.statusAtual]}`}
          >
            {rotulo(os.statusAtual)}
          </span>
          <span className="codigo text-[10px] text-muted-foreground">
            {os.tipo === "PREVENTIVA" ? "preventiva" : "corretiva"}
          </span>
        </div>
      </div>

      {(ultimoEvento || (os.pecasTrocadas && os.pecasTrocadas.length > 0)) && (
        <div className="mt-3 border-t border-border pt-3">
          {ultimoEvento && (
            <p className="text-xs text-muted-foreground">
              <span className="text-muted-foreground">Feito até agora: </span>
              {ultimoEvento.observacao ?? rotulo(ultimoEvento.status)}
            </p>
          )}
          {os.pecasTrocadas && os.pecasTrocadas.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="text-muted-foreground">Peças: </span>
              {os.pecasTrocadas.map((p) => p.pecaCatalogo.nome).join(", ")}
            </p>
          )}
        </div>
      )}
    </Link>
  );
}
