import { useEffect, useMemo, useState } from "react";
import { Timer, Trophy } from "lucide-react";
import { api } from "../../services/api";
import { ComparativoTarefa } from "../../types";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/shadcn/card";
import { Badge } from "../../components/shadcn/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/shadcn/select";

// Formata uma duração em segundos como "48s", "23min" ou "1h05".
function formatarDuracao(segundos: number): string {
  if (segundos < 60) return `${segundos}s`;
  const totalMin = Math.round(segundos / 60);
  if (totalMin < 60) return `${totalMin}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

const INICIAIS = (nome: string) =>
  nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

export function ComparativoProdutividade() {
  const [comparativo, setComparativo] = useState<ComparativoTarefa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tarefaSelecionada, setTarefaSelecionada] = useState<string>("");

  useEffect(() => {
    setCarregando(true);
    api
      .get<ComparativoTarefa[]>("/desempenho/comparativo-tarefas")
      .then((r) => {
        setComparativo(r.data);
        if (r.data.length > 0) setTarefaSelecionada(r.data[0].tarefaCatalogoId);
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  const tarefa = useMemo(
    () => comparativo.find((c) => c.tarefaCatalogoId === tarefaSelecionada) ?? null,
    [comparativo, tarefaSelecionada]
  );

  // Escala das barras: o mais lento ocupa 100% da largura.
  const maiorTempo = useMemo(
    () => (tarefa ? Math.max(...tarefa.funcionarios.map((f) => f.tempoMedioSegundos), 1) : 1),
    [tarefa]
  );

  const estimadoSegundos = tarefa?.tempoEstimadoMin ? tarefa.tempoEstimadoMin * 60 : null;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Comparativo de produtividade"
        subtitulo="Quanto cada colaborador leva na mesma tarefa — medido automaticamente a partir do trabalho registrado nas ordens de serviço."
      />

      {carregando && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!carregando && comparativo.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground">
          Ainda não há tarefas cronometradas concluídas. Assim que os técnicos iniciarem e
          finalizarem tarefas nas ordens de serviço, o comparativo aparece aqui.
        </Card>
      )}

      {!carregando && comparativo.length > 0 && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="text-sm text-muted-foreground">Tarefa</label>
            <Select value={tarefaSelecionada} onValueChange={setTarefaSelecionada}>
              <SelectTrigger className="w-full sm:w-[420px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {comparativo.map((c) => (
                  <SelectItem key={c.tarefaCatalogoId} value={c.tarefaCatalogoId}>
                    <span className="codigo">{c.codigo}</span> — {c.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tarefa && (
            <Card className="space-y-5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="codigo shrink-0">
                      {tarefa.codigo}
                    </Badge>
                    <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                      {tarefa.descricao}
                    </span>
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {tarefa.totalConcluidas} execuç{tarefa.totalConcluidas === 1 ? "ão" : "ões"}{" "}
                    concluída{tarefa.totalConcluidas === 1 ? "" : "s"} · média da equipe{" "}
                    <strong className="text-foreground">
                      {formatarDuracao(tarefa.tempoMedioSegundos)}
                    </strong>
                    {estimadoSegundos != null && (
                      <> · alvo {formatarDuracao(estimadoSegundos)}</>
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {tarefa.funcionarios.map((f, i) => {
                  const largura = Math.max(4, (f.tempoMedioSegundos / maiorTempo) * 100);
                  const maisRapido = i === 0 && tarefa.funcionarios.length > 1;
                  return (
                    <div key={f.funcionarioId} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                            {INICIAIS(f.nome)}
                          </span>
                          <span className="min-w-0 truncate font-medium text-foreground">
                            {f.nome}
                          </span>
                          {maisRapido && (
                            <Badge className="shrink-0 gap-1">
                              <Trophy size={11} />
                              Mais rápido
                            </Badge>
                          )}
                        </span>
                        <span className="codigo shrink-0 font-semibold text-foreground">
                          {formatarDuracao(f.tempoMedioSegundos)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${
                            maisRapido ? "bg-primary" : "bg-foreground/40"
                          }`}
                          style={{ width: `${largura}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Timer size={11} />
                          {f.totalConcluidas} concluída{f.totalConcluidas === 1 ? "" : "s"}
                        </span>
                        <span>
                          melhor {formatarDuracao(f.tempoMinSegundos)} · pior{" "}
                          {formatarDuracao(f.tempoMaxSegundos)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
