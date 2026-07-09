import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../services/api";
import { Cliente, Equipamento, Funcionario, TipoOS } from "../../types";
import { Campo, classeInput } from "../../components/Modal";

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
      <h1 className="text-xl font-semibold text-grafite-900">Nova ordem de serviço</h1>

      <form onSubmit={handleSubmit} className="bg-white border border-grafite-200 rounded-lg p-5">
        <Campo rotulo="Tipo de atendimento">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleTipoChange("CORRETIVA")}
              className={`flex-1 text-sm rounded-md py-2 border transition-colors ${
                tipo === "CORRETIVA"
                  ? "bg-teal-600 text-white border-teal-600"
                  : "border-grafite-200 text-grafite-600 hover:bg-grafite-50"
              }`}
            >
              Corretiva
            </button>
            <button
              type="button"
              onClick={() => handleTipoChange("PREVENTIVA")}
              className={`flex-1 text-sm rounded-md py-2 border transition-colors ${
                tipo === "PREVENTIVA"
                  ? "bg-teal-600 text-white border-teal-600"
                  : "border-grafite-200 text-grafite-600 hover:bg-grafite-50"
              }`}
            >
              Preventiva
            </button>
          </div>
          <span className="text-xs text-grafite-500 mt-1 block">
            {tipo === "CORRETIVA"
              ? "Aberta por causa de um problema relatado pelo cliente."
              : "Manutenção agendada, sem necessariamente ter um problema relatado."}
          </span>
        </Campo>

        <Campo rotulo="Cliente">
          <select
            required
            className={classeInput}
            value={clienteId}
            onChange={(e) => {
              setClienteId(e.target.value);
              setEquipamentoId("");
            }}
          >
            <option value="">Selecione...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Equipamento">
          <select
            required
            disabled={!clienteId}
            className={classeInput}
            value={equipamentoId}
            onChange={(e) => setEquipamentoId(e.target.value)}
          >
            <option value="">
              {clienteId ? "Selecione..." : "Escolha um cliente primeiro"}
            </option>
            {equipamentos.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.tipo} {eq.marca ? `— ${eq.marca} ${eq.modelo ?? ""}` : ""}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Técnico responsável (opcional)">
          <select
            className={classeInput}
            value={funcionarioId}
            onChange={(e) => setFuncionarioId(e.target.value)}
          >
            <option value="">A definir depois</option>
            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>
                {f.usuario.nome} — {f.cargo}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Data agendada da visita (opcional)">
          <input
            type="date"
            className={classeInput}
            value={dataAgendada}
            onChange={(e) => setDataAgendada(e.target.value)}
          />
          <span className="text-xs text-grafite-500 mt-1 block">
            É essa data que define em qual dia a OS aparece na rota do técnico.
          </span>
        </Campo>

        <Campo rotulo="Modalidade de atendimento">
          <select
            className={classeInput}
            value={modalidade}
            onChange={(e) => setModalidade(e.target.value as typeof modalidade)}
          >
            <option value="VISITA_TECNICA">Visita técnica (técnico vai até o cliente)</option>
            <option value="OFICINA">Oficina (cliente traz o equipamento)</option>
            <option value="REMOTO">Suporte remoto</option>
          </select>
        </Campo>

        <Campo rotulo={tipo === "PREVENTIVA" ? "Observações" : "Descrição do problema"}>
          <textarea
            required
            rows={3}
            className={classeInput}
            value={descricaoProblema}
            onChange={(e) => setDescricaoProblema(e.target.value)}
          />
        </Campo>

        {erro && <p className="text-sm text-status-cancelado mb-3">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md py-2 transition-colors disabled:opacity-60"
        >
          {enviando ? "Abrindo..." : "Abrir ordem de serviço"}
        </button>
      </form>
    </div>
  );
}
