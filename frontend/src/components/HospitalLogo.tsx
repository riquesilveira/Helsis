import { Avatar, AvatarFallback } from "./shadcn/avatar";

/**
 * Monograma determinístico por hospital/clínica. Como os clientes são
 * fictícios (sem logo real), geramos um avatar estável a partir do nome:
 * iniciais sobre uma superfície neutra (monocromática). Mesmo nome ⇒ mesmo
 * monograma. Funciona offline e cobre qualquer nome novo.
 */

const CONECTORES = new Set(["de", "do", "da", "dos", "das", "e", "por", "em", "—", "-", "&"]);

function iniciais(nome: string): string {
  const palavras = nome
    .split(/[\s—-]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !CONECTORES.has(p.toLowerCase()));
  if (palavras.length === 0) return nome.slice(0, 2).toUpperCase();
  if (palavras.length === 1) return palavras[0].slice(0, 2).toUpperCase();
  return (palavras[0][0] + palavras[1][0]).toUpperCase();
}

export function HospitalLogo({
  nome,
  size = 40,
  className = "",
}: {
  nome: string;
  size?: number;
  className?: string;
}) {
  const raio = Math.round(size * 0.28);

  return (
    <Avatar
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size, borderRadius: raio }}
      title={nome}
    >
      <AvatarFallback
        className="bg-secondary font-semibold tracking-tight text-secondary-foreground"
        style={{ borderRadius: raio, fontSize: size * 0.36 }}
      >
        {iniciais(nome)}
      </AvatarFallback>
    </Avatar>
  );
}
