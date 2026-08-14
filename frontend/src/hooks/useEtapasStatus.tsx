import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { StatusOS } from "../types";

export interface EtapaConfig {
  status: StatusOS;
  rotulo: string;
  rotuloCliente: string;
  ordem: number;
  ativo: boolean;
}

// Default estático — espelha o seed do backend. Serve como estado inicial (pra
// nunca haver flash de "sem dados") e como fallback caso a API de configuração
// não responda. A ordem aqui é a ordem canônica do fluxo.
export const ETAPAS_PADRAO: EtapaConfig[] = [
  { status: "RECEBIDO", ordem: 0, rotulo: "Recebido", rotuloCliente: "Recebemos seu chamado", ativo: true },
  { status: "DIAGNOSTICO", ordem: 1, rotulo: "Em diagnóstico", rotuloCliente: "Seu equipamento está em diagnóstico", ativo: true },
  { status: "AGUARDANDO_PECA", ordem: 2, rotulo: "Aguardando peça", rotuloCliente: "Aguardando chegada de peça", ativo: true },
  { status: "EM_REPARO", ordem: 3, rotulo: "Em reparo", rotuloCliente: "Seu equipamento está em reparo", ativo: true },
  { status: "AGUARDANDO_VALIDACAO", ordem: 4, rotulo: "Aguardando validação", rotuloCliente: "O reparo foi finalizado e está passando pela validação final", ativo: true },
  { status: "CONCLUIDO", ordem: 5, rotulo: "Concluído", rotuloCliente: "O reparo foi concluído e o equipamento já está liberado para uso", ativo: true },
  { status: "CANCELADO", ordem: 6, rotulo: "Cancelado", rotuloCliente: "O atendimento foi cancelado", ativo: true },
];

// Etapas cujo `ativo` não pode ser desligado (entrada + desfechos). Espelha a
// regra do backend — usada pela UI de configuração para travar o toggle.
export const ETAPAS_OBRIGATORIAS: StatusOS[] = ["RECEBIDO", "CONCLUIDO", "CANCELADO"];

interface EtapasStatusContexto {
  /** Todas as etapas, na ordem configurada (inclui inativas e CANCELADO). */
  etapas: EtapaConfig[];
  /** Rótulo interno de um status (fallback: o próprio código). */
  rotulo: (status: StatusOS) => string;
  /** Trilha visual: ativas, sem CANCELADO, na ordem. */
  etapasTrilha: EtapaConfig[];
  /** Opções de avanço de status: ativas, na ordem (inclui CANCELADO). */
  opcoes: EtapaConfig[];
  /** Recarrega a config do backend (após salvar na tela de Configurações). */
  recarregar: () => Promise<void>;
}

const Contexto = createContext<EtapasStatusContexto | null>(null);

function ordenar(lista: EtapaConfig[]) {
  return [...lista].sort((a, b) => a.ordem - b.ordem);
}

export function EtapasStatusProvider({ children }: { children: React.ReactNode }) {
  const [etapas, setEtapas] = useState<EtapaConfig[]>(ETAPAS_PADRAO);

  async function carregar() {
    try {
      const { data } = await api.get<EtapaConfig[]>("/configuracoes/etapas");
      if (Array.isArray(data) && data.length) {
        setEtapas(ordenar(data));
      }
    } catch {
      // mantém o default estático — a UI continua funcionando normalmente
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const valor = useMemo<EtapasStatusContexto>(() => {
    const mapa = new Map(etapas.map((e) => [e.status, e]));
    return {
      etapas,
      rotulo: (status) => mapa.get(status)?.rotulo ?? status,
      etapasTrilha: ordenar(etapas.filter((e) => e.ativo && e.status !== "CANCELADO")),
      opcoes: ordenar(etapas.filter((e) => e.ativo)),
      recarregar: carregar,
    };
  }, [etapas]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useEtapasStatus() {
  const ctx = useContext(Contexto);
  if (!ctx) {
    // Fora do provider (não deve acontecer em runtime), degrada pro default.
    const mapa = new Map(ETAPAS_PADRAO.map((e) => [e.status, e]));
    return {
      etapas: ETAPAS_PADRAO,
      rotulo: (status: StatusOS) => mapa.get(status)?.rotulo ?? status,
      etapasTrilha: ETAPAS_PADRAO.filter((e) => e.status !== "CANCELADO"),
      opcoes: ETAPAS_PADRAO,
      recarregar: async () => {},
    } satisfies EtapasStatusContexto;
  }
  return ctx;
}
