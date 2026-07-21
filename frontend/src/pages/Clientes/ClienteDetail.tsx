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
import { Campo, classeInput, Modal } from "../../components/Modal";
import { Card } from "../../components/ui/Card";
import { Button, classeBotao } from "../../components/ui/Button";
import { HospitalLogo, corHospital } from "../../components/ui/HospitalLogo";

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
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

  if (!cliente) return <p className="text-sm text-grafite-500">Carregando...</p>;

  const [c1, c2] = corHospital(cliente.nome);
  const equipamentos = cliente.equipamentos ?? [];
  const endereco = [cliente.endereco, [cliente.cidade, cliente.estado].filter(Boolean).join("/")]
    .filter(Boolean)
    .join(" — ");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link
        to="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-grafite-500 hover:text-grafite-900 transition-colors"
      >
        <ArrowLeft size={16} />
        Clientes
      </Link>

      {/* Header / hero do estabelecimento */}
      <Card className="overflow-hidden p-0">
        <div className="h-28" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
        <div className="px-6 pb-8 text-center">
          <HospitalLogo nome={cliente.nome} size={104} className="mx-auto -mt-14 ring-4 ring-white" />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-grafite-900">
            {cliente.nome}
          </h1>
          {cliente.documento && (
            <p className="codigo mt-1 text-xs text-grafite-500">{cliente.documento}</p>
          )}

          <div className="mx-auto mt-6 grid max-w-3xl gap-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-grafite-100">
            <InfoItem icone={Phone} rotulo="Telefone" valor={cliente.telefone} />
            <InfoItem icone={Mail} rotulo="E-mail" valor={cliente.email} />
            <InfoItem icone={MapPin} rotulo="Endereço" valor={endereco} />
          </div>
        </div>
      </Card>

      {/* Equipamentos */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-grafite-900">
          Equipamentos
          <span className="ml-2 text-sm font-normal text-grafite-400">{equipamentos.length}</span>
        </h2>
        <Button tamanho="sm" onClick={abrirNovo}>
          <Plus size={14} />
          Novo equipamento
        </Button>
      </div>

      <div className="space-y-2">
        {equipamentos.map((eq: Equipamento) => (
          <Card key={eq.id} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Cpu size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-grafite-900 truncate">{eq.tipo}</p>
                <p className="text-xs text-grafite-500 mt-0.5 truncate">
                  {[eq.marca, eq.modelo].filter(Boolean).join(" ")}
                  {eq.numeroSerie ? ` — nº ${eq.numeroSerie}` : ""}
                </p>
                {eq.frequenciaManutencaoMeses ? (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-teal-700">
                    <CalendarClock size={12} className="flex-shrink-0" />
                    Preventiva a cada {eq.frequenciaManutencaoMeses} meses
                    {eq.proximaManutencaoPreventiva
                      ? ` · próxima em ${formatarProximaData(eq.proximaManutencaoPreventiva)}`
                      : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-grafite-400">Sem manutenção preventiva agendada</p>
                )}
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                onClick={() => abrirEdicao(eq)}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-grafite-600 hover:bg-grafite-100 hover:text-grafite-900 transition-colors"
              >
                <Pencil size={13} />
                Editar
              </button>
              <Link
                to={`/ordens-servico/nova?clienteId=${cliente.id}&equipamentoId=${eq.id}`}
                className={classeBotao("secondary", "sm")}
              >
                Abrir OS
                <ArrowRight size={13} />
              </Link>
            </div>
          </Card>
        ))}
        {equipamentos.length === 0 && (
          <Card className="px-5 py-8 text-center text-sm text-grafite-500">
            Nenhum equipamento cadastrado.
          </Card>
        )}
      </div>

      <Modal
        titulo={editandoId ? "Editar equipamento" : "Novo equipamento"}
        aberto={modalAberto}
        onFechar={fecharModal}
      >
        <form onSubmit={handleSubmit}>
          <Campo rotulo="Tipo de equipamento">
            <div className="relative">
              <input
                ref={refTipo}
                required
                autoComplete="off"
                placeholder="Ex: Ressonância Magnética, Tomógrafo"
                className={`${classeInput} pr-8`}
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
                className="absolute right-2 top-1/2 -translate-y-1/2 text-grafite-400 hover:text-grafite-600"
              >
                <ChevronDown size={16} />
              </button>
              {campoFocado === "tipo" && sugestoesTipo.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-grafite-100 rounded-xl shadow-dropdown max-h-48 overflow-y-auto">
                  {sugestoesTipo.map((t) => (
                    <li
                      key={t}
                      className="px-3 py-2 text-sm text-grafite-900 hover:bg-teal-50 cursor-pointer"
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
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Marca">
              <div className="relative">
                <input
                  ref={refMarca}
                  autoComplete="off"
                  className={`${classeInput} pr-8`}
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-grafite-400 hover:text-grafite-600"
                >
                  <ChevronDown size={16} />
                </button>
                {campoFocado === "marca" && sugestoesMarca.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-grafite-100 rounded-xl shadow-dropdown max-h-48 overflow-y-auto">
                    {sugestoesMarca.map((m) => (
                      <li
                        key={m}
                        className="px-3 py-2 text-sm text-grafite-900 hover:bg-teal-50 cursor-pointer"
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
            </Campo>
            <Campo rotulo="Modelo">
              <div className="relative">
                <input
                  ref={refModelo}
                  autoComplete="off"
                  className={`${classeInput} pr-8`}
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-grafite-400 hover:text-grafite-600"
                >
                  <ChevronDown size={16} />
                </button>
                {campoFocado === "modelo" && sugestoesModelo.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-grafite-100 rounded-xl shadow-dropdown max-h-48 overflow-y-auto">
                    {sugestoesModelo.map((m) => (
                      <li
                        key={m}
                        className="px-3 py-2 text-sm text-grafite-900 hover:bg-teal-50 cursor-pointer"
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
            </Campo>
          </div>
          <Campo rotulo="Número de série (opcional)">
            <input
              className={classeInput}
              value={form.numeroSerie}
              onChange={(e) => setForm({ ...form, numeroSerie: e.target.value })}
            />
          </Campo>
          <Campo rotulo="Local de instalação (opcional)">
            <input
              className={classeInput}
              value={form.localInstalacao}
              onChange={(e) => setForm({ ...form, localInstalacao: e.target.value })}
            />
          </Campo>
          <Campo rotulo="Frequência de manutenção preventiva, em meses (opcional)">
            <input
              type="number"
              min={1}
              placeholder="Ex: 6"
              className={classeInput}
              value={form.frequenciaManutencaoMeses}
              onChange={(e) => setForm({ ...form, frequenciaManutencaoMeses: e.target.value })}
            />
            <span className="text-xs text-grafite-500 mt-1 block">
              Deixe em branco se esse equipamento só tem manutenção corretiva (sob demanda).
            </span>
          </Campo>
          <button type="submit" disabled={salvando} className={`${classeBotao("primary")} mt-2 w-full`}>
            {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Cadastrar equipamento"}
          </button>
        </form>
      </Modal>
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
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-grafite-100 text-grafite-500">
        <Icone size={16} />
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-grafite-400">{rotulo}</p>
      <p className="break-words text-center text-sm text-grafite-800">{valor || "—"}</p>
    </div>
  );
}
