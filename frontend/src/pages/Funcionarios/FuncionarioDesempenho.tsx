import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, TrendingDown, TrendingUp, Minus, X } from "lucide-react";
import { api } from "../../services/api";
import { usuarioLogado } from "../../services/auth";
import {
  DesempenhoFuncionario,
  Funcionario,
  HistoricoTarefaFuncionario,
  TipoComissao,
} from "../../types";
import { formatarReais } from "../../utils/formatters";
import { Button } from "../../components/shadcn/button";
import { Badge } from "../../components/shadcn/badge";
import { Input } from "../../components/shadcn/input";
import { Label } from "../../components/shadcn/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/shadcn/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/shadcn/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/shadcn/select";

// Sentinela para o Select do shadcn (que não aceita value=""); mapeia de/para
// o estado "" (sem comissão) sem alterar o que é enviado à API.
const SEM_COMISSAO = "NENHUMA";

function formatarMoeda(valor: string): string {
  const apenas = valor.replace(/\D/g, "");
  if (!apenas) return "";
  const centavos = parseInt(apenas, 10);
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function moedaParaNumero(valor: string): number {
  return Number(valor.replace(/\./g, "").replace(",", "."));
}

function formatarDuracao(s: number): string {
  if (s < 60) return `${s}s`;
  const min = Math.round(s / 60);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

function TarefaCronometrada({ tarefa }: { tarefa: HistoricoTarefaFuncionario }) {
  const ref = tarefa.tempoMedioEquipeSegundos;
  const meu = tarefa.tempoMedioSegundos;
  const percent = ref > 0 ? Math.round(Math.abs((meu - ref) / ref) * 100) : 0;
  const naMedia = ref <= 0 || percent <= 2;
  const maisRapido = meu < ref;

  let delta: { icone: typeof TrendingUp; texto: string; cor: string };
  if (naMedia) {
    delta = { icone: Minus, texto: "na média da equipe", cor: "text-muted-foreground" };
  } else if (maisRapido) {
    delta = { icone: TrendingDown, texto: `${percent}% mais rápido que a média`, cor: "text-emerald-600" };
  } else {
    delta = { icone: TrendingUp, texto: `${percent}% mais lento que a média`, cor: "text-red-600" };
  }
  const IconeDelta = delta.icone;

  return (
    <Card size="sm">
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="codigo text-xs text-muted-foreground">{tarefa.codigo}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{tarefa.totalConcluidas} concluídas</span>
            </div>
            <p className="mt-1 truncate text-sm font-medium text-foreground">{tarefa.descricao}</p>
            <div className={`mt-1 flex items-center gap-1 text-xs ${delta.cor}`}>
              <IconeDelta size={13} />
              {delta.texto}
            </div>
          </div>
          <div className="flex shrink-0 items-baseline gap-4 sm:flex-col sm:items-end sm:gap-0">
            <div className="sm:text-right">
              <p className="codigo text-xl font-semibold text-foreground">{formatarDuracao(meu)}</p>
              <p className="text-[11px] text-muted-foreground">tempo médio deste colaborador</p>
            </div>
            <p className="text-xs text-muted-foreground sm:mt-1">
              equipe: <span className="codigo">{formatarDuracao(ref)}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CartaoMetrica({ rotulo, valor, ajuda }: { rotulo: string; valor: string; ajuda?: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{rotulo}</p>
        <p className="codigo mt-1 text-2xl font-semibold text-foreground">{valor}</p>
        {ajuda && <p className="mt-1 text-[11px] text-muted-foreground">{ajuda}</p>}
      </CardContent>
    </Card>
  );
}

const MSG_COMISSAO_POSITIVA = "A comissão precisa ser maior que zero.";

export function FuncionarioDesempenho() {
  const { id } = useParams();
  const [desempenho, setDesempenho] = useState<DesempenhoFuncionario | null>(null);
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [tarefas, setTarefas] = useState<HistoricoTarefaFuncionario[]>([]);

  // modal de edição
  const [modalEditar, setModalEditar] = useState(false);
  const [editForm, setEditForm] = useState({ nome: "", email: "", cargo: "", salarioAtual: "" });
  const [editEspecialidades, setEditEspecialidades] = useState<string[]>([]);
  const [novaEsp, setNovaEsp] = useState("");
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [erroEdit, setErroEdit] = useState<string | null>(null);

  // formulário de comissão
  const [tipoComissao, setTipoComissao] = useState<"" | TipoComissao>("");
  const [valorComissao, setValorComissao] = useState("");
  const [salvandoComissao, setSalvandoComissao] = useState(false);
  const [erroComissao, setErroComissao] = useState<string | null>(null);
  // Editar funcionário (inclui salário) e configurar comissão são só do Dono
  // (PATCH /funcionarios/:id e /:id/comissao autorizam só DONO).
  const ehDono = usuarioLogado()?.papel === "DONO";

  function carregarFuncionario() {
    api.get(`/funcionarios/${id}`).then((r) => {
      setFuncionario(r.data);
      setTipoComissao(r.data.tipoComissao ?? "");
      setValorComissao(r.data.valorComissao != null ? String(r.data.valorComissao) : "");
    }).catch(() => {});
  }

  function abrirModalEditar() {
    if (!funcionario) return;
    setEditForm({
      nome: funcionario.usuario.nome,
      email: funcionario.usuario.email,
      cargo: funcionario.cargo,
      salarioAtual: Number(funcionario.salarioAtual).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
    });
    setEditEspecialidades(funcionario.especialidades ?? []);
    setNovaEsp("");
    setErroEdit(null);
    setModalEditar(true);
  }

  function adicionarEsp() {
    const valor = novaEsp.trim();
    if (valor && !editEspecialidades.includes(valor)) {
      setEditEspecialidades([...editEspecialidades, valor]);
    }
    setNovaEsp("");
  }

  async function salvarEdicao(e: FormEvent) {
    e.preventDefault();
    setErroEdit(null);
    setSalvandoEdit(true);
    try {
      await api.patch(`/funcionarios/${id}`, {
        nome: editForm.nome,
        email: editForm.email,
        cargo: editForm.cargo,
        salarioAtual: moedaParaNumero(editForm.salarioAtual),
        especialidades: editEspecialidades,
      });
      setModalEditar(false);
      carregarFuncionario();
      api.get(`/desempenho/${id}`).then((r) => setDesempenho(r.data)).catch(() => {});
    } catch (err: any) {
      // Antes só havia try/finally: um 403 (ou qualquer falha) ficava mudo.
      setErroEdit(err?.response?.data?.erro ?? "Não foi possível salvar as alterações. Tente novamente.");
    } finally {
      setSalvandoEdit(false);
    }
  }

  useEffect(() => {
    api.get(`/desempenho/${id}`).then((r) => setDesempenho(r.data)).catch(() => {});
    api.get(`/desempenho/${id}/tarefas`).then((r) => setTarefas(r.data)).catch(() => {});
    carregarFuncionario();
  }, [id]);

  async function salvarComissao(e: FormEvent) {
    e.preventDefault();
    setErroComissao(null);
    // A API recusa valor <= 0 com o texto do Zod em inglês ("Number must be
    // greater than 0"). Confere antes de enviar e mostra em português.
    if (tipoComissao && !(Number(valorComissao) > 0)) {
      setErroComissao(MSG_COMISSAO_POSITIVA);
      return;
    }
    setSalvandoComissao(true);
    try {
      await api.patch(`/funcionarios/${id}/comissao`, {
        tipoComissao: tipoComissao || null,
        valorComissao: tipoComissao ? Number(valorComissao) : null,
      });
      carregarFuncionario();
    } catch (err: any) {
      const erroApi: string | undefined = err?.response?.data?.erro;
      setErroComissao(
        err?.response?.status === 400 && erroApi?.includes("greater than 0")
          ? MSG_COMISSAO_POSITIVA
          : erroApi ?? "Não foi possível salvar a comissão. Tente novamente."
      );
      carregarFuncionario(); // volta o formulário ao valor salvo
    } finally {
      setSalvandoComissao(false);
    }
  }

  if (!desempenho || !funcionario) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        to="/funcionarios"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Equipe & desempenho
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="text-xl font-semibold text-foreground">{desempenho.nome}</h1>
            {ehDono && (
              <Button variant="link" size="sm" className="h-auto px-0 py-0 text-xs" onClick={abrirModalEditar}>
                Editar
              </Button>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{desempenho.cargo}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button asChild variant="link" size="sm" className="h-auto px-0 py-0 text-xs">
            <Link to={`/funcionarios/${id}/resumo`}>Resumo mensal (contracheque) →</Link>
          </Button>
          <Button asChild variant="link" size="sm" className="h-auto px-0 py-0 text-xs">
            <Link to={`/funcionarios/${id}/rota`}>Ver rota do dia →</Link>
          </Button>
        </div>
      </div>

      <p className="max-w-md text-xs text-muted-foreground">
        Essas métricas são calculadas a partir do histórico real de ordens de serviço —
        é a base objetiva usada para avaliar pedidos de aumento.
        {` Base: ${desempenho.totalOrdensConcluidas} OS concluída${desempenho.totalOrdensConcluidas === 1 ? "" : "s"}.`}
        {desempenho.totalOrdensConcluidas < 10 && " Com menos de 10, use com cautela."}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CartaoMetrica
          rotulo="Taxa de acerto na 1ª visita"
          valor={`${Math.round(desempenho.taxaResolucaoPrimeiraTentativa * 100)}%`}
          ajuda="Resolvidas sem precisar voltar. Peça que não resolveu, mas foi corrigida na mesma visita, não tira o acerto."
        />
        <CartaoMetrica rotulo="OS concluídas" valor={String(desempenho.totalOrdensConcluidas)} />
        <CartaoMetrica
          rotulo="Retornos por OS (média)"
          ajuda="Quantas vezes, em média, foi preciso voltar antes de resolver"
          valor={
            desempenho.totalOrdensConcluidas > 0
              ? desempenho.mediaTentativasPorOrdem.toLocaleString("pt-BR", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })
              : "—"
          }
        />
        <CartaoMetrica
          rotulo="Tempo médio de resolução"
          valor={
            desempenho.tempoMedioResolucaoHoras == null || desempenho.tempoMedioResolucaoHoras < 0
              ? "—"
              : // Abaixo de 1 h, arredondar dava "0h", que parece "nada".
                desempenho.tempoMedioResolucaoHoras < 1
                ? "menos de 1h"
                : `${Math.round(desempenho.tempoMedioResolucaoHoras).toLocaleString("pt-BR")}h`
          }
        />
        <CartaoMetrica
          rotulo="Custo total de deslocamento"
          valor={formatarReais(desempenho.custoTotalDeslocamento)}
        />
        <CartaoMetrica
          rotulo="Peças trocadas sem resolver"
          valor={String(desempenho.pecasTrocadasQueNaoResolveram)}
          ajuda="Peças que não resolveram o problema, mesmo quando ele foi resolvido na mesma visita."
        />
      </div>

      <div>
        <h2 className="text-sm font-medium text-foreground">Tarefas cronometradas</h2>
        <p className="mb-3 mt-0.5 text-xs text-muted-foreground">
          Tempo médio deste colaborador por tarefa, comparado à média da equipe.
        </p>
        {tarefas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma tarefa cronometrada concluída ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {tarefas.map((t) => (
              <TarefaCronometrada key={t.tarefaCatalogoId} tarefa={t} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Remuneração</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card size="sm">
            <CardContent>
              <p className="text-xs text-muted-foreground">Salário atual</p>
              <p className="codigo mt-1 text-xl font-semibold text-foreground">
                {formatarReais(funcionario.salarioAtual)}
              </p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent>
              <p className="text-xs text-muted-foreground">Comissão acumulada (atendimentos concluídos)</p>
              <p className="codigo mt-1 text-xl font-semibold text-foreground">
                {formatarReais(desempenho.comissaoAcumulada)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          {/* Só o Dono altera; para os outros o bloco é leitura e não "configura". */}
          <CardTitle className="text-sm">{ehDono ? "Configurar comissão" : "Comissão"}</CardTitle>
          <CardDescription className="text-xs">
            A comissão incide só sobre o valor de mão de obra de cada atendimento — nunca sobre peças.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!ehDono ? (
            // Gestor e outros papéis: só leitura (PATCH /comissao autoriza só o Dono).
            <p className="text-sm text-foreground">
              {funcionario.tipoComissao === "PERCENTUAL"
                ? `${Number(funcionario.valorComissao ?? 0).toLocaleString("pt-BR")}% sobre a mão de obra`
                : funcionario.tipoComissao === "FIXO"
                  ? `${formatarReais(Number(funcionario.valorComissao ?? 0))} fixo por atendimento concluído`
                  : "Nenhuma (só salário fixo)"}
              <span className="mt-1 block text-xs text-muted-foreground">
                Só o Dono altera a comissão.
              </span>
            </p>
          ) : (
          <form onSubmit={salvarComissao} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="tipo-comissao">Tipo de comissão</Label>
              <Select
                value={tipoComissao === "" ? SEM_COMISSAO : tipoComissao}
                onValueChange={(v) => setTipoComissao(v === SEM_COMISSAO ? "" : (v as TipoComissao))}
              >
                <SelectTrigger id="tipo-comissao" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_COMISSAO}>Nenhuma (só salário fixo)</SelectItem>
                  <SelectItem value="PERCENTUAL">Percentual sobre a mão de obra</SelectItem>
                  <SelectItem value="FIXO">Valor fixo por atendimento concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tipoComissao && (
              <div className="grid gap-1.5">
                <Label htmlFor="valor-comissao">
                  {tipoComissao === "PERCENTUAL" ? "Percentual (%)" : "Valor fixo (R$)"}
                </Label>
                <Input
                  id="valor-comissao"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={valorComissao}
                  onChange={(e) => setValorComissao(e.target.value)}
                />
              </div>
            )}
            {erroComissao && (
              <p role="alert" className="text-sm text-danger">
                {erroComissao}
              </p>
            )}
            <Button type="submit" disabled={salvandoComissao}>
              {salvandoComissao ? "Salvando..." : "Salvar comissão"}
            </Button>
          </form>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalEditar} onOpenChange={(aberto) => { if (!aberto) setModalEditar(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar funcionário</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvarEdicao} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-nome">Nome completo</Label>
              <Input
                id="edit-nome"
                required
                value={editForm.nome}
                onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                required
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-cargo">Cargo</Label>
                <Input
                  id="edit-cargo"
                  required
                  value={editForm.cargo}
                  onChange={(e) => setEditForm({ ...editForm, cargo: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-salario">Salário</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input
                    id="edit-salario"
                    required
                    type="text"
                    inputMode="numeric"
                    className="pl-9"
                    value={editForm.salarioAtual}
                    onChange={(e) => setEditForm({ ...editForm, salarioAtual: formatarMoeda(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Especialidades</Label>
              {editEspecialidades.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {editEspecialidades.map((esp, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {esp}
                      <button
                        type="button"
                        onClick={() => setEditEspecialidades((prev) => prev.filter((_, j) => j !== i))}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={`Remover ${esp}`}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Ressonância Magnética"
                  value={novaEsp}
                  onChange={(e) => setNovaEsp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      adicionarEsp();
                    }
                  }}
                />
                <Button type="button" variant="ghost" onClick={adicionarEsp} className="shrink-0">
                  + Adicionar
                </Button>
              </div>
            </div>
            {erroEdit && (
              <p role="alert" className="text-sm text-danger">
                {erroEdit}
              </p>
            )}
            <Button type="submit" disabled={salvandoEdit} className="w-full">
              {salvandoEdit ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
