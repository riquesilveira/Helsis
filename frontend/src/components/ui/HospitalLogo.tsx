/**
 * Logotipo determinístico por hospital/clínica. Como os clientes são
 * fictícios (sem logo real), geramos uma identidade estável a partir do nome:
 * um gradiente fixo + monograma com as iniciais. Mesmo nome ⇒ mesmo logo,
 * sempre. Funciona offline e cobre qualquer nome novo.
 */

const CONECTORES = new Set(["de", "do", "da", "dos", "das", "e", "por", "em", "—", "-", "&"]);

const GRADIENTES: [string, string][] = [
  ["#0F8B8D", "#0B6E70"], // teal
  ["#4F46E5", "#4338CA"], // indigo
  ["#2563EB", "#1D4ED8"], // blue
  ["#7C3AED", "#6D28D9"], // violet
  ["#E11D48", "#BE123C"], // rose
  ["#D97706", "#B45309"], // amber
  ["#059669", "#047857"], // emerald
  ["#0891B2", "#0E7490"], // cyan
  ["#C026D3", "#A21CAF"], // fuchsia
  ["#475569", "#334155"], // slate
];

/** Par de cores do gradiente estável para um nome — usado no logo e no header. */
export function corHospital(nome: string): [string, string] {
  return GRADIENTES[hash(nome) % GRADIENTES.length];
}

function hash(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) {
    h = (h << 5) - h + texto.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

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
  const [c1, c2] = GRADIENTES[hash(nome) % GRADIENTES.length];
  const raio = Math.round(size * 0.28);

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center overflow-hidden text-white shadow-sm ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: raio,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
      }}
      aria-hidden
      title={nome}
    >
      <span
        className="font-semibold leading-none tracking-tight"
        style={{ fontSize: size * 0.36 }}
      >
        {iniciais(nome)}
      </span>
    </div>
  );
}
