import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "../../services/api";
import { Cliente, Contrato } from "../../types";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/shadcn/card";
import { Button } from "../../components/shadcn/button";
import { Badge } from "../../components/shadcn/badge";
import { Input } from "../../components/shadcn/input";
import { Label } from "../../components/shadcn/label";
import { Switch } from "../../components/shadcn/switch";
import { Textarea } from "../../components/shadcn/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/shadcn/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/shadcn/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/shadcn/dialog";

// "Todos os equipamentos" — valor sentinela do Select (não pode ser "" no Radix).
const TODOS_EQUIP = "__todos__";

const FORM_VAZIO = {
  clienteId: "",
  equipamentoId: TODOS_EQUIP,
  numero: "",
  slaHorasResposta: "24",
  vigenciaInicio: "",
  vigenciaFim: "",
  ativo: true,
  observacoes: "",
};

function paraInputDate(iso?: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

function formatarData(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export function ContratosList() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [contratoExcluir, setContratoExcluir] = useState<Contrato | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  function carregar() {
    setCarregando(true);
    api
      .get("/contratos")
      .then((r) => setContratos(r.data))
      .catch(() => {})
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);
  useEffect(() => {
    api.get("/clientes").then((r) => setClientes(r.data)).catch(() => {});
  }, []);

  // Equipamentos do cliente selecionado no form (pra restringir a um deles).
  const equipamentosDoCliente = useMemo(
    () => clientes.find((c) => c.id === form.clienteId)?.equipamentos ?? [],
    [clientes, form.clienteId]
  );

  function abrirNovo() {
    setEditandoId(null);
    setForm({ ...FORM_VAZIO, vigenciaInicio: hoje() });
    setErroForm(null);
    setModalAberto(true);
  }

  function abrirEdicao(c: Contrato) {
    setEditandoId(c.id);
    setForm({
      clienteId: c.clienteId,
      equipamentoId: c.equipamentoId ?? TODOS_EQUIP,
      numero: c.numero ?? "",
      slaHorasResposta: String(c.slaHorasResposta),
      vigenciaInicio: paraInputDate(c.vigenciaInicio),
      vigenciaFim: paraInputDate(c.vigenciaFim),
      ativo: c.ativo,
      observacoes: c.observacoes ?? "",
    });
    setErroForm(null);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setEditandoId(null);
    setForm(FORM_VAZIO);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErroForm(null);
    setSalvando(true);
    try {
      const payload = {
        clienteId: form.clienteId,
        equipamentoId: form.equipamentoId === TODOS_EQUIP ? null : form.equipamentoId,
        numero: form.numero || null,
        slaHorasResposta: Number(form.slaHorasResposta),
        vigenciaInicio: form.vigenciaInicio,
        vigenciaFim: form.vigenciaFim || null,
        ativo: form.ativo,
        observacoes: form.observacoes || null,
      };
      if (editandoId) {
        await api.put(`/contratos/${editandoId}`, payload);
      } else {
        await api.post("/contratos", payload);
      }
      fecharModal();
      carregar();
    } catch (err: any) {
      setErroForm(
        err?.response?.data?.erro ?? "Não foi possível salvar o contrato. Tente novamente."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluirContrato() {
    if (!contratoExcluir) return;
    setExcluindo(true);
    try {
      await api.delete(`/contratos/${contratoExcluir.id}`);
      setContratoExcluir(null);
      carregar();
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Contratos & SLA"
        subtitulo="Prazos de resposta contratuais por cliente e equipamento."
        acoes={
          <Button onClick={abrirNovo}>
            <Plus />
            Novo contrato
          </Button>
        }
      />

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="px-5 text-xs font-medium text-muted-foreground">Cliente</TableHead>
              <TableHead className="px-5 text-xs font-medium text-muted-foreground">Equipamento</TableHead>
              <TableHead className="px-5 text-xs font-medium text-muted-foreground">SLA</TableHead>
              <TableHead className="px-5 text-xs font-medium text-muted-foreground">Vigência</TableHead>
              <TableHead className="px-5 text-xs font-medium text-muted-foreground">Status</TableHead>
              <TableHead className="px-5 text-right text-xs font-medium text-muted-foreground">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando && (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell colSpan={6} className="px-5 py-4 text-sm text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!carregando &&
              contratos.map((c) => (
                <TableRow key={c.id} className="group border-border hover:bg-muted/50">
                  <TableCell className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {c.cliente?.nome ?? "—"}
                      </span>
                      {c.numero && (
                        <span className="codigo text-xs text-muted-foreground">nº {c.numero}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-muted-foreground">
                    {c.equipamento ? c.equipamento.tipo : "Todos os equipamentos"}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                      <ShieldCheck size={14} className="text-muted-foreground" />
                      {c.slaHorasResposta}h
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-muted-foreground">
                    {formatarData(c.vigenciaInicio)}
                    {" – "}
                    {c.vigenciaFim ? formatarData(c.vigenciaFim) : "sem término"}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <Badge variant={c.ativo ? "default" : "secondary"}>
                      {c.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => abrirEdicao(c)} title="Editar">
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setContratoExcluir(c)}
                        className="text-danger hover:text-danger"
                        title="Excluir"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            {!carregando && contratos.length === 0 && (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Nenhum contrato cadastrado. Crie um para acompanhar o SLA das ordens de serviço.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal de cadastro/edição */}
      <Dialog open={modalAberto} onOpenChange={(aberto) => { if (!aberto) fecharModal(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar contrato" : "Novo contrato"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ct-cliente">Cliente</Label>
              <Select
                value={form.clienteId}
                onValueChange={(v) =>
                  setForm({ ...form, clienteId: v, equipamentoId: TODOS_EQUIP })
                }
              >
                <SelectTrigger id="ct-cliente" className="w-full">
                  <SelectValue placeholder="Selecione o cliente..." />
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
              <Label htmlFor="ct-equip">Equipamento</Label>
              <Select
                value={form.equipamentoId}
                onValueChange={(v) => setForm({ ...form, equipamentoId: v })}
                disabled={!form.clienteId}
              >
                <SelectTrigger id="ct-equip" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS_EQUIP}>Todos os equipamentos do cliente</SelectItem>
                  {equipamentosDoCliente.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.tipo}
                      {eq.marca ? ` — ${eq.marca}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                Deixe em "Todos" para o SLA valer para qualquer equipamento do cliente.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ct-sla">SLA de resposta (horas)</Label>
                <Input
                  id="ct-sla"
                  type="number"
                  min={1}
                  required
                  value={form.slaHorasResposta}
                  onChange={(e) => setForm({ ...form, slaHorasResposta: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ct-numero">Nº do contrato (opcional)</Label>
                <Input
                  id="ct-numero"
                  value={form.numero}
                  onChange={(e) => setForm({ ...form, numero: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ct-inicio">Início da vigência</Label>
                <Input
                  id="ct-inicio"
                  type="date"
                  required
                  value={form.vigenciaInicio}
                  onChange={(e) => setForm({ ...form, vigenciaInicio: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ct-fim">Fim da vigência (opcional)</Label>
                <Input
                  id="ct-fim"
                  type="date"
                  value={form.vigenciaFim}
                  onChange={(e) => setForm({ ...form, vigenciaFim: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="ct-obs">Observações (opcional)</Label>
              <Textarea
                id="ct-obs"
                rows={2}
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="ct-ativo"
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
              <Label htmlFor="ct-ativo" className="text-sm font-normal text-foreground">
                Contrato ativo (usado no cálculo de SLA das OS)
              </Label>
            </div>

            {erroForm && <p className="text-xs text-danger">{erroForm}</p>}

            <Button type="submit" disabled={salvando || !form.clienteId} className="w-full">
              {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Cadastrar contrato"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={!!contratoExcluir} onOpenChange={(aberto) => { if (!aberto) setContratoExcluir(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir contrato</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o contrato de{" "}
            <strong className="text-foreground">{contratoExcluir?.cliente?.nome}</strong>? Essa ação
            não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContratoExcluir(null)}>
              Cancelar
            </Button>
            <Button
              disabled={excluindo}
              onClick={excluirContrato}
              className="bg-danger text-white hover:bg-danger/90"
            >
              <Trash2 />
              {excluindo ? "Excluindo..." : "Excluir contrato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
