import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { api } from "../../services/api";
import { Funcionario } from "../../types";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/shadcn/card";
import { Button } from "../../components/shadcn/button";
import { Badge } from "../../components/shadcn/badge";
import { Input } from "../../components/shadcn/input";
import { Label } from "../../components/shadcn/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/shadcn/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/shadcn/select";

/** Formata centavos como moeda brasileira: 350000 → "3.500,00" */
function formatarMoeda(valor: string): string {
  const apenas = valor.replace(/\D/g, "");
  if (!apenas) return "";
  const centavos = parseInt(apenas, 10);
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

/** Converte "3.500,00" → 3500 (número) */
function moedaParaNumero(valor: string): number {
  return Number(valor.replace(/\./g, "").replace(",", "."));
}

const FORM_VAZIO = {
  nome: "",
  email: "",
  senha: "",
  cargo: "",
  salarioAtual: "",
  dataAdmissao: new Date().toISOString().slice(0, 10),
  papel: "TECNICO",
};

/** Papéis atribuíveis a um funcionário interno (nível 1 a 3). */
const PAPEIS_FUNCIONARIO: { valor: string; rotulo: string }[] = [
  { valor: "TECNICO", rotulo: "Técnico (N1)" },
  { valor: "SUPORTE", rotulo: "Suporte Técnico (N2)" },
  { valor: "GESTOR", rotulo: "Gerente Técnico (N3)" },
];

const ROTULO_PAPEL: Record<string, string> = {
  DONO: "Diretor Técnico",
  GESTOR: "Gerente Técnico",
  SUPORTE: "Suporte Técnico",
  TECNICO: "Técnico",
};

export function FuncionariosList() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [novaEspecialidade, setNovaEspecialidade] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroSubmit, setErroSubmit] = useState<string | null>(null);

  // modal de edição
  const [modalEditar, setModalEditar] = useState(false);
  const [editId, setEditId] = useState("");
  const [editForm, setEditForm] = useState({ nome: "", email: "", cargo: "", salarioAtual: "", papel: "TECNICO" });
  const [editEspecialidades, setEditEspecialidades] = useState<string[]>([]);
  const [novaEditEsp, setNovaEditEsp] = useState("");
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [erroEdit, setErroEdit] = useState<string | null>(null);

  function abrirModalEditar(f: Funcionario) {
    setEditId(f.id);
    setEditForm({
      nome: f.usuario.nome,
      email: f.usuario.email,
      cargo: f.cargo,
      salarioAtual: Number(f.salarioAtual).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      papel: f.usuario.papel ?? "TECNICO",
    });
    setEditEspecialidades(f.especialidades ?? []);
    setNovaEditEsp("");
    setModalEditar(true);
  }

  function adicionarEditEsp() {
    const valor = novaEditEsp.trim();
    if (valor && !editEspecialidades.includes(valor)) {
      setEditEspecialidades([...editEspecialidades, valor]);
    }
    setNovaEditEsp("");
  }

  async function salvarEdicao(e: FormEvent) {
    e.preventDefault();
    setErroEdit(null);
    setSalvandoEdit(true);
    try {
      await api.patch(`/funcionarios/${editId}`, {
        nome: editForm.nome,
        email: editForm.email,
        cargo: editForm.cargo,
        salarioAtual: moedaParaNumero(editForm.salarioAtual),
        especialidades: editEspecialidades,
        papel: editForm.papel,
      });
      setModalEditar(false);
      carregar();
    } catch (err: any) {
      setErroEdit(err?.response?.data?.erro ?? "Não foi possível salvar. Tente novamente.");
    } finally {
      setSalvandoEdit(false);
    }
  }

  function adicionarEspecialidade() {
    const valor = novaEspecialidade.trim();
    if (valor && !especialidades.includes(valor)) {
      setEspecialidades([...especialidades, valor]);
    }
    setNovaEspecialidade("");
  }

  function removerEspecialidade(index: number) {
    setEspecialidades((prev) => prev.filter((_, i) => i !== index));
  }

  function carregar() {
    setCarregando(true);
    api.get("/funcionarios").then((r) => setFuncionarios(r.data)).catch(() => {}).finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErroSubmit(null);
    setSalvando(true);
    try {
      await api.post("/funcionarios", {
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        cargo: form.cargo,
        salarioAtual: moedaParaNumero(form.salarioAtual),
        dataAdmissao: form.dataAdmissao,
        especialidades,
        papel: form.papel,
      });
      setModalAberto(false);
      setForm(FORM_VAZIO);
      setEspecialidades([]);
      carregar();
    } catch (err: any) {
      setErroSubmit(err?.response?.data?.erro ?? "Não foi possível cadastrar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Equipe & desempenho"
        subtitulo="Técnicos e colaboradores da operação."
        acoes={
          <Button onClick={() => setModalAberto(true)}>
            <Plus />
            Novo funcionário
          </Button>
        }
      />

      <Card className="divide-y divide-border overflow-hidden py-0">
        {carregando && (
          <p className="px-5 py-4 text-sm text-muted-foreground">Carregando...</p>
        )}
        {!carregando && funcionarios.map((f) => (
          <div key={f.id} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/50">
            <Link to={`/funcionarios/${f.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                {f.usuario.nome.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm text-foreground">{f.usuario.nome}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      abrirModalEditar(f);
                    }}
                    className="h-auto shrink-0 px-2 py-0.5 text-xs"
                  >
                    Editar
                  </Button>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <p className="truncate text-xs text-muted-foreground">{f.cargo}</p>
                  {f.usuario.papel && f.usuario.papel !== "TECNICO" && (
                    <Badge variant="secondary" className="shrink-0">
                      {ROTULO_PAPEL[f.usuario.papel] ?? f.usuario.papel}
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
            <span className="codigo shrink-0 text-sm text-foreground">
              R$ {Number(f.salarioAtual).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
        {!carregando && funcionarios.length === 0 && (
          <p className="px-5 py-4 text-sm text-muted-foreground">Nenhum funcionário cadastrado.</p>
        )}
      </Card>

      <Dialog open={modalAberto} onOpenChange={(aberto) => { if (!aberto) { setModalAberto(false); setErroSubmit(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo funcionário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="func-nome">Nome completo</Label>
              <Input
                id="func-nome"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="func-email">E-mail (login)</Label>
                <Input
                  id="func-email"
                  required
                  type="email"
                  name="email"
                  autoComplete="off"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="func-senha">Senha</Label>
                <Input
                  id="func-senha"
                  required
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="func-cargo">Cargo</Label>
                <Input
                  id="func-cargo"
                  required
                  placeholder="Ex: Técnico, Técnico Sênior"
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="func-salario">Salário</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input
                    id="func-salario"
                    required
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    className="pl-9"
                    value={form.salarioAtual}
                    onChange={(e) => setForm({ ...form, salarioAtual: formatarMoeda(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="func-admissao">Data de admissão</Label>
                <Input
                  id="func-admissao"
                  required
                  type="date"
                  value={form.dataAdmissao}
                  onChange={(e) => setForm({ ...form, dataAdmissao: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="func-papel">Nível de acesso</Label>
                <Select value={form.papel} onValueChange={(valor) => setForm({ ...form, papel: valor })}>
                  <SelectTrigger id="func-papel" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPEIS_FUNCIONARIO.map((p) => (
                      <SelectItem key={p.valor} value={p.valor}>{p.rotulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="func-especialidade">Especialidades</Label>
              {especialidades.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {especialidades.map((esp, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {esp}
                      <button
                        type="button"
                        onClick={() => removerEspecialidade(i)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  id="func-especialidade"
                  placeholder="Ex: Ressonância Magnética"
                  value={novaEspecialidade}
                  onChange={(e) => setNovaEspecialidade(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      adicionarEspecialidade();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={adicionarEspecialidade}
                  className="shrink-0"
                >
                  + Adicionar
                </Button>
              </div>
            </div>
            {erroSubmit && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erroSubmit}</p>
            )}
            <Button type="submit" disabled={salvando} className="w-full">
              {salvando ? "Salvando..." : "Cadastrar funcionário"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modalEditar} onOpenChange={(aberto) => { if (!aberto) { setModalEditar(false); setErroEdit(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar funcionário</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvarEdicao} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-nome">Nome completo</Label>
              <Input
                id="edit-nome"
                required
                value={editForm.nome}
                onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                required
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-cargo">Cargo</Label>
                <Input
                  id="edit-cargo"
                  required
                  value={editForm.cargo}
                  onChange={(e) => setEditForm({ ...editForm, cargo: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-salario">Salário</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input
                    id="edit-salario"
                    required
                    type="text"
                    inputMode="numeric"
                    className="pl-9"
                    value={editForm.salarioAtual}
                    onChange={(e) => setEditForm({ ...editForm, salarioAtual: formatarMoeda(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-papel">Nível de acesso</Label>
              <Select value={editForm.papel} onValueChange={(valor) => setEditForm({ ...editForm, papel: valor })}>
                <SelectTrigger id="edit-papel" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPEIS_FUNCIONARIO.map((p) => (
                    <SelectItem key={p.valor} value={p.valor}>{p.rotulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-especialidade">Especialidades</Label>
              {editEspecialidades.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {editEspecialidades.map((esp, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {esp}
                      <button
                        type="button"
                        onClick={() => setEditEspecialidades((prev) => prev.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  id="edit-especialidade"
                  placeholder="Ex: Ressonância Magnética"
                  value={novaEditEsp}
                  onChange={(e) => setNovaEditEsp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      adicionarEditEsp();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={adicionarEditEsp}
                  className="shrink-0"
                >
                  + Adicionar
                </Button>
              </div>
            </div>
            {erroEdit && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erroEdit}</p>
            )}
            <Button type="submit" disabled={salvandoEdit} className="w-full">
              {salvandoEdit ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
