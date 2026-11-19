import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../services/api";
import { StatusHistoricoItem, StatusOS } from "../../types";
import { StatusTimeline } from "../../components/StatusTimeline";
import { Button } from "../../components/shadcn/button";
import { formatarNumeroOS } from "../../utils/formatters";

interface AcompanhamentoPublico {
  numero: number;
  statusAtual: StatusOS;
  equipamento: { tipo: string; marca?: string; modelo?: string };
  statusHistoricos: StatusHistoricoItem[];
}

// J-3: o que acontece a seguir, em texto simples para o cliente. Sem texto
// para um status, a linha não aparece.
const PROXIMO_PASSO: Partial<Record<StatusOS, string>> = {
  RECEBIDO: "Próximo passo: a equipe vai analisar o chamado e agendar o atendimento.",
  DIAGNOSTICO: "Próximo passo: o técnico está identificando a causa do problema.",
  AGUARDANDO_PECA: "Próximo passo: assim que a peça chegar, o reparo continua.",
  EM_REPARO: "Próximo passo: o técnico termina o reparo e testa o equipamento.",
  AGUARDANDO_VALIDACAO: "Próximo passo: validação final antes de liberar o equipamento.",
  CONCLUIDO: "O equipamento está liberado. Se o problema voltar, fale com a assistência técnica.",
  CANCELADO: "Se precisar de um novo atendimento, fale com a assistência técnica.",
};

/**
 * Tela que o cliente acessa por um link público (ex: enviado por WhatsApp/SMS)
 * para acompanhar o atendimento sem precisar criar conta — igual rastreio
 * de encomenda. Não se atualiza sozinha (evita carga na rota pública): mostra
 * a hora da última busca e um botão "Atualizar".
 */
export function AcompanharOS() {
  const { id } = useParams();
  const [dados, setDados] = useState<AcompanhamentoPublico | null>(null);
  const [erro, setErro] = useState<"nao-encontrado" | "falha" | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const [buscando, setBuscando] = useState(false);
  const ativo = useRef(true);

  const buscar = useCallback(() => {
    setBuscando(true);
    api
      .get(`/ordens-servico/${id}/acompanhamento-publico`)
      .then((r) => {
        if (!ativo.current) return;
        setDados(r.data);
        setErro(null);
        setAtualizadoEm(new Date());
      })
      .catch((err: any) => {
        if (!ativo.current) return;
        // Se já há dados na tela, uma falha momentânea não apaga o que o
        // cliente está vendo; o aviso aparece junto do botão "Atualizar".
        const status: number | undefined = err?.response?.status;
        setErro(status === 404 || status === 400 ? "nao-encontrado" : "falha");
      })
      .finally(() => {
        if (ativo.current) setBuscando(false);
      });
  }, [id]);

  useEffect(() => {
    ativo.current = true;
    buscar();
    return () => {
      ativo.current = false;
    };
  }, [buscar]);

  if (!dados && erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4">
        <div className="max-w-sm text-center">
          <p className="text-base font-semibold text-foreground">
            {erro === "nao-encontrado"
              ? "Não encontramos esse atendimento."
              : "Não conseguimos carregar agora."}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {erro === "nao-encontrado" ? "Confira o link que você recebeu." : "Tente de novo."}
          </p>
          {erro === "falha" && (
            <Button className="mt-5" onClick={buscar} disabled={buscando}>
              {buscando ? "Carregando..." : "Tentar de novo"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted px-4 py-10">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <p className="codigo text-xs text-muted-foreground">ATENDIMENTO Nº {formatarNumeroOS(dados.numero)}</p>
          <h1 className="text-lg font-semibold text-foreground mt-1">{dados.equipamento.tipo}</h1>
          {dados.equipamento.marca && (
            <p className="text-sm text-muted-foreground">
              {dados.equipamento.marca} {dados.equipamento.modelo}
            </p>
          )}
        </div>

        {PROXIMO_PASSO[dados.statusAtual] && (
          <p className="rounded-lg bg-card px-4 py-3 text-sm text-foreground ring-1 ring-foreground/10">
            {PROXIMO_PASSO[dados.statusAtual]}
          </p>
        )}

        <StatusTimeline historico={dados.statusHistoricos} statusAtual={dados.statusAtual} paraCliente />

        <div className="flex flex-col items-center gap-2 text-center" aria-live="polite">
          {atualizadoEm && (
            <p className="text-xs text-muted-foreground">
              Atualizado às{" "}
              {atualizadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          <Button variant="outline" size="sm" onClick={buscar} disabled={buscando}>
            {buscando ? "Atualizando..." : "Atualizar"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Toque em Atualizar para ver o andamento mais recente.
          </p>
          {erro === "falha" && (
            <p className="text-xs text-danger">Não conseguimos atualizar agora. Tente de novo.</p>
          )}
        </div>
      </div>
    </div>
  );
}
