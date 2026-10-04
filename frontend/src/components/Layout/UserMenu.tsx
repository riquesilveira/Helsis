import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Plus, Settings, X } from "lucide-react";
import { usuarioLogado } from "../../services/auth";
import {
  cofreCheio,
  contaAtivaId,
  listarContas,
  migrarSessaoAtiva,
  removerConta,
  sairDeTodas,
  trocarPara,
  type ContaSalva,
} from "../../services/accountVault";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../shadcn/dropdown-menu";
import { Avatar, AvatarFallback } from "../shadcn/avatar";
import { ROTULO_PAPEL } from "./nav-data";

type Lado = "top" | "right" | "bottom" | "left";
type Alinhamento = "start" | "center" | "end";

function inicial(nome: string) {
  return nome.trim().charAt(0).toUpperCase();
}

/**
 * Menu do usuário compartilhado (identidade + trocador de contas + Configurações
 * + Sair). O gatilho é injetado via `trigger` para reaproveitar o mesmo conteúdo
 * tanto no rodapé da sidebar quanto nas ações do header.
 *
 * Trocador de contas: lista as contas salvas no cofre (ver accountVault.ts),
 * marca a ativa, e permite alternar sem relogar. "Sair da conta" sai só da atual
 * e cai na próxima salva (estilo Google); "Sair de todas" limpa o cofre.
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
  const [contas, setContas] = useState<ContaSalva[]>([]);
  const ativaId = contaAtivaId();

  useEffect(() => {
    // Garante que a sessão corrente esteja no cofre (contas logadas antes desta
    // feature existir) e carrega a lista pra exibição.
    migrarSessaoAtiva();
    setContas(listarContas());
  }, []);

  const outrasContas = contas.filter((c) => c.usuario.id !== ativaId);

  function sairDaAtual() {
    if (ativaId) {
      removerConta(ativaId);
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      navigate("/login");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} sideOffset={4} className="min-w-64">
        {usuario && (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {inicial(usuario.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">{usuario.nome}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {ROTULO_PAPEL[usuario.papel] ?? usuario.papel}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Outras contas salvas — clicar troca pra ela. */}
        {outrasContas.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Trocar de conta
            </DropdownMenuLabel>
            {outrasContas.map((conta) => (
              <DropdownMenuItem
                key={conta.usuario.id}
                className="gap-2"
                onSelect={() => trocarPara(conta.usuario.id)}
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-muted text-xs text-foreground">
                    {inicial(conta.usuario.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm text-foreground">{conta.usuario.nome}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {ROTULO_PAPEL[conta.usuario.papel] ?? conta.usuario.papel}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={`Remover ${conta.usuario.nome}`}
                  className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground pointer-coarse:size-9"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removerConta(conta.usuario.id);
                    setContas(listarContas());
                  }}
                >
                  <X className="size-3.5" />
                </button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        {/* Adicionar outra conta (vai pro login sem derrubar a sessão atual). */}
        <DropdownMenuItem
          disabled={cofreCheio()}
          onSelect={() => navigate("/login")}
        >
          <Plus />
          {cofreCheio() ? "Limite de contas atingido" : "Adicionar outra conta"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/configuracoes">
            <Settings />
            Configurações
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={sairDaAtual} className="text-danger focus:text-danger">
          <LogOut />
          Sair da conta
        </DropdownMenuItem>
        {outrasContas.length > 0 && (
          <DropdownMenuItem
            onSelect={() => sairDeTodas()}
            className="text-danger focus:text-danger"
          >
            <LogOut />
            Sair de todas as contas
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
