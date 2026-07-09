import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../services/api";
import { Cliente, Equipamento } from "../../types";
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

export function ClienteDetail() {
  const { id } = useParams();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(EQUIPAMENTO_VAZIO);
  const [salvando, setSalvando] = useState(false);

  function carregar() {
    api.get(`/clientes/${id}`).then((r) => setCliente(r.data)).catch(() => {});
  }

  useEffect(carregar, [id]);

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
            <input
              required
              placeholder="Ex: Ressonância Magnética 1.5T, Tomógrafo 64 canais"
              className={classeInput}
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Marca">
              <input
                className={classeInput}
                value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
              />
            </Campo>
            <Campo rotulo="Modelo">
              <input
                className={classeInput}
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
              />
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
