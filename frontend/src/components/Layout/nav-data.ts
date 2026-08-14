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
      { to: "/", rotulo: "Painel", exato: true, icone: LayoutDashboard },
    ],
  },
  {
    titulo: "Operação",
    itens: [
      { to: "/minha-rota", rotulo: "Minha rota", restritoA: ["TECNICO"], icone: MapPin },
      { to: "/ordens-servico", rotulo: "Ordens de serviço", icone: ClipboardList },
      { to: "/manutencoes-preventivas", rotulo: "Manutenções preventivas", icone: CalendarClock },
      { to: "/clientes", rotulo: "Clientes", icone: Users },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { to: "/funcionarios", rotulo: "Equipe & desempenho", restritoA: ["DONO", "GESTOR"], icone: UsersRound },
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
