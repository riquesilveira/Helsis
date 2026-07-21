import { ButtonHTMLAttributes } from "react";

type Variante = "primary" | "secondary" | "ghost" | "danger";
type Tamanho = "md" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition select-none disabled:opacity-60 disabled:pointer-events-none focus:outline-none";

const VARIANTES: Record<Variante, string> = {
  primary:
    "bg-teal-600 text-white shadow-sm hover:bg-teal-700 active:bg-teal-700 focus:shadow-focus-teal",
  secondary:
    "bg-white text-grafite-800 border border-grafite-200 hover:bg-grafite-50 hover:border-grafite-300",
  ghost: "text-grafite-600 hover:bg-grafite-100 hover:text-grafite-900",
  danger: "bg-status-cancelado text-white hover:opacity-90",
};

const TAMANHOS: Record<Tamanho, string> = {
  md: "text-sm px-4 py-2.5",
  sm: "text-xs px-3 py-2",
};

/** String de classes reutilizável — útil para aplicar em `<Link>` do router. */
export function classeBotao(variante: Variante = "primary", tamanho: Tamanho = "md") {
  return `${BASE} ${VARIANTES[variante]} ${TAMANHOS[tamanho]}`;
}

export function Button({
  variante = "primary",
  tamanho = "md",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; tamanho?: Tamanho }) {
  return (
    <button className={`${classeBotao(variante, tamanho)} ${className}`} {...props}>
      {children}
    </button>
  );
}
