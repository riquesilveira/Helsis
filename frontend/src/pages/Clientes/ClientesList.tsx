import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";
import { api } from "../../services/api";
import { Cliente } from "../../types";
import { Campo, classeInput, Modal } from "../../components/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button, classeBotao } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Badge";

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
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(CLIENTE_VAZIO);
  const [salvando, setSalvando] = useState(false);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      // Remove campos vazios para não falhar na validação do backend
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== "")
      );
      await api.post("/clientes", payload);
      setModalAberto(false);
      setForm(CLIENTE_VAZIO);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Clientes"
        subtitulo="Empresas e unidades atendidas."
        acoes={
          <Button onClick={() => setModalAberto(true)}>
            <Plus size={16} />
            Novo cliente
          </Button>
        }
      />

      <Card className="divide-y divide-grafite-100 overflow-hidden p-0">
        {carregando && (
          <p className="text-sm text-grafite-500 px-5 py-4">Carregando...</p>
        )}
        {!carregando && clientes.map((c) => (
          <Link
            key={c.id}
            to={`/clientes/${c.id}`}
            className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-grafite-50"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-700">
                {c.nome.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-grafite-900 truncate">{c.nome}</p>
                <p className="text-xs text-grafite-500 mt-0.5 truncate">
                  {c.telefone}
                  {c.cidade ? ` — ${c.cidade}/${c.estado ?? ""}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <Chip>{c.equipamentos?.length ?? 0} equip.</Chip>
              <ChevronRight size={16} className="text-grafite-300 transition-colors group-hover:text-grafite-500" />
            </div>
          </Link>
        ))}
        {!carregando && clientes.length === 0 && (
          <p className="text-sm text-grafite-500 px-5 py-4">Nenhum cliente cadastrado ainda.</p>
        )}
      </Card>

      <Modal titulo="Novo cliente" aberto={modalAberto} onFechar={() => setModalAberto(false)}>
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
            {salvando ? "Salvando..." : "Cadastrar cliente"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
