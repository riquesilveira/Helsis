import { ReactNode } from "react";
import { X } from "lucide-react";

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-grafite-950/40 backdrop-blur-sm px-4"
      onMouseDown={onFechar}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-grafite-100 shadow-dropdown animate-fade-in"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-grafite-100">
          <h2 className="text-base font-semibold text-grafite-900">{titulo}</h2>
          <button
            onClick={onFechar}
            className="text-grafite-400 hover:text-grafite-700 hover:bg-grafite-100 rounded-lg p-1 transition"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
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
    <label className="block mb-4">
      <span className="block text-xs font-medium text-grafite-600 mb-1.5">{rotulo}</span>
      {children}
    </label>
  );
}

export const classeInput = "input-base";
