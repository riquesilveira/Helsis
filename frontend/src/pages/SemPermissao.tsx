import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "../components/shadcn/button";
import { usuarioLogado } from "../services/auth";

const ROTULO_PAPEL: Record<string, string> = {
  DONO: "Diretor Técnico",
  GESTOR: "Gestor",
  SUPORTE: "Suporte Técnico",
  TECNICO: "Técnico",
  CLIENTE: "Cliente",
};

export function SemPermissao() {
  const usuario = usuarioLogado();
  const papel = usuario ? ROTULO_PAPEL[usuario.papel] ?? usuario.papel : null;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <ShieldAlert size={32} />
      </div>
      <h1 className="text-lg font-semibold text-foreground">Acesso restrito</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Você não tem permissão para acessar esta página
        {papel ? (
          <>
            {" "}
            com o perfil <span className="font-medium text-foreground">{papel}</span>.
          </>
        ) : (
          "."
        )}{" "}
        Se acredita que isso é um engano, fale com o responsável técnico.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
