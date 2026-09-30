import { usuarioLogado } from "../../services/auth";
import { SidebarTrigger } from "../shadcn/sidebar";
import { Avatar, AvatarFallback } from "../shadcn/avatar";
import { UserMenu } from "./UserMenu";

function inicial(nome: string) {
  return nome.trim().charAt(0).toUpperCase();
}

/**
 * Top bar. O miolo (#app-header-slot) é um "slot" onde cada página pode injetar
 * o próprio contexto (ex: a tela da OS coloca voltar + cliente + OS + equipamento)
 * via portal. No mobile, o gatilho abre a sidebar; no desktop o colapso fica na
 * própria sidebar.
 */
export function Header() {
  const usuario = usuarioLogado();

  return (
    <header
      data-slot="app-header"
      className="sticky top-0 z-40 flex min-h-16 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 py-2 backdrop-blur-lg"
    >
      <SidebarTrigger className="-ml-1 md:hidden" />

      {/* Slot de contexto por página (preenchido via portal) */}
      <div id="app-header-slot" className="min-w-0 flex-1" />

      <div className="flex shrink-0 items-center gap-2">
        {usuario && (
          <UserMenu
            side="bottom"
            align="end"
            trigger={
              <button
                type="button"
                aria-label="Menu do usuário"
                className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {inicial(usuario.nome)}
                  </AvatarFallback>
                </Avatar>
              </button>
            }
          />
        )}
      </div>
    </header>
  );
}
