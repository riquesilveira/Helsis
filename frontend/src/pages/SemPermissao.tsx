import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { classeBotao } from "../components/ui/Button";
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
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
        <ShieldAlert size={32} />
      </div>
      <h1 className="text-lg font-semibold text-grafite-900">Acesso restrito</h1>
      <p className="mt-2 max-w-sm text-sm text-grafite-500">
        Você não tem permissão para acessar esta página
        {papel ? (
          <>
            {" "}
            com o perfil <span className="font-medium text-grafite-700">{papel}</span>.
          </>
        ) : (
          "."
        )}{" "}
        Se acredita que isso é um engano, fale com o responsável técnico.
      </p>
      <Link to="/" className={`${classeBotao("primary")} mt-6`}>
        Voltar ao início
      </Link>
    </div>
  );
}
