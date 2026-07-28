import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, MoreVertical, Pencil, Plus, Search, Trash2, Wrench } from "lucide-react";
import { api } from "../../services/api";
import { Cliente } from "../../types";
import { PageHeader } from "../../components/PageHeader";
import { HospitalLogo } from "../../components/HospitalLogo";
import { Card } from "../../components/shadcn/card";
import { Button } from "../../components/shadcn/button";
import { Badge } from "../../components/shadcn/badge";
import { Input } from "../../components/shadcn/input";
import { Label } from "../../components/shadcn/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/shadcn/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/shadcn/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/shadcn/dropdown-menu";

interface MunicipioIBGE {
  nome: string;
  microrregiao: {
    mesorregiao: {
      UF: { sigla: string };
    };
  };
}

const CLIENTE_VAZIO = { nome: "", telefone: "", email: "", documento: "", cidade: "", estado: "" };

function formatarTelefone(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10)
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

export function ClientesList() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(CLIENTE_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [clienteExcluir, setClienteExcluir] = useState<Cliente | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExcluir, setErroExcluir] = useState("");

  // Autocomplete de cidade (IBGE) — cacheia a lista na primeira busca
  const [sugestoesCidade, setSugestoesCidade] = useState<MunicipioIBGE[]>([]);
  const [cidadeFocada, setCidadeFocada] = useState(false);
  const cacheMunicipios = useRef<MunicipioIBGE[]>();
  const timerCidade = useRef<ReturnType<typeof setTimeout>>();

  // Pré-carrega os municípios assim que o modal abre
  useEffect(() => {
    if (modalAberto && !cacheMunicipios.current) {
      fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome")
        .then((res) => res.json())
        .then((dados) => { cacheMunicipios.current = dados; })
        .catch(() => {});
    }
  }, [modalAberto]);

  function buscarCidades(termo: string) {
    clearTimeout(timerCidade.current);
    if (termo.length < 1) {
      setSugestoesCidade([]);
      return;
    }
    timerCidade.current = setTimeout(() => {
      if (!cacheMunicipios.current) return;
      const termoNorm = termo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      setSugestoesCidade(
        cacheMunicipios.current
          .filter((m) =>
            m.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").startsWith(termoNorm)
          )
          .slice(0, 8)
      );
    }, 150);
  }

  function selecionarCidade(municipio: MunicipioIBGE) {
    setForm({
      ...form,
      cidade: municipio.nome,
      estado: municipio.microrregiao.mesorregiao.UF.sigla,
    });
    setSugestoesCidade([]);
  }

  function carregar() {
    setCarregando(true);
    api.get("/clientes").then((r) => setClientes(r.data)).catch(() => {}).finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  const termo = busca.trim().toLowerCase();
  const clientesFiltrados = termo
    ? clientes.filter((c) =>
        [c.nome, c.endereco, c.cidade, c.estado]
          .filter(Boolean)
          .some((campo) => campo!.toLowerCase().includes(termo))
      )
    : clientes;

  function abrirNovo() {
    setEditandoId(null);
    setForm(CLIENTE_VAZIO);
    setModalAberto(true);
  }

  function abrirEdicao(c: Cliente) {
    setEditandoId(c.id);
    setForm({
      nome: c.nome,
      telefone: c.telefone ?? "",
      email: c.email ?? "",
      documento: c.documento ?? "",
      cidade: c.cidade ?? "",
      estado: c.estado ?? "",
    });
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setEditandoId(null);
    setForm(CLIENTE_VAZIO);
    setSugestoesCidade([]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      // Remove campos vazios para não falhar na validação do backend
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== "")
      );
      if (editandoId) {
        await api.put(`/clientes/${editandoId}`, payload);
      } else {
        await api.post("/clientes", payload);
      }
      fecharModal();
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function excluirCliente() {
    if (!clienteExcluir) return;
    setExcluindo(true);
    setErroExcluir("");
    try {
      await api.delete(`/clientes/${clienteExcluir.id}`);
      setClienteExcluir(null);
      carregar();
    } catch (err: any) {
      setErroExcluir(
        err?.response?.data?.erro ??
          "Não foi possível excluir o cliente. Tente novamente."
      );
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Clientes"
        subtitulo="Empresas e unidades atendidas."
        acoes={
          <Button onClick={abrirNovo}>
            <Plus />
            Novo cliente
          </Button>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por nome ou endereço..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="px-5 text-xs font-medium text-muted-foreground">
                Cliente
              </TableHead>
              <TableHead className="px-5 text-xs font-medium text-muted-foreground">
                Telefone
              </TableHead>
              <TableHead className="px-5 text-xs font-medium text-muted-foreground">
                Cidade
              </TableHead>
              <TableHead className="px-5 text-xs font-medium text-muted-foreground">
                Equipamentos
              </TableHead>
              <TableHead className="px-5 text-right text-xs font-medium text-muted-foreground">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carregando && (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell colSpan={5} className="px-5 py-4 text-sm text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!carregando &&
              clientesFiltrados.map((c) => (
                <TableRow key={c.id} className="group border-border hover:bg-muted/50">
                  <TableCell className="px-5 py-4">
                    <Link
                      to={`/clientes/${c.id}`}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <HospitalLogo nome={c.nome} size={40} />
                      <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                        {c.nome}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-muted-foreground">
                    {c.telefone}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-muted-foreground">
                    {c.cidade ? `${c.cidade}/${c.estado ?? ""}` : "—"}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <Badge variant="secondary">{c.equipamentos?.length ?? 0} equip.</Badge>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right">
                    <div className="flex justify-end">
                      <MenuAcoes
                        cliente={c}
                        onEditar={() => abrirEdicao(c)}
                        onExcluir={() => {
                          setErroExcluir("");
                          setClienteExcluir(c);
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            {!carregando && clientesFiltrados.length === 0 && (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell colSpan={5} className="px-5 py-4 text-sm text-muted-foreground">
                  {clientes.length === 0
                    ? "Nenhum cliente cadastrado ainda."
                    : "Nenhum cliente encontrado com essa busca."}
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
            <DialogTitle>{editandoId ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="cliente-nome">Nome</Label>
              <Input
                id="cliente-nome"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cliente-telefone">Telefone</Label>
              <Input
                id="cliente-telefone"
                required
                type="tel"
                inputMode="tel"
                placeholder="(11) 91234-5678"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: formatarTelefone(e.target.value) })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cliente-email">E-mail (opcional)</Label>
              <Input
                id="cliente-email"
                type="email"
                name="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cliente-cidade">Cidade</Label>
                <div className="relative">
                  <Input
                    id="cliente-cidade"
                    value={form.cidade}
                    onChange={(e) => {
                      setForm({ ...form, cidade: e.target.value });
                      buscarCidades(e.target.value);
                    }}
                    onFocus={() => setCidadeFocada(true)}
                    onBlur={() => setTimeout(() => setCidadeFocada(false), 200)}
                    autoComplete="off"
                  />
                  {cidadeFocada && sugestoesCidade.length > 0 && (
                    <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
                      {sugestoesCidade.map((m) => (
                        <li
                          key={`${m.nome}-${m.microrregiao.mesorregiao.UF.sigla}`}
                          className="cursor-pointer px-3 py-2 text-sm text-foreground hover:bg-muted"
                          onMouseDown={() => selecionarCidade(m)}
                        >
                          {m.nome}{" "}
                          <span className="text-muted-foreground">
                            — {m.microrregiao.mesorregiao.UF.sigla}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cliente-estado">Estado (UF)</Label>
                <Input
                  id="cliente-estado"
                  maxLength={2}
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
            <Button type="submit" disabled={salvando} className="w-full">
              {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      <Dialog open={!!clienteExcluir} onOpenChange={(aberto) => { if (!aberto) setClienteExcluir(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cliente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <strong className="text-foreground">{clienteExcluir?.nome}</strong>? Essa ação
            não pode ser desfeita.
          </p>
          {erroExcluir && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erroExcluir}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClienteExcluir(null)}>
              Cancelar
            </Button>
            <Button
              disabled={excluindo}
              onClick={excluirCliente}
              className="bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger/30"
            >
              <Trash2 />
              {excluindo ? "Excluindo..." : "Excluir cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MenuAcoes({
  cliente,
  onEditar,
  onExcluir,
}: {
  cliente: Cliente;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Ações do cliente">
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => navigate(`/clientes/${cliente.id}`)}>
          <Eye />
          Ver detalhes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEditar}>
          <Pencil />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/ordens-servico/nova?clienteId=${cliente.id}`)}>
          <Wrench />
          Nova OS
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onExcluir} className="text-danger focus:text-danger">
          <Trash2 />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
