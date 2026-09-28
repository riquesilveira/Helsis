import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  CalendarClock,
  Clock,
  Users,
  UsersRound,
  Stethoscope,
  ScrollText,
  Timer,
  type LucideIcon,
} from "lucide-react";

/**
 * Configuração da navegação lateral. Cada item preserva a lógica de permissão
 * original (`restritoA`): `undefined` = visível a todos os papéis; caso
 * contrário, só aos papéis listados. A filtragem acontece no AppSidebar via
 * `usuarioLogado()`.
 */
export interface NavItemConfig {
  to: string;
  rotulo: string;
  /** true = rota casada de forma exata (só o `/` raiz usa isso). */
  exato?: boolean;
  /** Papéis com acesso; ausente = todos. */
  restritoA?: string[];
  icone: LucideIcon;
}

export interface NavGroupConfig {
  titulo: string;
  itens: NavItemConfig[];
}

export const NAV_GROUPS: NavGroupConfig[] = [
  {
    titulo: "Geral",
    itens: [
      // Painel = visão gerencial (financeiro da empresa). O técnico não vê;
      // ele cai direto na "Minha rota" ao entrar.
      { to: "/", rotulo: "Painel", exato: true, restritoA: ["DONO", "GESTOR", "SUPORTE"], icone: LayoutDashboard },
    ],
  },
  {
    titulo: "Operação",
    itens: [
      { to: "/minha-rota", rotulo: "Minha rota", restritoA: ["TECNICO"], icone: MapPin },
      { to: "/ordens-servico", rotulo: "Ordens de serviço", icone: ClipboardList },
      // Agenda de preventivas e base de clientes são visões de planejamento/
      // gestão — não aparecem para o técnico (N1).
      { to: "/manutencoes-preventivas", rotulo: "Manutenções preventivas", restritoA: ["DONO", "GESTOR", "SUPORTE"], icone: CalendarClock },
      { to: "/clientes", rotulo: "Clientes", restritoA: ["DONO", "GESTOR", "SUPORTE"], icone: Users },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { to: "/funcionarios", rotulo: "Equipe & desempenho", restritoA: ["DONO", "GESTOR"], icone: UsersRound },
      { to: "/produtividade", rotulo: "Comparativo de produtividade", restritoA: ["DONO", "GESTOR"], icone: Timer },
      { to: "/contratos", rotulo: "Contratos & SLA", restritoA: ["DONO", "GESTOR"], icone: ScrollText },
      { to: "/catalogo-diagnostico", rotulo: "Catálogo de diagnóstico", restritoA: ["DONO", "GESTOR"], icone: Stethoscope },
      { to: "/folha-de-ponto", rotulo: "Folha de ponto", restritoA: ["DONO", "GESTOR", "SUPORTE", "TECNICO"], icone: Clock },
    ],
  },
];

export const ROTULO_PAPEL: Record<string, string> = {
  DONO: "Diretor Técnico",
  GESTOR: "Gestor",
  SUPORTE: "Suporte Técnico",
  TECNICO: "Técnico",
  CLIENTE: "Cliente",
};
