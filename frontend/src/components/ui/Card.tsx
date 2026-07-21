import { HTMLAttributes } from "react";

/**
 * Superfície de conteúdo padrão. Usa a classe `.card` (branco, cantos
 * arredondados, borda suave, sombra). Passe `interativo` para dar hover
 * de elevação em cards clicáveis.
 */
export function Card({
  className = "",
  interativo = false,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interativo?: boolean }) {
  return (
    <div
      className={`card ${
        interativo ? "transition hover:shadow-card-hover hover:-translate-y-0.5" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
