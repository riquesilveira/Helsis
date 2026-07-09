import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { RotaFuncionario } from "../../types";
import { CartaoVisitaRota } from "../../components/CartaoVisitaRota";
import { usuarioLogado } from "../../services/auth";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Versão do técnico da tela de rota — mesma ideia da que o dono usa pra
 * ver a rota de qualquer um, só que aqui o backend resolve o técnico a
 * partir do próprio login (GET /funcionarios/me/rota), então a pessoa só
 * enxerga a própria agenda.
 */
export function MinhaRota() {
  const usuario = usuarioLogado();
  const [rota, setRota] = useState<RotaFuncionario | null>(null);
  const [data, setData] = useState(hojeISO());

  useEffect(() => {
    api.get("/funcionarios/me/rota", { params: { data } }).then((r) => setRota(r.data)).catch(() => {});
  }, [data]);

  const dataFormatada = new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-grafite-900">Minha rota</h1>
        <p className="text-sm text-grafite-600 mt-1">
          {usuario ? `Olá, ${usuario.nome.split(" ")[0]}.` : ""} Seus atendimentos por dia.
        </p>
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
