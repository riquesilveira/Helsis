import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { usuarioLogado } from "../../services/auth";
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  CalendarClock,
  Clock,
  Users,
  UsersRound,
  Stethoscope,
  Settings,
  LogOut,
  ChevronUp,
  Activity,
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
  { to: "/catalogo-diagnostico", rotulo: "Catálogo de diagnóstico", fim: false, restritoA: ["DONO", "GESTOR"], icone: Stethoscope },
  { to: "/folha-de-ponto", rotulo: "Folha de ponto", fim: false, restritoA: ["DONO", "GESTOR", "SUPORTE", "TECNICO"], icone: Clock },
];

const ROTULO_PAPEL: Record<string, string> = {
  DONO: "Diretor Técnico",
  GESTOR: "Gestor",
  SUPORTE: "Suporte Técnico",
  TECNICO: "Técnico",
  CLIENTE: "Cliente",
};

export function Sidebar() {
  const navigate = useNavigate();
  const usuario = usuarioLogado();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const links = LINKS.filter(
    (link) => !link.restritoA || (usuario && link.restritoA.includes(usuario.papel))
  );

  // fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(false);
      }
    }
    if (menuAberto) document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [menuAberto]);

  function sair() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-gradient-to-b from-grafite-950 to-grafite-900 text-grafite-100 min-h-screen flex flex-col border-r border-grafite-800 print:hidden">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-grafite-800/70">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 shadow-[0_0_20px_rgba(15,139,141,0.35)]">
          <Activity size={18} className="text-white" />
        </div>
        <div className="leading-tight">
          <p className="font-semibold tracking-tight text-[15px]">Resso</p>
          <p className="text-[11px] text-grafite-400">Gestão de serviços</p>
        </div>
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
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? "bg-teal-600 text-white font-medium shadow-[0_2px_10px_rgba(15,139,141,0.35)]"
                    : "text-grafite-300 hover:bg-grafite-800/70 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-teal-400" />
                  )}
                  <Icone size={18} className="flex-shrink-0" />
                  {link.rotulo}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {usuario && (
        <div ref={menuRef} className="relative border-t border-grafite-800/70 p-2">
          {/* Dropdown — abre pra cima */}
          {menuAberto && (
            <div className="absolute bottom-full left-2 right-2 mb-1 bg-grafite-900 border border-grafite-700 rounded-xl shadow-dropdown py-1 z-50 animate-fade-in">
              <NavLink
                to="/configuracoes"
                onClick={() => setMenuAberto(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "text-teal-400 bg-grafite-800"
                      : "text-grafite-200 hover:bg-grafite-800"
                  }`
                }
              >
                <Settings size={16} />
                Configurações
              </NavLink>
              <div className="border-t border-grafite-700 my-1" />
              <button
                onClick={() => { setMenuAberto(false); sair(); }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-grafite-800 w-full transition-colors"
              >
                <LogOut size={16} />
                Sair da conta
              </button>
            </div>
          )}

          {/* Botão do perfil */}
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-grafite-800/70 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-[0_0_16px_rgba(15,139,141,0.3)]">
              {usuario.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium text-grafite-100 truncate">{usuario.nome}</p>
              <p className="text-xs text-grafite-400 truncate">{ROTULO_PAPEL[usuario.papel] ?? usuario.papel}</p>
            </div>
            <ChevronUp
              size={16}
              className={`text-grafite-400 flex-shrink-0 transition-transform duration-200 ${
                menuAberto ? "" : "rotate-180"
              }`}
            />
          </button>
        </div>
      )}
    </aside>
  );
}
