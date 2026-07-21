import { ReactNode } from "react";

/**
 * Cabeçalho de página consistente: título forte, subtítulo opcional e uma
 * área de ações à direita (botões, filtros). Padroniza a hierarquia no topo
 * de cada tela.
 */
export function PageHeader({
  titulo,
  subtitulo,
  acoes,
}: {
  titulo: string;
  subtitulo?: string;
  acoes?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-grafite-900">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-grafite-500">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex items-center gap-2">{acoes}</div>}
    </div>
  );
}
