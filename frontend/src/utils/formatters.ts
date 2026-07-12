export function formatarReais(valor: number): string {
  return `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export function tempoRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutos = Math.floor(diffMs / 60_000);
  const horas = Math.floor(diffMs / 3_600_000);
  const dias = Math.floor(diffMs / 86_400_000);

  if (minutos < 1) return "agora mesmo";
  if (minutos < 60) return `há ${minutos} min`;
  if (horas < 24) return `há ${horas}h`;
  if (dias < 30) return `há ${dias} dia${dias > 1 ? "s" : ""}`;
  const meses = Math.floor(dias / 30);
  return `há ${meses} ${meses > 1 ? "meses" : "mês"}`;
}
