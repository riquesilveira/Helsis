import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import { Button } from "../components/shadcn/button";

/** Rota coringa: endereço que não existe no app (link antigo, digitação errada). */
export function NaoEncontrada() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <SearchX size={32} />
      </div>
      <h1 className="text-lg font-semibold text-foreground">Página não encontrada</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Esse endereço não existe ou mudou de lugar. Confira o link ou volte para o início.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
