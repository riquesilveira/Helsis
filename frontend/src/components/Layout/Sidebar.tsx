import { NavLink } from "react-router-dom";
import { usuarioLogado } from "../../services/auth";

const LINKS = [
  { to: "/", rotulo: "Painel", fim: true, restritoA: null as string[] | null },
  { to: "/minha-rota", rotulo: "Minha rota", fim: false, restritoA: ["TECNICO"] },
  { to: "/ordens-servico", rotulo: "Ordens de serviço", fim: false, restritoA: null as string[] | null },
  { to: "/manutencoes-preventivas", rotulo: "Manutenções preventivas", fim: false, restritoA: null as string[] | null },
  { to: "/clientes", rotulo: "Clientes", fim: false, restritoA: null as string[] | null },
  { to: "/funcionarios", rotulo: "Equipe & desempenho", fim: false, restritoA: ["DONO", "GESTOR"] },
];

export function Sidebar() {
  const usuario = usuarioLogado();
  const links = LINKS.filter(
    (link) => !link.restritoA || (usuario && link.restritoA.includes(usuario.papel))
  );

  return (
    <aside className="w-60 flex-shrink-0 bg-grafite-950 text-grafite-100 min-h-screen flex flex-col print:hidden">
      <div className="px-5 py-5 border-b border-grafite-800">
        <p className="font-semibold tracking-tight text-center">Helsis OS</p>
        <p className="text-xs text-grafite-400 mt-0.5">
          {usuario ? usuario.nome : "Painel de gestão"}
        </p>
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
    </aside>
  );
}
