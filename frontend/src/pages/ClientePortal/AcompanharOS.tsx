import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../services/api";
import { StatusHistoricoItem, StatusOS } from "../../types";
import { StatusTimeline } from "../../components/StatusTimeline";
import { formatarNumeroOS } from "../../utils/formatters";

interface AcompanhamentoPublico {
  numero: number;
  statusAtual: StatusOS;
  equipamento: { tipo: string; marca?: string; modelo?: string };
  statusHistoricos: StatusHistoricoItem[];
}

// De quanto em quanto tempo a página busca o andamento de novo.
const INTERVALO_ATUALIZACAO_MS = 60_000;

/**
 * Tela que o cliente acessa por um link público (ex: enviado por WhatsApp/SMS)
 * para acompanhar o atendimento sem precisar criar conta — igual rastreio
 * de encomenda.
 */
export function AcompanharOS() {
  const { id } = useParams();
  const [dados, setDados] = useState<AcompanhamentoPublico | null>(null);
  const [erro, setErro] = useState<"nao-encontrado" | "falha" | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);

  useEffect(() => {
    let ativo = true;

    function buscar() {
      api
        .get(`/ordens-servico/${id}/acompanhamento-publico`)
        .then((r) => {
          if (!ativo) return;
          setDados(r.data);
          setErro(null);
          setAtualizadoEm(new Date());
        })
        .catch((err: any) => {
          if (!ativo) return;
          // Se já há dados na tela, uma falha momentânea não apaga o que o
          // cliente está vendo — a próxima rodada tenta de novo.
          const status: number | undefined = err?.response?.status;
          setErro(status === 404 || status === 400 ? "nao-encontrado" : "falha");
        });
    }

    buscar();
    const timer = setInterval(buscar, INTERVALO_ATUALIZACAO_MS);
    // Ao voltar para a aba (ex.: depois de trocar de app no celular), atualiza na hora.
    const aoVoltar = () => {
      if (document.visibilityState === "visible") buscar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      ativo = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [id]);

  if (!dados && erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4">
        <div className="max-w-sm text-center">
          <p className="text-base font-semibold text-foreground">
            {erro === "nao-encontrado"
              ? "Não encontramos esse atendimento"
              : "Não foi possível carregar o atendimento"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {erro === "nao-encontrado"
              ? "Confira se o link está completo. Se o problema continuar, fale com a assistência técnica que enviou o link."
              : "Verifique sua conexão. Vamos tentar de novo automaticamente em instantes."}
          </p>
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

        <StatusTimeline historico={dados.statusHistoricos} statusAtual={dados.statusAtual} paraCliente />

        <p className="text-xs text-center text-muted-foreground" aria-live="polite">
          Esta página se atualiza sozinha a cada minuto.
          {atualizadoEm &&
            ` Última atualização às ${atualizadoEm.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}.`}
          {erro === "falha" && " Sem conexão no momento — tentando de novo."}
        </p>
      </div>
    </div>
  );
}
