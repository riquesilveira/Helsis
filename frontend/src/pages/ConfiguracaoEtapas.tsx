import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import { api } from "../services/api";
import {
  EtapaConfig,
  ETAPAS_OBRIGATORIAS,
  useEtapasStatus,
} from "../hooks/useEtapasStatus";
import { Card, CardContent, CardHeader, CardTitle } from "../components/shadcn/card";
import { Button } from "../components/shadcn/button";
import { Input } from "../components/shadcn/input";
import { Label } from "../components/shadcn/label";
import { Checkbox } from "../components/shadcn/checkbox";

/**
 * Editor do fluxo de etapas de status (só Dono/Gestor). Permite renomear cada
 * etapa (rótulo interno e a frase mostrada ao cliente), reordenar a trilha e
 * desligar etapas intermediárias que a empresa não usa. As etapas de entrada e
 * de desfecho (Recebido/Concluído/Cancelado) não podem ser desativadas.
 */
export function ConfiguracaoEtapas() {
  const { etapas: etapasGlobais, recarregar } = useEtapasStatus();
  const [etapas, setEtapas] = useState<EtapaConfig[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Semeia a cópia editável a partir do estado global (que já vem do backend).
  useEffect(() => {
    setEtapas([...etapasGlobais].sort((a, b) => a.ordem - b.ordem));
  }, [etapasGlobais]);

  function atualizarCampo(status: string, campo: "rotulo" | "rotuloCliente", valor: string) {
    setEtapas((prev) => prev.map((e) => (e.status === status ? { ...e, [campo]: valor } : e)));
  }

  function alternarAtivo(status: string) {
    setEtapas((prev) => prev.map((e) => (e.status === status ? { ...e, ativo: !e.ativo } : e)));
  }

  function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= etapas.length) return;
    setEtapas((prev) => {
      const copia = [...prev];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    try {
      // A ordem final é a posição na lista (0-based); rótulos vazios são
      // barrados pelo backend, então validamos antes para dar um retorno claro.
      if (etapas.some((e) => !e.rotulo.trim() || !e.rotuloCliente.trim())) {
        setMsg({ tipo: "erro", texto: "Preencha todos os rótulos antes de salvar." });
        setSalvando(false);
        return;
      }
      const payload = {
        etapas: etapas.map((e, i) => ({
          status: e.status,
          rotulo: e.rotulo.trim(),
          rotuloCliente: e.rotuloCliente.trim(),
          ordem: i,
          ativo: e.ativo,
        })),
      };
      await api.put("/configuracoes/etapas", payload);
      await recarregar();
      setMsg({ tipo: "ok", texto: "Fluxo de etapas atualizado com sucesso." });
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      setMsg({
        tipo: "erro",
        texto: err?.response?.data?.erro ?? "Não foi possível salvar o fluxo. Tente novamente.",
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ListChecks className="size-4 text-muted-foreground" />
          Fluxo de etapas da OS
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-xs text-muted-foreground">
          Personalize os nomes das etapas, a ordem da trilha e quais etapas sua
          equipe usa. A entrada (Recebido) e os desfechos (Concluído, Cancelado)
          não podem ser desativados.
        </p>

        <div className="space-y-3">
          {etapas.map((etapa, i) => {
            const obrigatoria = ETAPAS_OBRIGATORIAS.includes(etapa.status);
            return (
              <div
                key={etapa.status}
                className={`rounded-lg border border-border p-3 ${
                  etapa.ativo ? "" : "opacity-60"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-0.5 pt-1">
                    <button
                      type="button"
                      onClick={() => mover(i, -1)}
                      disabled={i === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Mover para cima"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => mover(i, 1)}
                      disabled={i === etapas.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Mover para baixo"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  </div>

                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor={`rotulo-${etapa.status}`} className="text-xs">
                        Rótulo interno
                      </Label>
                      <Input
                        id={`rotulo-${etapa.status}`}
                        value={etapa.rotulo}
                        onChange={(e) => atualizarCampo(etapa.status, "rotulo", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor={`cliente-${etapa.status}`} className="text-xs">
                        Texto mostrado ao cliente
                      </Label>
                      <Input
                        id={`cliente-${etapa.status}`}
                        value={etapa.rotuloCliente}
                        onChange={(e) =>
                          atualizarCampo(etapa.status, "rotuloCliente", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 pl-6">
                  <Checkbox
                    id={`ativo-${etapa.status}`}
                    checked={etapa.ativo}
                    disabled={obrigatoria}
                    onCheckedChange={() => alternarAtivo(etapa.status)}
                  />
                  <Label
                    htmlFor={`ativo-${etapa.status}`}
                    className="text-xs font-normal text-muted-foreground"
                  >
                    {obrigatoria ? "Etapa obrigatória (sempre ativa)" : "Etapa ativa"}
                  </Label>
                  <code className="codigo ml-auto text-[10px] text-muted-foreground">
                    {etapa.status}
                  </code>
                </div>
              </div>
            );
          })}
        </div>

        {msg && (
          <p className={`mt-4 text-xs ${msg.tipo === "ok" ? "text-foreground" : "text-danger"}`}>
            {msg.texto}
          </p>
        )}

        <Button className="mt-4" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar fluxo"}
        </Button>
      </CardContent>
    </Card>
  );
}
