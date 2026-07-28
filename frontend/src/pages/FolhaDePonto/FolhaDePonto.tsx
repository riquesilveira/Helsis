import { useEffect, useMemo, useState } from "react";
import { Clock, LogIn, LogOut } from "lucide-react";
import { api } from "../../services/api";
import { PageHeader } from "../../components/PageHeader";
import { usuarioLogado } from "../../services/auth";
import { Funcionario, RegistroPonto } from "../../types";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "../../components/shadcn/card";
import { Button } from "../../components/shadcn/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/shadcn/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/shadcn/select";

// Sentinela do filtro: o Select do shadcn não aceita item com value="",
// então "todos" mapeia para o estado "" (sem filtro) sem alterar a lógica.
const TODOS = "todos";

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Duração entre entrada e saída (ou "em andamento" se ainda aberto).
function duracao(entrada: string, saida: string | null): string {
  const fim = saida ? new Date(saida).getTime() : Date.now();
  const min = Math.max(0, Math.round((fim - new Date(entrada).getTime()) / 60000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m}min`;
}

export function FolhaDePonto() {
  const usuario = usuarioLogado();
  const podeConsolidar = usuario?.papel === "DONO" || usuario?.papel === "GESTOR";

  const [atual, setAtual] = useState<RegistroPonto | null>(null);
  const [meus, setMeus] = useState<RegistroPonto[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // visão consolidada (gerente/dono)
  const [consolidado, setConsolidado] = useState<RegistroPonto[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [filtroFuncionario, setFiltroFuncionario] = useState("");

  function carregarMeus() {
    api.get("/ponto/atual").then((r) => setAtual(r.data)).catch(() => {});
    api.get("/ponto/meus").then((r) => setMeus(r.data)).catch(() => {});
  }

  function carregarConsolidado() {
    const params = filtroFuncionario ? `?funcionarioId=${filtroFuncionario}` : "";
    api.get(`/ponto${params}`).then((r) => setConsolidado(r.data)).catch(() => {});
  }

  useEffect(carregarMeus, []);
  useEffect(() => {
    if (podeConsolidar) {
      api.get("/funcionarios").then((r) => setFuncionarios(r.data)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (podeConsolidar) carregarConsolidado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroFuncionario]);

  async function baterPonto() {
    setErro(null);
    setEnviando(true);
    try {
      await api.post(`/ponto/${atual ? "saida" : "entrada"}`);
      carregarMeus();
      if (podeConsolidar) carregarConsolidado();
    } catch (err: any) {
      setErro(err?.response?.data?.erro ?? "Não foi possível registrar o ponto. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const horasHoje = useMemo(() => {
    const hoje = new Date().toDateString();
    const min = meus
      .filter((r) => new Date(r.entrada).toDateString() === hoje)
      .reduce((acc, r) => {
        const fim = r.saida ? new Date(r.saida).getTime() : Date.now();
        return acc + Math.max(0, (fim - new Date(r.entrada).getTime()) / 60000);
      }, 0);
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m}min`;
  }, [meus]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Folha de ponto"
        subtitulo="Registre sua entrada e saída e acompanhe suas horas."
      />

      {/* Cartão de bater ponto */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                atual ? "bg-muted text-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <Clock size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {atual ? "Turno em andamento" : "Fora do expediente"}
              </p>
              <p className="text-xs text-muted-foreground">
                {atual
                  ? `Entrada às ${formatarDataHora(atual.entrada)} · ${duracao(atual.entrada, null)}`
                  : `Horas hoje: ${horasHoje}`}
              </p>
            </div>
          </div>
          <Button onClick={baterPonto} disabled={enviando}>
            {atual ? <LogOut /> : <LogIn />}
            {enviando ? "Registrando..." : atual ? "Registrar saída" : "Registrar entrada"}
          </Button>
        </CardContent>
      </Card>
      {erro && <p className="text-sm text-danger">{erro}</p>}

      {/* Meus registros */}
      <Card className="py-0">
        <CardHeader className="border-b border-border py-4">
          <CardTitle className="text-sm">Meus registros</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="px-5 text-xs font-medium text-muted-foreground">
                Entrada
              </TableHead>
              <TableHead className="px-5 text-xs font-medium text-muted-foreground">
                Saída
              </TableHead>
              <TableHead className="px-5 text-xs font-medium text-muted-foreground">
                Duração
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meus.length === 0 ? (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell colSpan={3} className="px-5 py-4 text-sm text-muted-foreground">
                  Nenhum registro de ponto ainda.
                </TableCell>
              </TableRow>
            ) : (
              meus.map((r) => (
                <TableRow key={r.id} className="border-border hover:bg-muted/50">
                  <TableCell className="px-5 py-3 text-sm text-foreground">
                    {formatarDataHora(r.entrada)}
                  </TableCell>
                  <TableCell className="px-5 py-3 text-sm text-muted-foreground">
                    {r.saida ? (
                      formatarDataHora(r.saida)
                    ) : (
                      <span className="font-medium text-foreground">em andamento</span>
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-3 font-mono text-sm text-muted-foreground">
                    {duracao(r.entrada, r.saida)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Visão consolidada — gerente/dono */}
      {podeConsolidar && (
        <Card className="py-0">
          <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4">
            <CardTitle className="text-sm">Folha da equipe</CardTitle>
            <CardAction className="self-center">
              <Select
                value={filtroFuncionario || TODOS}
                onValueChange={(v) => setFiltroFuncionario(v === TODOS ? "" : v)}
              >
                <SelectTrigger size="sm" className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos os funcionários</SelectItem>
                  {funcionarios.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.usuario.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardAction>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="px-5 text-xs font-medium text-muted-foreground">
                  Funcionário
                </TableHead>
                <TableHead className="px-5 text-xs font-medium text-muted-foreground">
                  Entrada
                </TableHead>
                <TableHead className="px-5 text-xs font-medium text-muted-foreground">
                  Saída
                </TableHead>
                <TableHead className="px-5 text-xs font-medium text-muted-foreground">
                  Duração
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consolidado.length === 0 ? (
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell colSpan={4} className="px-5 py-4 text-sm text-muted-foreground">
                    Nenhum registro no período.
                  </TableCell>
                </TableRow>
              ) : (
                consolidado.map((r) => (
                  <TableRow key={r.id} className="border-border hover:bg-muted/50">
                    <TableCell className="px-5 py-3 text-sm text-foreground">
                      {r.funcionario?.usuario.nome ?? "—"}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm text-muted-foreground">
                      {formatarDataHora(r.entrada)}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm text-muted-foreground">
                      {r.saida ? (
                        formatarDataHora(r.saida)
                      ) : (
                        <span className="font-medium text-foreground">em andamento</span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-3 font-mono text-sm text-muted-foreground">
                      {duracao(r.entrada, r.saida)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
