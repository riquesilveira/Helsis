import { NavLink, useNavigate } from "react-router-dom";
import { usuarioLogado } from "../../services/auth";

const LINKS = [
  { to: "/", rotulo: "Painel", fim: true, restritoA: null as string[] | null },
  { to: "/minha-rota", rotulo: "Minha rota", fim: false, restritoA: ["TECNICO"] },
  { to: "/ordens-servico", rotulo: "Ordens de serviço", fim: false, restritoA: null as string[] | null },
  { to: "/manutencoes-preventivas", rotulo: "Manutenções preventivas", fim: false, restritoA: null as string[] | null },
  { to: "/clientes", rotulo: "Clientes", fim: false, restritoA: null as string[] | null },
  { to: "/funcionarios", rotulo: "Equipe & desempenho", fim: false, restritoA: ["DONO", "GESTOR"] },
];

const ROTULO_PAPEL: Record<string, string> = {
  DONO: "Proprietário",
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
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.fim}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-teal-600 text-white"
                  : "text-grafite-200 hover:bg-grafite-800"
              }`
            }
          >
            {link.rotulo}
          </NavLink>
        ))}
      </nav>

      {usuario && (
        <div className="px-5 py-4 border-t border-grafite-800">
          <p className="text-sm font-medium text-grafite-100 truncate">{usuario.nome}</p>
          <p className="text-xs text-grafite-400 mt-0.5">{ROTULO_PAPEL[usuario.papel] ?? usuario.papel}</p>
          <button
            onClick={sair}
            className="mt-3 text-xs text-grafite-400 hover:text-grafite-200 transition-colors"
          >
            Sair da conta
          </button>
        </div>
      )}
    </aside>
  );
}
