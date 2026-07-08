import { ReactNode } from "react";

export function Modal({
  titulo,
  aberto,
  onFechar,
  children,
}: {
  titulo: string;
  aberto: boolean;
  onFechar: () => void;
  children: ReactNode;
}) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-grafite-950/50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg border border-grafite-200 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-grafite-100">
          <h2 className="text-sm font-semibold text-grafite-900">{titulo}</h2>
          <button
            onClick={onFechar}
            className="text-grafite-400 hover:text-grafite-700 text-sm"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Campo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <label className="block mb-3">
      <span className="block text-xs text-grafite-600 mb-1">{rotulo}</span>
      {children}
    </label>
  );
}

export const classeInput =
  "w-full border border-grafite-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";
