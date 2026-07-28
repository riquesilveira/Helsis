import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Settings } from "lucide-react";
import { usuarioLogado } from "../../services/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../shadcn/dropdown-menu";
import { ROTULO_PAPEL } from "./nav-data";

type Lado = "top" | "right" | "bottom" | "left";
type Alinhamento = "start" | "center" | "end";

/**
 * Menu do usuário compartilhado (identidade + Configurações + Sair). O gatilho
 * é injetado via `trigger` para reaproveitar o mesmo conteúdo tanto no rodapé
 * da sidebar quanto nas ações do header. A lógica de logout é idêntica à do
 * layout anterior (limpa token/usuario e volta ao /login).
 */
export function UserMenu({
  trigger,
  side = "bottom",
  align = "end",
}: {
  trigger: ReactNode;
  side?: Lado;
  align?: Alinhamento;
}) {
  const usuario = usuarioLogado();
  const navigate = useNavigate();

  function sair() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} sideOffset={4} className="min-w-56">
        {usuario && (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col">
                <span className="truncate text-sm font-medium text-foreground">{usuario.nome}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {ROTULO_PAPEL[usuario.papel] ?? usuario.papel}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link to="/configuracoes">
            <Settings />
            Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={sair}
          className="text-danger focus:text-danger"
        >
          <LogOut />
          Sair da conta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
