import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  ChevronDown,
  Cpu,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { api } from "../../services/api";
import { Cliente, Equipamento, EquipamentoCatalogoItem } from "../../types";
import { HospitalLogo } from "../../components/HospitalLogo";
import { Card } from "../../components/shadcn/card";
import { Button } from "../../components/shadcn/button";
import { Input } from "../../components/shadcn/input";
import { Label } from "../../components/shadcn/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/shadcn/dialog";

// Classe do <input> nativo dos campos de autocomplete (tipo/marca/modelo),
// que precisam de `ref` para refocar ao clicar no chevron — o componente
// shadcn <Input> é função sem forwardRef, então esses três usam input nativo
// com o mesmo visual do design system.
const inputClasses =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30";

const EQUIPAMENTO_VAZIO = {
  tipo: "",
  marca: "",
  modelo: "",
  numeroSerie: "",
  localInstalacao: "",
  frequenciaManutencaoMeses: "",
};

function formatarProximaData(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function normalizar(texto: string) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function ClienteDetail() {
  const { id } = useParams();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(EQUIPAMENTO_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Catálogo de referência (tipo/marca/modelo) — carregado uma vez ao abrir
  // o modal, usado só pra sugerir. O usuário sempre pode digitar algo novo.
  const [catalogo, setCatalogo] = useState<EquipamentoCatalogoItem[]>([]);
  const [campoFocado, setCampoFocado] = useState<"tipo" | "marca" | "modelo" | null>(null);
  const refTipo = useRef<HTMLInputElement>(null);
  const refMarca = useRef<HTMLInputElement>(null);
  const refModelo = useRef<HTMLInputElement>(null);

  // Texto de busca de cada campo, separado do valor salvo em `form`. Ao focar
  // um campo já preenchido (ex: pra trocar o equipamento por outro), a busca
  // reinicia vazia, mostrando o catálogo inteiro em vez de só o item já escolhido.
  const [buscaTipo, setBuscaTipo] = useState("");
  const [buscaMarca, setBuscaMarca] = useState("");
  const [buscaModelo, setBuscaModelo] = useState("");

  function carregar() {
    api.get(`/clientes/${id}`).then((r) => setCliente(r.data)).catch(() => {});
  }

  useEffect(carregar, [id]);

  useEffect(() => {
    if (modalAberto && catalogo.length === 0) {
      api.get("/equipamentos/catalogo").then((r) => setCatalogo(r.data)).catch(() => {});
    }
  }, [modalAberto, catalogo.length]);

  // Filtro por prefixo usa o texto de busca (não o valor salvo), então ao
  // focar um campo já preenchido a lista inteira aparece, permitindo trocar
  // o equipamento por outro em vez de só ver a opção já escolhida.
  const tiposUnicos = Array.from(new Set(catalogo.map((c) => c.tipo)));
  const sugestoesTipo = tiposUnicos
    .filter((t) => normalizar(t).startsWith(normalizar(buscaTipo)))
    .slice(0, 8);

  // Marca: prioriza marcas do tipo já selecionado, mas cai pra todas se
  // o tipo digitado ainda não bater com nenhum item do catálogo.
  const marcasDoTipo = form.tipo
    ? catalogo.filter((c) => normalizar(c.tipo) === normalizar(form.tipo))
    : catalogo;
  const marcasUnicas = Array.from(new Set((marcasDoTipo.length ? marcasDoTipo : catalogo).map((c) => c.marca)));
  const sugestoesMarca = marcasUnicas
    .filter((m) => normalizar(m).startsWith(normalizar(buscaMarca)))
    .slice(0, 8);

  // Modelo: filtra pela marca (e tipo, se houver) já selecionados.
  const modelosDaMarca = catalogo.filter(
    (c) =>
      (!form.marca || normalizar(c.marca) === normalizar(form.marca)) &&
      (!form.tipo || normalizar(c.tipo) === normalizar(form.tipo))
  );
  const sugestoesModelo = modelosDaMarca
    .map((c) => c.modelo)
    .filter((m) => normalizar(m).startsWith(normalizar(buscaModelo)))
    .slice(0, 8);

  function limparBusca() {
    setBuscaTipo("");
    setBuscaMarca("");
    setBuscaModelo("");
  }

  function fecharModal() {
    setModalAberto(false);
    setEditandoId(null);
    setForm(EQUIPAMENTO_VAZIO);
    limparBusca();
  }

  function abrirNovo() {
    setEditandoId(null);
    setForm(EQUIPAMENTO_VAZIO);
    limparBusca();
    setModalAberto(true);
  }

  function abrirEdicao(eq: Equipamento) {
    setForm({
      tipo: eq.tipo,
      marca: eq.marca ?? "",
      modelo: eq.modelo ?? "",
      numeroSerie: eq.numeroSerie ?? "",
      localInstalacao: eq.localInstalacao ?? "",
      frequenciaManutencaoMeses: eq.frequenciaManutencaoMeses ? String(eq.frequenciaManutencaoMeses) : "",
    });
    limparBusca();
    setEditandoId(eq.id);
    setModalAberto(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const dados = {
        ...form,
        frequenciaManutencaoMeses: form.frequenciaManutencaoMeses
          ? Number(form.frequenciaManutencaoMeses)
          : editandoId
          ? null // edição: campo limpo pelo usuário deve remover a preventiva
          : undefined, // criação: campo vazio simplesmente não é enviado
      };
      if (editandoId) {
        await api.put(`/equipamentos/${editandoId}`, dados);
      } else {
        await api.post("/equipamentos", { ...dados, clienteId: id });
      }
      fecharModal();
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  if (!cliente) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const equipamentos = cliente.equipamentos ?? [];
  const endereco = [cliente.endereco, [cliente.cidade, cliente.estado].filter(Boolean).join("/")]
    .filter(Boolean)
    .join(" — ");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link
        to="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Clientes
      </Link>

      {/* Header / hero do estabelecimento */}
      <Card className="overflow-hidden p-0">
        <div className="h-28 bg-muted" />
        <div className="px-6 pb-8 text-center">
          <HospitalLogo nome={cliente.nome} size={104} className="mx-auto -mt-14 ring-4 ring-background" />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            {cliente.nome}
          </h1>
          {cliente.documento && (
            <p className="codigo mt-1 text-xs text-muted-foreground">{cliente.documento}</p>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
            <InfoItem icone={Phone} rotulo="Telefone" valor={cliente.telefone} />
            <InfoItem icone={Mail} rotulo="E-mail" valor={cliente.email} />
            <InfoItem icone={MapPin} rotulo="Endereço" valor={endereco} />
          </div>
        </div>
      </Card>

      {/* Equipamentos */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          Equipamentos
          <span className="ml-2 text-sm font-normal text-muted-foreground">{equipamentos.length}</span>
        </h2>
        <Button size="sm" onClick={abrirNovo}>
          <Plus />
          Novo equipamento
        </Button>
      </div>

      <div className="space-y-2">
        {equipamentos.map((eq: Equipamento) => (
          <Card key={eq.id} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Cpu size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{eq.tipo}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {[eq.marca, eq.modelo].filter(Boolean).join(" ")}
                  {eq.numeroSerie ? ` — nº ${eq.numeroSerie}` : ""}
                </p>
                {eq.frequenciaManutencaoMeses ? (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-foreground">
                    <CalendarClock size={12} className="shrink-0" />
                    Preventiva a cada {eq.frequenciaManutencaoMeses} meses
                    {eq.proximaManutencaoPreventiva
                      ? ` · próxima em ${formatarProximaData(eq.proximaManutencaoPreventiva)}`
                      : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-muted-foreground">Sem manutenção preventiva agendada</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => abrirEdicao(eq)}>
                <Pencil />
                Editar
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={`/ordens-servico/nova?clienteId=${cliente.id}&equipamentoId=${eq.id}`}>
                  Abrir OS
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </Card>
        ))}
        {equipamentos.length === 0 && (
          <Card className="px-5 py-8 text-center text-sm text-muted-foreground">
            Nenhum equipamento cadastrado.
          </Card>
        )}
      </div>

      <Dialog open={modalAberto} onOpenChange={(aberto) => { if (!aberto) fecharModal(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar equipamento" : "Novo equipamento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="eq-tipo">Tipo de equipamento</Label>
              <div className="relative">
                <input
                  id="eq-tipo"
                  ref={refTipo}
                  required
                  autoComplete="off"
                  placeholder="Ex: Ressonância Magnética, Tomógrafo"
                  className={`${inputClasses} pr-8`}
                  value={form.tipo}
                  onChange={(e) => {
                    setForm({ ...form, tipo: e.target.value });
                    setBuscaTipo(e.target.value);
                  }}
                  onFocus={() => {
                    setCampoFocado("tipo");
                    setBuscaTipo("");
                  }}
                  onBlur={() => setTimeout(() => setCampoFocado((atual) => (atual === "tipo" ? null : atual)), 200)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Ver tipos disponíveis"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => refTipo.current?.focus()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown size={16} />
                </button>
                {campoFocado === "tipo" && sugestoesTipo.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
                    {sugestoesTipo.map((t) => (
                      <li
                        key={t}
                        className="px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer"
                        onMouseDown={() => {
                          const mudouTipo = normalizar(t) !== normalizar(form.tipo);
                          setForm({
                            ...form,
                            tipo: t,
                            marca: mudouTipo ? "" : form.marca,
                            modelo: mudouTipo ? "" : form.modelo,
                          });
                          setBuscaTipo(t);
                          if (mudouTipo) {
                            setBuscaMarca("");
                            setBuscaModelo("");
                          }
                        }}
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="eq-marca">Marca</Label>
                <div className="relative">
                  <input
                    id="eq-marca"
                    ref={refMarca}
                    autoComplete="off"
                    className={`${inputClasses} pr-8`}
                    value={form.marca}
                    onChange={(e) => {
                      setForm({ ...form, marca: e.target.value });
                      setBuscaMarca(e.target.value);
                    }}
                    onFocus={() => {
                      setCampoFocado("marca");
                      setBuscaMarca("");
                    }}
                    onBlur={() => setTimeout(() => setCampoFocado((atual) => (atual === "marca" ? null : atual)), 200)}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Ver marcas disponíveis"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => refMarca.current?.focus()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown size={16} />
                  </button>
                  {campoFocado === "marca" && sugestoesMarca.length > 0 && (
                    <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
                      {sugestoesMarca.map((m) => (
                        <li
                          key={m}
                          className="px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer"
                          onMouseDown={() => {
                            const mudouMarca = normalizar(m) !== normalizar(form.marca);
                            setForm({ ...form, marca: m, modelo: mudouMarca ? "" : form.modelo });
                            setBuscaMarca(m);
                            if (mudouMarca) setBuscaModelo("");
                          }}
                        >
                          {m}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="eq-modelo">Modelo</Label>
                <div className="relative">
                  <input
                    id="eq-modelo"
                    ref={refModelo}
                    autoComplete="off"
                    className={`${inputClasses} pr-8`}
                    value={form.modelo}
                    onChange={(e) => {
                      setForm({ ...form, modelo: e.target.value });
                      setBuscaModelo(e.target.value);
                    }}
                    onFocus={() => {
                      setCampoFocado("modelo");
                      setBuscaModelo("");
                    }}
                    onBlur={() => setTimeout(() => setCampoFocado((atual) => (atual === "modelo" ? null : atual)), 200)}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Ver modelos disponíveis"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => refModelo.current?.focus()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown size={16} />
                  </button>
                  {campoFocado === "modelo" && sugestoesModelo.length > 0 && (
                    <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
                      {sugestoesModelo.map((m) => (
                        <li
                          key={m}
                          className="px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer"
                          onMouseDown={() => {
                            setForm({ ...form, modelo: m });
                            setBuscaModelo(m);
                          }}
                        >
                          {m}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="eq-serie">Número de série (opcional)</Label>
              <Input
                id="eq-serie"
                value={form.numeroSerie}
                onChange={(e) => setForm({ ...form, numeroSerie: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="eq-local">Local de instalação (opcional)</Label>
              <Input
                id="eq-local"
                value={form.localInstalacao}
                onChange={(e) => setForm({ ...form, localInstalacao: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="eq-frequencia">Frequência de manutenção preventiva, em meses (opcional)</Label>
              <Input
                id="eq-frequencia"
                type="number"
                min={1}
                placeholder="Ex: 6"
                value={form.frequenciaManutencaoMeses}
                onChange={(e) => setForm({ ...form, frequenciaManutencaoMeses: e.target.value })}
              />
              <span className="text-xs text-muted-foreground">
                Deixe em branco se esse equipamento só tem manutenção corretiva (sob demanda).
              </span>
            </div>
            <Button type="submit" disabled={salvando} className="mt-2 w-full">
              {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Cadastrar equipamento"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({
  icone: Icone,
  rotulo,
  valor,
}: {
  icone: LucideIcon;
  rotulo: string;
  valor?: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-4 py-1">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icone size={16} />
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className="max-w-full wrap-break-word text-center text-sm text-foreground">{valor || "—"}</p>
    </div>
  );
}
