import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../services/api";
import { Cliente, Equipamento, Funcionario, TipoOS } from "../../types";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardContent } from "../../components/shadcn/card";
import { Button } from "../../components/shadcn/button";
import { Input } from "../../components/shadcn/input";
import { Label } from "../../components/shadcn/label";
import { Textarea } from "../../components/shadcn/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/shadcn/select";

export function NovaOS() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const tipoInicial = searchParams.get("tipo") === "PREVENTIVA" ? "PREVENTIVA" : "CORRETIVA";
  const [tipo, setTipo] = useState<TipoOS>(tipoInicial);
  const [clienteId, setClienteId] = useState(searchParams.get("clienteId") ?? "");
  const [equipamentoId, setEquipamentoId] = useState(searchParams.get("equipamentoId") ?? "");
  const [funcionarioId, setFuncionarioId] = useState("");
  const [dataAgendada, setDataAgendada] = useState(() => new Date().toISOString().slice(0, 10));
  const [modalidade, setModalidade] = useState<"VISITA_TECNICA" | "OFICINA" | "REMOTO">(
    "VISITA_TECNICA"
  );
  const [descricaoProblema, setDescricaoProblema] = useState(
    tipoInicial === "PREVENTIVA" ? "Manutenção preventiva agendada." : ""
  );

  useEffect(() => {
    api.get("/clientes").then((r) => setClientes(r.data)).catch(() => {});
    api.get("/funcionarios").then((r) => setFuncionarios(r.data)).catch(() => {});
  }, []);

  // Sempre que o cliente muda, recarrega os equipamentos dele.
  useEffect(() => {
    if (!clienteId) {
      setEquipamentos([]);
      return;
    }
    api.get(`/equipamentos?clienteId=${clienteId}`).then((r) => setEquipamentos(r.data)).catch(() => {});
  }, [clienteId]);

  function handleTipoChange(novoTipo: TipoOS) {
    setTipo(novoTipo);
    // Preenche um texto padrão pra facilitar, sem sobrescrever o que a
    // pessoa já tiver digitado.
    if (novoTipo === "PREVENTIVA" && !descricaoProblema) {
      setDescricaoProblema("Manutenção preventiva agendada.");
    }
    if (novoTipo === "CORRETIVA" && descricaoProblema === "Manutenção preventiva agendada.") {
      setDescricaoProblema("");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const { data } = await api.post("/ordens-servico", {
        clienteId,
        equipamentoId,
        funcionarioId: funcionarioId || undefined,
        tipo,
        dataAgendada: dataAgendada || undefined,
        modalidade,
        descricaoProblema,
      });
      navigate(`/ordens-servico/${data.id}`);
    } catch {
      setErro("Não foi possível abrir a OS. Confira os campos e tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader titulo="Nova ordem de serviço" />

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-1.5">
              <Label>Tipo de atendimento</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={tipo === "CORRETIVA" ? "default" : "outline"}
                  onClick={() => handleTipoChange("CORRETIVA")}
                  className="flex-1"
                >
                  Corretiva
                </Button>
                <Button
                  type="button"
                  variant={tipo === "PREVENTIVA" ? "default" : "outline"}
                  onClick={() => handleTipoChange("PREVENTIVA")}
                  className="flex-1"
                >
                  Preventiva
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">
                {tipo === "CORRETIVA"
                  ? "Aberta por causa de um problema relatado pelo cliente."
                  : "Manutenção agendada, sem necessariamente ter um problema relatado."}
              </span>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="os-cliente">Cliente</Label>
              <Select
                required
                value={clienteId}
                onValueChange={(valor) => {
                  setClienteId(valor);
                  setEquipamentoId("");
                }}
              >
                <SelectTrigger id="os-cliente" className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="os-equipamento">Equipamento</Label>
              <Select
                required
                disabled={!clienteId}
                value={equipamentoId}
                onValueChange={(valor) => setEquipamentoId(valor)}
              >
                <SelectTrigger id="os-equipamento" className="w-full">
                  <SelectValue
                    placeholder={clienteId ? "Selecione..." : "Escolha um cliente primeiro"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {equipamentos.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.tipo} {eq.marca ? `— ${eq.marca} ${eq.modelo ?? ""}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="os-tecnico">Técnico responsável (opcional)</Label>
              <Select value={funcionarioId} onValueChange={(valor) => setFuncionarioId(valor)}>
                <SelectTrigger id="os-tecnico" className="w-full">
                  <SelectValue placeholder="A definir depois" />
                </SelectTrigger>
                <SelectContent>
                  {funcionarios.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.usuario.nome} — {f.cargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="os-data">Data agendada da visita (opcional)</Label>
              <Input
                id="os-data"
                type="date"
                value={dataAgendada}
                onChange={(e) => setDataAgendada(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">
                É essa data que define em qual dia a OS aparece na rota do técnico.
              </span>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="os-modalidade">Modalidade de atendimento</Label>
              <Select
                value={modalidade}
                onValueChange={(valor) => setModalidade(valor as typeof modalidade)}
              >
                <SelectTrigger id="os-modalidade" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VISITA_TECNICA">
                    Visita técnica (técnico vai até o cliente)
                  </SelectItem>
                  <SelectItem value="OFICINA">Oficina (cliente traz o equipamento)</SelectItem>
                  <SelectItem value="REMOTO">Suporte remoto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="os-descricao">
                {tipo === "PREVENTIVA" ? "Observações" : "Descrição do problema"}
              </Label>
              <Textarea
                id="os-descricao"
                required
                rows={3}
                value={descricaoProblema}
                onChange={(e) => setDescricaoProblema(e.target.value)}
              />
            </div>

            {erro && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>
            )}

            <Button type="submit" disabled={enviando} className="w-full">
              {enviando ? "Abrindo..." : "Abrir ordem de serviço"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
