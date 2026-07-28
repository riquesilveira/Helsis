import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import { api } from "../../services/api";
import { DesempenhoFuncionario, Funcionario, TipoComissao } from "../../types";
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

function CartaoMetrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{rotulo}</p>
        <p className="codigo mt-1 text-2xl font-semibold text-foreground">{valor}</p>
      </CardContent>
    </Card>
  );
}

export function FuncionarioDesempenho() {
  const { id } = useParams();
  const [desempenho, setDesempenho] = useState<DesempenhoFuncionario | null>(null);
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);

  // modal de edição
  const [modalEditar, setModalEditar] = useState(false);
  const [editForm, setEditForm] = useState({ nome: "", email: "", cargo: "", salarioAtual: "" });
  const [editEspecialidades, setEditEspecialidades] = useState<string[]>([]);
  const [novaEsp, setNovaEsp] = useState("");
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  // formulário de comissão
  const [tipoComissao, setTipoComissao] = useState<"" | TipoComissao>("");
  const [valorComissao, setValorComissao] = useState("");
  const [salvandoComissao, setSalvandoComissao] = useState(false);

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
    } finally {
      setSalvandoEdit(false);
    }
  }

  useEffect(() => {
    api.get(`/desempenho/${id}`).then((r) => setDesempenho(r.data)).catch(() => {});
    carregarFuncionario();
  }, [id]);

  async function salvarComissao(e: FormEvent) {
    e.preventDefault();
    setSalvandoComissao(true);
    try {
      await api.patch(`/funcionarios/${id}/comissao`, {
        tipoComissao: tipoComissao || null,
        valorComissao: tipoComissao ? Number(valorComissao) : null,
      });
      carregarFuncionario();
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

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{desempenho.nome}</h1>
            <Button variant="link" size="sm" className="h-auto px-0 py-0 text-xs" onClick={abrirModalEditar}>
              Editar
            </Button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{desempenho.cargo}</p>
        </div>
        <div className="flex items-center gap-4">
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
      </p>

      <div className="grid grid-cols-3 gap-4">
        <CartaoMetrica
          rotulo="Taxa de acerto na 1ª visita"
          valor={`${Math.round(desempenho.taxaResolucaoPrimeiraTentativa * 100)}%`}
        />
        <CartaoMetrica rotulo="OS concluídas" valor={String(desempenho.totalOrdensConcluidas)} />
        <CartaoMetrica
          rotulo="Média de tentativas por OS"
          valor={desempenho.mediaTentativasPorOrdem.toFixed(1)}
        />
        <CartaoMetrica
          rotulo="Tempo médio de resolução"
          valor={
            desempenho.tempoMedioResolucaoHoras
              ? `${Math.round(desempenho.tempoMedioResolucaoHoras)}h`
              : "—"
          }
        />
        <CartaoMetrica
          rotulo="Custo total de deslocamento"
          valor={formatarReais(desempenho.custoTotalDeslocamento)}
        />
        <CartaoMetrica
          rotulo="Peças trocadas sem resolver"
          valor={String(desempenho.pecasTrocadasQueNaoResolveram)}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Remuneração</h2>
        <div className="grid grid-cols-2 gap-4">
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
          <CardTitle className="text-sm">Configurar comissão</CardTitle>
          <CardDescription className="text-xs">
            A comissão incide só sobre o valor de mão de obra de cada atendimento — nunca sobre peças.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <Button type="submit" disabled={salvandoComissao}>
              {salvandoComissao ? "Salvando..." : "Salvar comissão"}
            </Button>
          </form>
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
            <div className="grid grid-cols-2 gap-3">
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
            <Button type="submit" disabled={salvandoEdit} className="w-full">
              {salvandoEdit ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
