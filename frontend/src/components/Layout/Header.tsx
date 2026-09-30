import { usuarioLogado } from "../../services/auth";
import { SidebarTrigger } from "../shadcn/sidebar";
import { Avatar, AvatarFallback } from "../shadcn/avatar";
import { UserMenu } from "./UserMenu";

function inicial(nome: string) {
  return nome.trim().charAt(0).toUpperCase();
}

/**
 * Top bar enxuta: no mobile, o gatilho abre/fecha a sidebar (que é um drawer);
 * no desktop, o colapso fica dentro da própria sidebar. Sem breadcrumb — a
 * navegação de contexto (voltar + título) fica na própria página.
 */
export function Header() {
  const usuario = usuarioLogado();

  return (
    <header
      data-slot="app-header"
      className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-lg"
    >
      <SidebarTrigger className="-ml-1 md:hidden" />

      <div className="ml-auto flex items-center gap-2">
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
