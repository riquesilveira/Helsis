import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { EquipamentoComManutencao, StatusManutencaoPreventiva } from "../../types";
import { PageHeader } from "../../components/PageHeader";
import { Badge } from "../../components/shadcn/badge";
import { Button } from "../../components/shadcn/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../../components/shadcn/card";

const ROTULO_STATUS: Record<StatusManutencaoPreventiva, string> = {
  ATRASADA: "Atrasada",
  PROXIMA: "Próxima",
  EM_DIA: "Em dia",
};

// Fundo suave (10% da cor) + texto forte, no estilo do StatusBadge das OS.
const CLASSE_STATUS: Record<StatusManutencaoPreventiva, string> = {
  ATRASADA: "bg-danger/10 text-danger",
  PROXIMA: "bg-status-diagnostico/10 text-status-diagnostico",
  EM_DIA: "bg-status-concluido/10 text-status-concluido",
};

const PONTO_STATUS: Record<StatusManutencaoPreventiva, string> = {
  ATRASADA: "bg-danger",
  PROXIMA: "bg-status-diagnostico",
  EM_DIA: "bg-status-concluido",
};

function StatusPreventivaBadge({ status }: { status: StatusManutencaoPreventiva }) {
  return (
    <Badge className={`gap-1.5 border-transparent ${CLASSE_STATUS[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${PONTO_STATUS[status]}`} />
      {ROTULO_STATUS[status]}
    </Badge>
  );
}

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
      <PageHeader
        titulo="Manutenções preventivas"
        subtitulo="Agenda de revisões programadas — não depende do cliente relatar um problema."
      />

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Atrasadas</CardDescription>
            <CardTitle className="text-2xl font-semibold text-danger">{contagem.ATRASADA}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Nos próximos 30 dias</CardDescription>
            <CardTitle className="text-2xl font-semibold text-status-diagnostico">
              {contagem.PROXIMA}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Em dia</CardDescription>
            <CardTitle className="text-2xl font-semibold text-status-concluido">
              {contagem.EM_DIA}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="py-0">
        <div className="divide-y divide-border">
          {carregando && (
            <p className="px-5 py-4 text-sm text-muted-foreground">Carregando...</p>
          )}
          {!carregando &&
            equipamentos.map((eq) => (
              <div key={eq.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">
                    {eq.cliente.nome} <span className="text-muted-foreground">·</span> {eq.tipo}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Preventiva a cada {eq.frequenciaManutencaoMeses} meses · próxima em{" "}
                    {formatarData(eq.proximaManutencaoPreventiva)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <StatusPreventivaBadge status={eq.statusPreventiva} />
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      to={`/ordens-servico/nova?clienteId=${eq.cliente.id}&equipamentoId=${eq.id}&tipo=PREVENTIVA`}
                    >
                      Abrir OS preventiva →
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          {!carregando && equipamentos.length === 0 && (
            <p className="px-5 py-4 text-sm text-muted-foreground">
              Nenhum equipamento com manutenção preventiva agendada ainda. Defina uma frequência ao
              cadastrar ou editar um equipamento.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
