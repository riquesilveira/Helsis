import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { EquipamentoComManutencao, StatusManutencaoPreventiva } from "../../types";

const ROTULO_STATUS: Record<StatusManutencaoPreventiva, string> = {
  ATRASADA: "Atrasada",
  PROXIMA: "Próxima",
  EM_DIA: "Em dia",
};

const COR_STATUS: Record<StatusManutencaoPreventiva, string> = {
  ATRASADA: "text-status-cancelado",
  PROXIMA: "text-status-diagnostico",
  EM_DIA: "text-status-concluido",
};

function formatarData(iso?: string | null) {
  if (!iso) return "sem data definida";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function ManutencoesPreventivas() {
  const [equipamentos, setEquipamentos] = useState<EquipamentoComManutencao[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    api.get("/equipamentos/manutencoes-preventivas").then((r) => setEquipamentos(r.data)).catch(() => {}).finally(() => setCarregando(false));
  }, []);

  const contagem = {
    ATRASADA: equipamentos.filter((e) => e.statusPreventiva === "ATRASADA").length,
    PROXIMA: equipamentos.filter((e) => e.statusPreventiva === "PROXIMA").length,
    EM_DIA: equipamentos.filter((e) => e.statusPreventiva === "EM_DIA").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-grafite-900">Manutenções preventivas</h1>
        <p className="text-sm text-grafite-600 mt-1">
          Agenda de revisões programadas — não depende do cliente relatar um problema.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-grafite-200 rounded-lg p-5">
          <p className="text-xs text-grafite-500">Atrasadas</p>
          <p className="codigo text-2xl font-semibold text-status-cancelado mt-1">
            {contagem.ATRASADA}
          </p>
        </div>
        <div className="bg-white border border-grafite-200 rounded-lg p-5">
          <p className="text-xs text-grafite-500">Nos próximos 30 dias</p>
          <p className="codigo text-2xl font-semibold text-status-diagnostico mt-1">
            {contagem.PROXIMA}
          </p>
        </div>
        <div className="bg-white border border-grafite-200 rounded-lg p-5">
          <p className="text-xs text-grafite-500">Em dia</p>
          <p className="codigo text-2xl font-semibold text-status-concluido mt-1">
            {contagem.EM_DIA}
          </p>
        </div>
      </div>

      <div className="bg-white border border-grafite-200 rounded-lg divide-y divide-grafite-100">
        {carregando && (
          <p className="text-sm text-grafite-500 px-5 py-4">Carregando...</p>
        )}
        {!carregando && equipamentos.map((eq) => (
          <div key={eq.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm text-grafite-900">
                {eq.cliente.nome} <span className="text-grafite-400">·</span> {eq.tipo}
              </p>
              <p className="text-xs text-grafite-500 mt-0.5">
                Preventiva a cada {eq.frequenciaManutencaoMeses} meses · próxima em{" "}
                <span className="codigo">{formatarData(eq.proximaManutencaoPreventiva)}</span>
              </p>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className={`codigo text-xs font-medium ${COR_STATUS[eq.statusPreventiva]}`}>
                {ROTULO_STATUS[eq.statusPreventiva]}
              </span>
              <Link
                to={`/ordens-servico/nova?clienteId=${eq.cliente.id}&equipamentoId=${eq.id}&tipo=PREVENTIVA`}
                className="text-xs font-medium text-teal-700 hover:text-teal-800"
              >
                Abrir OS preventiva →
              </Link>
            </div>
          </div>
        ))}
        {!carregando && equipamentos.length === 0 && (
          <p className="text-sm text-grafite-500 px-5 py-4">
            Nenhum equipamento com manutenção preventiva agendada ainda. Defina uma frequência ao
            cadastrar ou editar um equipamento.
          </p>
        )}
      </div>
    </div>
  );
}
