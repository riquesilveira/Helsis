import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../services/api";
import { Cliente, Equipamento, EquipamentoCatalogoItem } from "../../types";
import { Campo, classeInput, Modal } from "../../components/Modal";

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

  // Catálogo de referência (tipo/marca/modelo) — carregado uma vez ao abrir
  // o modal, usado só pra sugerir. O usuário sempre pode digitar algo novo.
  const [catalogo, setCatalogo] = useState<EquipamentoCatalogoItem[]>([]);
  const [campoFocado, setCampoFocado] = useState<"tipo" | "marca" | "modelo" | null>(null);

  function carregar() {
    api.get(`/clientes/${id}`).then((r) => setCliente(r.data)).catch(() => {});
  }

  useEffect(carregar, [id]);

  useEffect(() => {
    if (modalAberto && catalogo.length === 0) {
      api.get("/equipamentos/catalogo").then((r) => setCatalogo(r.data)).catch(() => {});
    }
  }, [modalAberto, catalogo.length]);

  const tiposUnicos = Array.from(new Set(catalogo.map((c) => c.tipo)));
  const sugestoesTipo = form.tipo
    ? tiposUnicos.filter((t) => normalizar(t).startsWith(normalizar(form.tipo))).slice(0, 8)
    : [];

  // Marca: prioriza marcas do tipo já selecionado, mas cai pra todas se
  // o tipo digitado ainda não bater com nenhum item do catálogo.
  const marcasDoTipo = form.tipo
    ? catalogo.filter((c) => normalizar(c.tipo) === normalizar(form.tipo))
    : catalogo;
  const marcasUnicas = Array.from(new Set((marcasDoTipo.length ? marcasDoTipo : catalogo).map((c) => c.marca)));
  const sugestoesMarca = form.marca
    ? marcasUnicas.filter((m) => normalizar(m).startsWith(normalizar(form.marca))).slice(0, 8)
    : [];

  // Modelo: filtra pela marca (e tipo, se houver) já selecionados.
  const modelosDaMarca = catalogo.filter(
    (c) =>
      (!form.marca || normalizar(c.marca) === normalizar(form.marca)) &&
      (!form.tipo || normalizar(c.tipo) === normalizar(form.tipo))
  );
  const sugestoesModelo = form.modelo
    ? modelosDaMarca
        .map((c) => c.modelo)
        .filter((m) => normalizar(m).startsWith(normalizar(form.modelo)))
        .slice(0, 8)
    : [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post("/equipamentos", {
        ...form,
        clienteId: id,
        frequenciaManutencaoMeses: form.frequenciaManutencaoMeses
          ? Number(form.frequenciaManutencaoMeses)
          : undefined,
      });
      setModalAberto(false);
      setForm(EQUIPAMENTO_VAZIO);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  if (!cliente) return <p className="text-sm text-grafite-500">Carregando...</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-grafite-900">{cliente.nome}</h1>
        <p className="text-sm text-grafite-600 mt-1">
          {cliente.telefone}
          {cliente.email ? ` — ${cliente.email}` : ""}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-grafite-900">Equipamentos</h2>
        <button
          onClick={() => setModalAberto(true)}
          className="text-xs font-medium text-teal-700 hover:text-teal-800"
        >
          + Novo equipamento
        </button>
      </div>

      <div className="bg-white border border-grafite-200 rounded-lg divide-y divide-grafite-100">
        {(cliente.equipamentos ?? []).map((eq: Equipamento) => (
          <div key={eq.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm text-grafite-900">{eq.tipo}</p>
              <p className="text-xs text-grafite-500 mt-0.5">
                {eq.marca} {eq.modelo} {eq.numeroSerie ? `— nº ${eq.numeroSerie}` : ""}
              </p>
              {eq.frequenciaManutencaoMeses ? (
                <p className="text-xs text-teal-700 mt-0.5">
                  Preventiva a cada {eq.frequenciaManutencaoMeses} meses
                  {eq.proximaManutencaoPreventiva
                    ? ` · próxima em ${formatarProximaData(eq.proximaManutencaoPreventiva)}`
                    : ""}
                </p>
              ) : (
                <p className="text-xs text-grafite-400 mt-0.5">Sem manutenção preventiva agendada</p>
              )}
            </div>
            <Link
              to={`/ordens-servico/nova?clienteId=${cliente.id}&equipamentoId=${eq.id}`}
              className="text-xs font-medium text-teal-700 hover:text-teal-800 flex-shrink-0"
            >
              Abrir OS →
            </Link>
          </div>
        ))}
        {(cliente.equipamentos ?? []).length === 0 && (
          <p className="text-sm text-grafite-500 px-5 py-4">Nenhum equipamento cadastrado.</p>
        )}
      </div>

      <Modal
        titulo="Novo equipamento"
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
      >
        <form onSubmit={handleSubmit}>
          <Campo rotulo="Tipo de equipamento">
            <div className="relative">
              <input
                required
                autoComplete="off"
                placeholder="Ex: Ressonância Magnética, Tomógrafo"
                className={classeInput}
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                onFocus={() => setCampoFocado("tipo")}
                onBlur={() => setTimeout(() => setCampoFocado(null), 200)}
              />
              {campoFocado === "tipo" && sugestoesTipo.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-grafite-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {sugestoesTipo.map((t) => (
                    <li
                      key={t}
                      className="px-3 py-2 text-sm text-grafite-900 hover:bg-teal-50 cursor-pointer"
                      onMouseDown={() => setForm({ ...form, tipo: t })}
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
                  autoComplete="off"
                  className={classeInput}
                  value={form.marca}
                  onChange={(e) => setForm({ ...form, marca: e.target.value })}
                  onFocus={() => setCampoFocado("marca")}
                  onBlur={() => setTimeout(() => setCampoFocado(null), 200)}
                />
                {campoFocado === "marca" && sugestoesMarca.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-grafite-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {sugestoesMarca.map((m) => (
                      <li
                        key={m}
                        className="px-3 py-2 text-sm text-grafite-900 hover:bg-teal-50 cursor-pointer"
                        onMouseDown={() => setForm({ ...form, marca: m })}
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
                  autoComplete="off"
                  className={classeInput}
                  value={form.modelo}
                  onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                  onFocus={() => setCampoFocado("modelo")}
                  onBlur={() => setTimeout(() => setCampoFocado(null), 200)}
                />
                {campoFocado === "modelo" && sugestoesModelo.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-grafite-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {sugestoesModelo.map((m) => (
                      <li
                        key={m}
                        className="px-3 py-2 text-sm text-grafite-900 hover:bg-teal-50 cursor-pointer"
                        onMouseDown={() => setForm({ ...form, modelo: m })}
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
          <button
            type="submit"
            disabled={salvando}
            className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md py-2 transition-colors disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Cadastrar equipamento"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
