import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../services/api";
import { Funcionario, RotaFuncionario as RotaFuncionarioType } from "../../types";
import { CartaoVisitaRota } from "../../components/CartaoVisitaRota";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export function RotaFuncionario() {
  const { id } = useParams();
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [rota, setRota] = useState<RotaFuncionarioType | null>(null);
  const [data, setData] = useState(hojeISO());

  useEffect(() => {
    api.get(`/funcionarios/${id}`).then((r) => setFuncionario(r.data)).catch(() => {});
  }, [id]);

  useEffect(() => {
    api.get(`/funcionarios/${id}/rota`, { params: { data } }).then((r) => setRota(r.data)).catch(() => {});
  }, [id, data]);

  const dataFormatada = new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-grafite-900">
            {funcionario?.usuario.nome ?? "Rota do técnico"}
          </h1>
          <p className="text-sm text-grafite-600 mt-1">{funcionario?.cargo}</p>
        </div>
        {id && (
          <Link to={`/funcionarios/${id}`} className="text-xs font-medium text-teal-700 hover:text-teal-800">
            Ver desempenho completo →
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="border border-grafite-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <span className="text-sm text-grafite-500 capitalize">{dataFormatada}</span>
      </div>

      <div>
        <h2 className="text-sm font-medium text-grafite-900 mb-3">Rota do dia</h2>
        <div className="space-y-3">
          {rota?.agendadasParaData.map((os) => (
            <CartaoVisitaRota key={os.id} os={os} />
          ))}
          {rota && rota.agendadasParaData.length === 0 && (
            <p className="text-sm text-grafite-500 bg-white border border-grafite-200 rounded-lg px-4 py-4">
              Nenhuma visita agendada para esse dia.
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-grafite-900 mb-3">
          Outras OS em aberto (sem data ou de outros dias)
        </h2>
        <div className="space-y-3">
          {rota?.outrasEmAberto.map((os) => (
            <CartaoVisitaRota key={os.id} os={os} />
          ))}
          {rota && rota.outrasEmAberto.length === 0 && (
            <p className="text-sm text-grafite-500 bg-white border border-grafite-200 rounded-lg px-4 py-4">
              Nenhuma outra OS em aberto no momento.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
