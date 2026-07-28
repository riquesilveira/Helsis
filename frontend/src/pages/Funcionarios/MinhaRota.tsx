import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { RotaFuncionario } from "../../types";
import { CartaoVisitaRota } from "../../components/CartaoVisitaRota";
import { PageHeader } from "../../components/PageHeader";
import { Input } from "../../components/shadcn/input";
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
      <PageHeader
        titulo="Minha rota"
        subtitulo={`${usuario ? `Olá, ${usuario.nome.split(" ")[0]}. ` : ""}Seus atendimentos por dia.`}
      />

      <div className="flex items-center gap-3">
        <Input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="w-auto"
        />
        <span className="text-sm text-muted-foreground capitalize">{dataFormatada}</span>
      </div>

      <div>
        <h2 className="text-sm font-medium text-foreground mb-3">Rota do dia</h2>
        <div className="space-y-3">
          {rota?.agendadasParaData.map((os) => (
            <CartaoVisitaRota key={os.id} os={os} />
          ))}
          {rota && rota.agendadasParaData.length === 0 && (
            <p className="text-sm text-muted-foreground bg-card border border-border rounded-lg px-4 py-4">
              Nenhuma visita agendada para esse dia.
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-foreground mb-3">
          Outras OS em aberto (sem data ou de outros dias)
        </h2>
        <div className="space-y-3">
          {rota?.outrasEmAberto.map((os) => (
            <CartaoVisitaRota key={os.id} os={os} />
          ))}
          {rota && rota.outrasEmAberto.length === 0 && (
            <p className="text-sm text-muted-foreground bg-card border border-border rounded-lg px-4 py-4">
              Nenhuma outra OS em aberto no momento.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
