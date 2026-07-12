import { NavLink, useNavigate } from "react-router-dom";
import { usuarioLogado } from "../../services/auth";
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  CalendarClock,
  Users,
  UsersRound,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";

interface LinkConfig {
  to: string;
  rotulo: string;
  fim: boolean;
  restritoA: string[] | null;
  icone: LucideIcon;
}

const LINKS: LinkConfig[] = [
  { to: "/", rotulo: "Painel", fim: true, restritoA: null, icone: LayoutDashboard },
  { to: "/minha-rota", rotulo: "Minha rota", fim: false, restritoA: ["TECNICO"], icone: MapPin },
  { to: "/ordens-servico", rotulo: "Ordens de serviço", fim: false, restritoA: null, icone: ClipboardList },
  { to: "/manutencoes-preventivas", rotulo: "Manutenções preventivas", fim: false, restritoA: null, icone: CalendarClock },
  { to: "/clientes", rotulo: "Clientes", fim: false, restritoA: null, icone: Users },
  { to: "/funcionarios", rotulo: "Equipe & desempenho", fim: false, restritoA: ["DONO", "GESTOR"], icone: UsersRound },
];

const ROTULO_PAPEL: Record<string, string> = {
  DONO: "Diretor Técnico",
  GESTOR: "Gestor",
  TECNICO: "Técnico",
  CLIENTE: "Cliente",
};

export function Sidebar() {
  const navigate = useNavigate();
  const usuario = usuarioLogado();
  const links = LINKS.filter(
    (link) => !link.restritoA || (usuario && link.restritoA.includes(usuario.papel))
  );

  function sair() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-grafite-950 text-grafite-100 min-h-screen flex flex-col print:hidden">
      <div className="px-5 py-5 border-b border-grafite-800">
        <p className="font-semibold tracking-tight text-lg">Resso</p>
        <p className="text-xs text-grafite-400 mt-0.5">Gestão de serviços</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const Icone = link.icone;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.fim}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-teal-600 text-white"
                    : "text-grafite-200 hover:bg-grafite-800"
                }`
              }
            >
              <Icone size={18} className="flex-shrink-0" />
              {link.rotulo}
            </NavLink>
          );
        })}
      </nav>

      {usuario && (
        <div className="px-4 py-4 border-t border-grafite-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {usuario.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-grafite-100 truncate">{usuario.nome}</p>
              <p className="text-xs text-grafite-400 truncate">{ROTULO_PAPEL[usuario.papel] ?? usuario.papel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <NavLink
              to="/configuracoes"
              className={({ isActive }) =>
                `flex items-center gap-1.5 text-xs transition-colors ${
                  isActive ? "text-teal-400" : "text-grafite-400 hover:text-grafite-200"
                }`
              }
            >
              <Settings size={14} />
              Configurações
            </NavLink>
            <span className="text-grafite-700">·</span>
            <button
              onClick={sair}
              className="flex items-center gap-1.5 text-xs text-grafite-400 hover:text-grafite-200 transition-colors"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
