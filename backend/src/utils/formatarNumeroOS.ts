// Número da OS exibido como protocolo agrupado em pares (ex.: 132750 → 13-27-50).
// É só máscara de exibição: no banco continua um inteiro sequencial. Preenche
// com zeros à esquerda até 6 dígitos, então insere "-" a cada 2 dígitos.
// Espelha o util de mesmo nome no frontend (frontend/src/utils/formatters.ts).
export function formatarNumeroOS(numero: number): string {
  return String(numero).padStart(6, "0").replace(/(\d{2})(?=\d)/g, "$1-");
}
