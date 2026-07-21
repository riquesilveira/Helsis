import { HTMLAttributes } from "react";

/**
 * Superfície de conteúdo padrão. Usa a classe `.card` (branco, cantos
 * arredondados, borda suave, sem sombra — design plano). Passe `interativo`
 * para dar um hover sutil de borda em cards clicáveis.
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
        interativo ? "transition-colors hover:border-grafite-300" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
