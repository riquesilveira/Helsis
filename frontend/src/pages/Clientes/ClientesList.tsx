import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, MoreVertical, Pencil, Plus, Search, Trash2, Wrench } from "lucide-react";
import { api } from "../../services/api";
import { Cliente } from "../../types";
import { Campo, classeInput, Modal } from "../../components/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button, classeBotao } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Badge";
import { HospitalLogo } from "../../components/ui/HospitalLogo";

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
            <Plus size={16} />
            Novo cliente
          </Button>
        }
      />

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-grafite-400" />
        <input
          type="text"
          placeholder="Buscar por nome ou endereço..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="input-base pl-9"
        />
      </div>

      <Card className="divide-y divide-grafite-100 overflow-hidden p-0">
        {carregando && (
          <p className="text-sm text-grafite-500 px-5 py-4">Carregando...</p>
        )}
        {!carregando && clientesFiltrados.map((c) => (
          <div
            key={c.id}
            className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-grafite-50"
          >
            <Link to={`/clientes/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <HospitalLogo nome={c.nome} size={40} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-grafite-900 truncate">{c.nome}</p>
                <p className="text-xs text-grafite-500 mt-0.5 truncate">
                  {c.telefone}
                  {c.cidade ? ` — ${c.cidade}/${c.estado ?? ""}` : ""}
                </p>
              </div>
            </Link>
            <div className="flex flex-shrink-0 items-center gap-2">
              <Chip>{c.equipamentos?.length ?? 0} equip.</Chip>
              <MenuAcoes
                cliente={c}
                onEditar={() => abrirEdicao(c)}
                onExcluir={() => {
                  setErroExcluir("");
                  setClienteExcluir(c);
                }}
              />
            </div>
          </div>
        ))}
        {!carregando && clientesFiltrados.length === 0 && (
          <p className="text-sm text-grafite-500 px-5 py-4">
            {clientes.length === 0
              ? "Nenhum cliente cadastrado ainda."
              : "Nenhum cliente encontrado com essa busca."}
          </p>
        )}
      </Card>

      <Modal
        titulo={editandoId ? "Editar cliente" : "Novo cliente"}
        aberto={modalAberto}
        onFechar={fecharModal}
      >
        <form onSubmit={handleSubmit}>
          <Campo rotulo="Nome">
            <input
              required
              className={classeInput}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </Campo>
          <Campo rotulo="Telefone">
            <input
              required
              type="tel"
              inputMode="tel"
              placeholder="(11) 91234-5678"
              className={classeInput}
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: formatarTelefone(e.target.value) })}
            />
          </Campo>
          <Campo rotulo="E-mail (opcional)">
            <input
              type="email"
              name="email"
              autoComplete="email"
              className={classeInput}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Cidade">
              <div className="relative">
                <input
                  className={classeInput}
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
                  <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-grafite-100 rounded-xl shadow-dropdown max-h-48 overflow-y-auto">
                    {sugestoesCidade.map((m) => (
                      <li
                        key={`${m.nome}-${m.microrregiao.mesorregiao.UF.sigla}`}
                        className="px-3 py-2 text-sm text-grafite-900 hover:bg-teal-50 cursor-pointer"
                        onMouseDown={() => selecionarCidade(m)}
                      >
                        {m.nome}{" "}
                        <span className="text-grafite-400">
                          — {m.microrregiao.mesorregiao.UF.sigla}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Campo>
            <Campo rotulo="Estado (UF)">
              <input
                maxLength={2}
                className={classeInput}
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })}
              />
            </Campo>
          </div>
          <button type="submit" disabled={salvando} className={`${classeBotao("primary")} mt-2 w-full`}>
            {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Cadastrar cliente"}
          </button>
        </form>
      </Modal>

      <Modal
        titulo="Excluir cliente"
        aberto={!!clienteExcluir}
        onFechar={() => setClienteExcluir(null)}
      >
        <p className="text-sm text-grafite-600">
          Tem certeza que deseja excluir{" "}
          <strong className="text-grafite-900">{clienteExcluir?.nome}</strong>? Essa ação
          não pode ser desfeita.
        </p>
        {erroExcluir && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erroExcluir}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setClienteExcluir(null)}
            className={classeBotao("secondary")}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={excluindo}
            onClick={excluirCliente}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            <Trash2 size={15} />
            {excluindo ? "Excluindo..." : "Excluir cliente"}
          </button>
        </div>
      </Modal>
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
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!aberto) return;
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, [aberto]);

  const itemBase =
    "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Ações do cliente"
        onClick={() => setAberto((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-grafite-400 transition-colors hover:bg-grafite-100 hover:text-grafite-700"
      >
        <MoreVertical size={18} />
      </button>
      {aberto && (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-grafite-200 bg-white shadow-dropdown">
          <button
            type="button"
            onClick={() => {
              setAberto(false);
              navigate(`/clientes/${cliente.id}`);
            }}
            className={`${itemBase} text-grafite-700 hover:bg-grafite-50`}
          >
            <Eye size={15} className="text-grafite-400" />
            Ver detalhes
          </button>
          <button
            type="button"
            onClick={() => {
              setAberto(false);
              onEditar();
            }}
            className={`${itemBase} text-grafite-700 hover:bg-grafite-50`}
          >
            <Pencil size={15} className="text-grafite-400" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => {
              setAberto(false);
              navigate(`/ordens-servico/nova?clienteId=${cliente.id}`);
            }}
            className={`${itemBase} text-grafite-700 hover:bg-grafite-50`}
          >
            <Wrench size={15} className="text-grafite-400" />
            Nova OS
          </button>
          <div className="border-t border-grafite-100" />
          <button
            type="button"
            onClick={() => {
              setAberto(false);
              onExcluir();
            }}
            className={`${itemBase} text-red-600 hover:bg-red-50`}
          >
            <Trash2 size={15} />
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}
