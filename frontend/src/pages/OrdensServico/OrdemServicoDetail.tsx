import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Car,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Pencil,
  Plane,
  Plus,
  Timer,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api } from "../../services/api";
import {
  AnexoItem,
  Causa,
  Defeito,
  DeslocamentoItem,
  Funcionario,
  NotificacaoItem,
  OrdemServico,
  PecaCatalogo,
  Sla,
  Solucao,
  StatusOS,
  TipoAnexo,
} from "../../types";
import { useEtapasStatus } from "../../hooks/useEtapasStatus";
import { StatusTimeline } from "../../components/StatusTimeline";
import { TipoBadge } from "../../components/StatusBadge";
import { usuarioLogado } from "../../services/auth";
import { formatarReais, tempoRelativo, formatarNumeroOS } from "../../utils/formatters";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/shadcn/card";
import { Button } from "../../components/shadcn/button";
import { Input } from "../../components/shadcn/input";
import { Label } from "../../components/shadcn/label";
import { Textarea } from "../../components/shadcn/textarea";
import { Checkbox } from "../../components/shadcn/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/shadcn/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/shadcn/dialog";

const ROTULO_MODALIDADE: Record<OrdemServico["modalidade"], string> = {
  VISITA_TECNICA: "Visita técnica",
  OFICINA: "Oficina",
  REMOTO: "Suporte remoto",
};

// Os anexos são servidos pelo backend na raiz (/uploads/...), fora do /api.
// Deriva a base removendo o sufixo /api da baseURL do axios.
const ARQUIVO_BASE = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "https://helsis-backend.onrender.com/api" : "http://localhost:3333/api")
).replace(/\/api\/?$/, "");

function urlArquivoAnexo(url: string) {
  return `${ARQUIVO_BASE}${url}`;
}

const ROTULO_TIPO_ANEXO: Record<TipoAnexo, string> = {
  FOTO: "Foto",
  LAUDO: "Laudo",
  OUTRO: "Outro",
};

// Badge de SLA a partir do status calculado no backend. SEM_CONTRATO não
// renderiza nada (não há prazo contratual pra esse cliente/equipamento).
function SlaBadge({ sla }: { sla?: Sla }) {
  if (!sla || sla.status === "SEM_CONTRATO") return null;

  const config = {
    NO_PRAZO: { rotulo: "Dentro do SLA", Icone: Timer, classe: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    CUMPRIDO: { rotulo: "SLA cumprido", Icone: CheckCircle2, classe: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    ATRASADO: { rotulo: "SLA estourado", Icone: AlertTriangle, classe: "bg-red-500/10 text-red-600 dark:text-red-400" },
    DESCUMPRIDO: { rotulo: "SLA descumprido", Icone: AlertTriangle, classe: "bg-red-500/10 text-red-600 dark:text-red-400" },
  }[sla.status];

  const { Icone } = config;
  const detalhe =
    sla.status === "NO_PRAZO" && sla.horasRestantes != null
      ? ` · faltam ${Math.max(0, Math.round(sla.horasRestantes))}h`
      : "";
  const prazo = sla.prazoResposta
    ? ` (limite ${new Date(sla.prazoResposta).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })})`
    : "";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${config.classe}`}
      title={`SLA de ${sla.slaHorasResposta}h${prazo}`}
    >
      <Icone size={12} className="shrink-0" />
      {config.rotulo}
      {detalhe}
    </span>
  );
}

export function OrdemServicoDetail() {
  const { id } = useParams();
  const usuario = usuarioLogado();
  const { opcoes } = useEtapasStatus();
  const podeVerFinanceiro = usuario?.papel === "DONO" || usuario?.papel === "GESTOR";
  // Designar/reatribuir chamado é função do Suporte (N2) para cima.
  const podeDesignar =
    usuario?.papel === "DONO" || usuario?.papel === "GESTOR" || usuario?.papel === "SUPORTE";
  // Fechamento parcial × total: o técnico (N1) só faz o fechamento parcial
  // (AGUARDANDO_VALIDACAO). A conclusão (fechamento total) é validada pelo
  // Suporte (N2) para cima, então CONCLUIDO fica fora da lista para o técnico.
  const opcoesStatus =
    usuario?.papel === "TECNICO"
      ? opcoes.filter((op) => op.status !== "CONCLUIDO")
      : opcoes;
  const [os, setOs] = useState<OrdemServico | null>(null);
  const [pecas, setPecas] = useState<PecaCatalogo[]>([]);
  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);

  // designar técnico
  const [tecnicos, setTecnicos] = useState<Funcionario[]>([]);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState("");
  const [atribuindo, setAtribuindo] = useState(false);
  const [erroAtribuir, setErroAtribuir] = useState<string | null>(null);

  // formulário de status
  const [novoStatus, setNovoStatus] = useState<StatusOS>("RECEBIDO");
  const [observacao, setObservacao] = useState("");
  const [novaTentativa, setNovaTentativa] = useState(false);
  const [enviandoStatus, setEnviandoStatus] = useState(false);
  const [erroStatus, setErroStatus] = useState<string | null>(null);

  // diagnóstico codificado (Causa / Defeito / Solução) — escolhido no fechamento
  const [causas, setCausas] = useState<Causa[]>([]);
  const [defeitos, setDefeitos] = useState<Defeito[]>([]);
  const [solucoes, setSolucoes] = useState<Solucao[]>([]);
  const [causaId, setCausaId] = useState("");
  const [defeitoId, setDefeitoId] = useState("");
  const [solucaoId, setSolucaoId] = useState("");

  // formulário de peça trocada
  const [modalPecaAberto, setModalPecaAberto] = useState(false);
  const [pecaCatalogoId, setPecaCatalogoId] = useState("");
  const [tipoServico, setTipoServico] = useState("Substituição");
  const [resolveuProblema, setResolveuProblema] = useState<"sim" | "nao" | "indefinido">(
    "indefinido"
  );
  const [garantiaMeses, setGarantiaMeses] = useState(3);
  const [enviandoPeca, setEnviandoPeca] = useState(false);
  const [erroPeca, setErroPeca] = useState<string | null>(null);

  // modal de nova peça no catálogo (quando a peça ainda não existe)
  const [modalNovaPeca, setModalNovaPeca] = useState(false);
  const [nomeNovaPeca, setNomeNovaPeca] = useState("");
  const [precoNovaPeca, setPrecoNovaPeca] = useState("");
  const [erroCriarPeca, setErroCriarPeca] = useState<string | null>(null);
  const [enviandoNovaPeca, setEnviandoNovaPeca] = useState(false);

  // formulário de deslocamento
  const [modalDeslocamentoAberto, setModalDeslocamentoAberto] = useState(false);
  const [modalTransporte, setModalTransporte] = useState<"CARRO" | "AVIAO">("CARRO");
  const [origemCidade, setOrigemCidade] = useState("");
  const [destinoCidade, setDestinoCidade] = useState("");
  const [custoPassagem, setCustoPassagem] = useState("");
  const [custoHospedagem, setCustoHospedagem] = useState("");
  const [custoAlimentacao, setCustoAlimentacao] = useState("");
  const [diasViagem, setDiasViagem] = useState("");
  const [enviandoDeslocamento, setEnviandoDeslocamento] = useState(false);
  // id do deslocamento em edição — null quando o modal está em modo "novo".
  const [deslocamentoEditando, setDeslocamentoEditando] = useState<string | null>(null);

  // confirmação de exclusão de deslocamento
  const [modalConfirmarExclusao, setModalConfirmarExclusao] = useState(false);
  const [deslocamentoParaExcluir, setDeslocamentoParaExcluir] = useState<string | null>(null);
  const [erroDeslocamento, setErroDeslocamento] = useState<string | null>(null);

  // fechamento financeiro
  const [valorMaoDeObra, setValorMaoDeObra] = useState("");
  const [valorComissao, setValorComissao] = useState("");
  const [salvandoFinanceiro, setSalvandoFinanceiro] = useState(false);

  // anexos (fotos/laudos)
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [tipoAnexo, setTipoAnexo] = useState<TipoAnexo>("FOTO");
  const [erroAnexo, setErroAnexo] = useState<string | null>(null);
  const inputAnexoRef = useRef<HTMLInputElement>(null);
  const [anexoParaExcluir, setAnexoParaExcluir] = useState<AnexoItem | null>(null);

  function carregar() {
    api.get(`/ordens-servico/${id}`).then((r) => {
      const dados: OrdemServico = r.data;
      setOs(dados);
      // Fix #5: inicializa novoStatus com o status atual da OS
      setNovoStatus(dados.statusAtual);
    }).catch(() => {});
  }

  function carregarNotificacoes() {
    api.get(`/ordens-servico/${id}/notificacoes`).then((r) => setNotificacoes(r.data)).catch(() => {});
  }

  useEffect(carregar, [id]);
  useEffect(() => {
    carregarNotificacoes();
    // segunda tentativa: cobre o caso de acabar de abrir a OS, cuja
    // notificação inicial também é enviada em segundo plano no backend
    const timer = setTimeout(carregarNotificacoes, 1500);
    return () => clearTimeout(timer);
  }, [id]);
  useEffect(() => {
    api.get("/pecas").then((r) => setPecas(r.data)).catch(() => {});
  }, []);

  // catálogo de diagnóstico codificado (alimenta os dropdowns do fechamento)
  useEffect(() => {
    api.get("/diagnostico/causas").then((r) => setCausas(r.data)).catch(() => {});
    api.get("/diagnostico/defeitos").then((r) => setDefeitos(r.data)).catch(() => {});
    api.get("/diagnostico/solucoes").then((r) => setSolucoes(r.data)).catch(() => {});
  }, []);

  // lista de técnicos para o seletor de designação (só quem pode designar)
  useEffect(() => {
    if (podeDesignar) {
      api.get("/funcionarios").then((r) => setTecnicos(r.data)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAtribuir(e: FormEvent) {
    e.preventDefault();
    if (!tecnicoSelecionado) return;
    setErroAtribuir(null);
    setAtribuindo(true);
    try {
      await api.patch(`/ordens-servico/${id}/atribuir`, { funcionarioId: tecnicoSelecionado });
      setTecnicoSelecionado("");
      carregar();
    } catch (err: any) {
      setErroAtribuir(err?.response?.data?.erro ?? "Não foi possível designar o técnico.");
    } finally {
      setAtribuindo(false);
    }
  }

  // inicializa os campos de fechamento financeiro quando a OS carrega
  // (mas não toda vez que ela é recarregada, pra não sobrescrever o que
  // a pessoa está digitando)
  useEffect(() => {
    if (os) {
      setValorMaoDeObra(os.valorMaoDeObra != null ? String(os.valorMaoDeObra) : "");
      setValorComissao(os.valorComissao != null ? String(os.valorComissao) : "");
      setCausaId(os.causaId ?? "");
      setDefeitoId(os.defeitoId ?? "");
      setSolucaoId(os.solucaoId ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [os?.id]);

  async function handleAtualizarStatus(e: FormEvent) {
    e.preventDefault();
    setErroStatus(null);
    setEnviandoStatus(true);
    try {
      await api.patch(`/ordens-servico/${id}/status`, {
        status: novoStatus,
        observacao: observacao || undefined,
        novaTentativa,
        funcionarioId: os?.funcionario?.id,
        causaId: causaId || undefined,
        defeitoId: defeitoId || undefined,
        solucaoId: solucaoId || undefined,
      });
      setObservacao("");
      setNovaTentativa(false);
      carregar();
      // pequeno atraso: a notificação é enviada em segundo plano no backend
      setTimeout(carregarNotificacoes, 1200);
    } catch (err: any) {
      setErroStatus(err?.response?.data?.erro ?? "Não foi possível atualizar o status.");
    } finally {
      setEnviandoStatus(false);
    }
  }

  async function handleRegistrarPeca(e: FormEvent) {
    e.preventDefault();
    if (!os?.funcionario) return;
    setErroPeca(null);
    setEnviandoPeca(true);
    try {
      await api.post(`/ordens-servico/${id}/pecas`, {
        pecaCatalogoId,
        funcionarioId: os.funcionario.id,
        tipoServico,
        garantiaMeses,
        resolveuProblema:
          resolveuProblema === "indefinido" ? undefined : resolveuProblema === "sim",
      });
      setModalPecaAberto(false);
      setPecaCatalogoId("");
      carregar();
    } catch (err: any) {
      setErroPeca(err?.response?.data?.erro ?? "Não foi possível registrar a peça.");
    } finally {
      setEnviandoPeca(false);
    }
  }

  function limparFormDeslocamento() {
    setModalTransporte("CARRO");
    setOrigemCidade("");
    setDestinoCidade("");
    setCustoPassagem("");
    setCustoHospedagem("");
    setCustoAlimentacao("");
    setDiasViagem("");
  }

  function abrirNovoDeslocamento() {
    setDeslocamentoEditando(null);
    limparFormDeslocamento();
    setErroDeslocamento(null);
    setModalDeslocamentoAberto(true);
  }

  function abrirEdicaoDeslocamento(d: DeslocamentoItem) {
    setDeslocamentoEditando(d.id);
    setModalTransporte(d.modalTransporte ?? "CARRO");
    setOrigemCidade(d.origemCidade ?? "");
    setDestinoCidade(d.destinoCidade ?? "");
    setCustoPassagem(d.custoPassagem != null ? String(d.custoPassagem) : "");
    setCustoHospedagem(d.custoHospedagem != null ? String(d.custoHospedagem) : "");
    setCustoAlimentacao(d.custoAlimentacao != null ? String(d.custoAlimentacao) : "");
    setDiasViagem(d.diasViagem != null ? String(d.diasViagem) : "");
    setErroDeslocamento(null);
    setModalDeslocamentoAberto(true);
  }

  async function handleSalvarDeslocamento(e: FormEvent) {
    e.preventDefault();
    setEnviandoDeslocamento(true);
    setErroDeslocamento(null);

    // Ao editar, um custo esvaziado deve ZERAR o valor (o Prisma ignora
    // `undefined` num update, então mandamos 0 explícito). Ao criar, ausência
    // de custo = sem custo (undefined → null no banco).
    const custo = (valor: string) =>
      valor !== "" ? Number(valor) : deslocamentoEditando ? 0 : undefined;

    const corpo = {
      modalTransporte,
      origemCidade: origemCidade || undefined,
      destinoCidade: destinoCidade || undefined,
      custoPassagem: custo(custoPassagem),
      custoHospedagem: custo(custoHospedagem),
      custoAlimentacao: custo(custoAlimentacao),
      diasViagem: diasViagem ? Number(diasViagem) : undefined,
    };

    try {
      if (deslocamentoEditando) {
        await api.patch(`/ordens-servico/${id}/deslocamentos/${deslocamentoEditando}`, corpo);
      } else {
        await api.post(`/ordens-servico/${id}/deslocamentos`, {
          funcionarioId: os?.funcionario?.id,
          ...corpo,
        });
      }
      setModalDeslocamentoAberto(false);
      setDeslocamentoEditando(null);
      limparFormDeslocamento();
      carregar();
    } catch (err: any) {
      setErroDeslocamento(
        err?.response?.data?.erro ?? "Não foi possível salvar o deslocamento. Tente novamente."
      );
    } finally {
      setEnviandoDeslocamento(false);
    }
  }

  function solicitarExclusaoDeslocamento(deslocamentoId: string) {
    setDeslocamentoParaExcluir(deslocamentoId);
    setErroDeslocamento(null);
    setModalConfirmarExclusao(true);
  }

  async function confirmarExclusaoDeslocamento() {
    if (!deslocamentoParaExcluir) return;
    try {
      await api.delete(`/ordens-servico/${id}/deslocamentos/${deslocamentoParaExcluir}`);
      setModalConfirmarExclusao(false);
      setDeslocamentoParaExcluir(null);
      carregar();
    } catch (err: any) {
      setErroDeslocamento(err?.response?.data?.erro ?? "Não foi possível excluir o deslocamento.");
    }
  }

  async function handleCriarPeca(e: FormEvent) {
    e.preventDefault();
    setErroCriarPeca(null);
    setEnviandoNovaPeca(true);
    try {
      const { data } = await api.post("/pecas", {
        nome: nomeNovaPeca,
        precoUnitario: precoNovaPeca ? Number(precoNovaPeca) : undefined,
      });
      setPecas((atual) => [...atual, data]);
      setPecaCatalogoId(data.id);
      setNomeNovaPeca("");
      setPrecoNovaPeca("");
      setModalNovaPeca(false);
    } catch (err: any) {
      setErroCriarPeca(err?.response?.data?.erro ?? "Não foi possível cadastrar a peça.");
    } finally {
      setEnviandoNovaPeca(false);
    }
  }

  // calcula a comissão automaticamente a partir da config do técnico —
  // incide só sobre a mão de obra, nunca sobre peça
  function calcularComissaoAuto(maoDeObra: number): number {
    const f = os?.funcionario;
    if (!f?.tipoComissao) return 0;
    if (f.tipoComissao === "PERCENTUAL") return (maoDeObra * (f.valorComissao ?? 0)) / 100;
    return f.valorComissao ?? 0;
  }

  function handleValorMaoDeObraChange(v: string) {
    setValorMaoDeObra(v);
    const numero = Number(v);
    if (!Number.isNaN(numero) && os?.funcionario?.tipoComissao) {
      setValorComissao(String(calcularComissaoAuto(numero)));
    }
  }

  async function handleSalvarFinanceiro(e: FormEvent) {
    e.preventDefault();
    setSalvandoFinanceiro(true);
    try {
      await api.patch(`/ordens-servico/${id}/financeiro`, {
        valorMaoDeObra: Number(valorMaoDeObra) || 0,
        valorComissaoManual: valorComissao !== "" ? Number(valorComissao) : undefined,
      });
      carregar();
    } finally {
      setSalvandoFinanceiro(false);
    }
  }

  async function handleUploadAnexo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErroAnexo(null);
    setEnviandoAnexo(true);
    try {
      const fd = new FormData();
      fd.append("arquivo", file);
      fd.append("tipo", tipoAnexo);
      await api.post(`/ordens-servico/${id}/anexos`, fd);
      carregar();
    } catch (err: any) {
      setErroAnexo(
        err?.response?.data?.erro ?? "Não foi possível enviar o anexo. Tente novamente."
      );
    } finally {
      setEnviandoAnexo(false);
      if (inputAnexoRef.current) inputAnexoRef.current.value = "";
    }
  }

  async function confirmarExclusaoAnexo() {
    if (!anexoParaExcluir) return;
    try {
      await api.delete(`/ordens-servico/${id}/anexos/${anexoParaExcluir.id}`);
      setAnexoParaExcluir(null);
      carregar();
    } catch (err: any) {
      setErroAnexo(err?.response?.data?.erro ?? "Não foi possível excluir o anexo.");
    }
  }

  if (!os) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  const semTecnico = !os.funcionario;
  const valorPecas = (os.pecasTrocadas ?? []).reduce(
    (soma, p) => soma + (p.precoUnitario ?? 0) * p.quantidade,
    0
  );
  const valorTotal = valorPecas + (Number(valorMaoDeObra) || 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        to="/ordens-servico"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Ordens de serviço
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <p className="codigo text-sm text-muted-foreground">OS #{formatarNumeroOS(os.numero)}</p>
          <TipoBadge tipo={os.tipo} />
          <span className="text-xs text-muted-foreground" title={new Date(os.dataAbertura).toLocaleString("pt-BR")}>
            aberta {tempoRelativo(os.dataAbertura)}
          </span>
        </div>
        <h1 className="text-xl font-semibold text-foreground mt-1">{os.cliente.nome}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {os.equipamento.tipo}
          {os.equipamento.marca ? ` — ${os.equipamento.marca} ${os.equipamento.modelo ?? ""}` : ""}
          {" · "}
          {ROTULO_MODALIDADE[os.modalidade]}
        </p>
        {os.sla && os.sla.status !== "SEM_CONTRATO" && (
          <div className="mt-2">
            <SlaBadge sla={os.sla} />
          </div>
        )}
      </div>

      <Card>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-1">Problema relatado</p>
          <p className="text-sm text-foreground">{os.descricaoProblema}</p>
        </CardContent>
      </Card>

      {/* Diagnóstico codificado — só aparece depois de preenchido no fechamento */}
      {(os.causa || os.defeito || os.solucao) && (
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">Diagnóstico</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Causa</p>
                <p className="text-sm text-foreground mt-0.5">
                  {os.causa ? (
                    <>
                      <span className="codigo">{os.causa.codigo}</span> — {os.causa.descricao}
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Defeito</p>
                <p className="text-sm text-foreground mt-0.5">
                  {os.defeito ? (
                    <>
                      <span className="codigo">{os.defeito.codigo}</span> — {os.defeito.descricao}
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Solução</p>
                <p className="text-sm text-foreground mt-0.5">
                  {os.solucao ? (
                    <>
                      <span className="codigo">{os.solucao.codigo}</span> — {os.solucao.descricao}
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-sm font-medium text-foreground mb-3">Acompanhamento</h2>
        <StatusTimeline historico={os.statusHistoricos} statusAtual={os.statusAtual} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notificações enviadas ao cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {notificacoes.map((n) => (
              <div key={n.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{n.mensagem.split("\n")[0]}</p>
                  <p className="codigo text-xs text-muted-foreground mt-0.5">
                    {n.canal} → {n.destinatario} ·{" "}
                    {new Date(n.enviadaEm).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={`text-xs codigo shrink-0 ${
                    n.status === "ENVIADA" ? "text-status-concluido" : "text-status-cancelado"
                  }`}
                  title={n.erro}
                >
                  {n.status === "ENVIADA" ? "enviada" : "falhou"}
                </span>
              </div>
            ))}
            {notificacoes.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Nenhuma notificação enviada ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">Técnico responsável</p>
            <p className="text-sm text-foreground mt-1">
              {os.funcionario?.usuario.nome ?? "Não atribuído"}
            </p>
            {podeDesignar && os.statusAtual !== "CONCLUIDO" && os.statusAtual !== "CANCELADO" && (
              <form onSubmit={handleAtribuir} className="mt-3 flex flex-col gap-2">
                <Select value={tecnicoSelecionado} onValueChange={setTecnicoSelecionado}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={os.funcionario ? "Reatribuir para..." : "Designar técnico..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {tecnicos
                      .filter((t) => t.id !== os.funcionario?.id)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.usuario.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button type="submit" size="sm" disabled={atribuindo || !tecnicoSelecionado}>
                  {atribuindo ? "Salvando..." : os.funcionario ? "Reatribuir" : "Designar"}
                </Button>
                {erroAtribuir && <p className="text-xs text-danger">{erroAtribuir}</p>}
              </form>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">Tentativas até agora</p>
            <p className="codigo text-sm text-foreground mt-1">{os.numeroTentativas + 1}</p>
          </CardContent>
        </Card>
      </div>

      {/* Atualizar status */}
      {os.statusAtual !== "CONCLUIDO" && os.statusAtual !== "CANCELADO" && (
        <Card>
          <CardHeader>
            <CardTitle>Atualizar status</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAtualizarStatus}>
              <div className="grid gap-1.5 mb-4">
                <Label htmlFor="novo-status">Novo status</Label>
                <Select value={novoStatus} onValueChange={(v) => setNovoStatus(v as StatusOS)}>
                  <SelectTrigger id="novo-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {opcoesStatus.map((op) => (
                      <SelectItem key={op.status} value={op.status}>
                        {op.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 mb-4">
                <Label htmlFor="observacao-status">Observação (opcional)</Label>
                <Textarea
                  id="observacao-status"
                  rows={2}
                  placeholder="Ex: peça trocada não resolveu, retornando ao reparo"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </div>
              {/* Diagnóstico codificado — aparece no fechamento (parcial ou total),
                  onde o técnico padroniza causa/defeito/solução por dropdown. */}
              {(novoStatus === "AGUARDANDO_VALIDACAO" || novoStatus === "CONCLUIDO") && (
                <div className="mb-4 rounded-md border border-status-validacao/30 bg-status-validacao/5 p-3">
                  <p className="text-xs font-medium text-foreground mb-2">
                    Diagnóstico (padronizado)
                  </p>
                  <div className="grid gap-1.5 mb-4">
                    <Label htmlFor="causa-diag">Causa</Label>
                    <Select value={causaId} onValueChange={setCausaId}>
                      <SelectTrigger id="causa-diag" className="w-full">
                        <SelectValue placeholder="Selecione…" />
                      </SelectTrigger>
                      <SelectContent>
                        {causas.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.codigo} — {c.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5 mb-4">
                    <Label htmlFor="defeito-diag">Defeito</Label>
                    <Select value={defeitoId} onValueChange={setDefeitoId}>
                      <SelectTrigger id="defeito-diag" className="w-full">
                        <SelectValue placeholder="Selecione…" />
                      </SelectTrigger>
                      <SelectContent>
                        {defeitos.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.codigo} — {d.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="solucao-diag">Solução</Label>
                    <Select value={solucaoId} onValueChange={setSolucaoId}>
                      <SelectTrigger id="solucao-diag" className="w-full">
                        <SelectValue placeholder="Selecione…" />
                      </SelectTrigger>
                      <SelectContent>
                        {solucoes.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.codigo} — {s.descricao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="mb-4 flex items-center gap-2">
                <Checkbox
                  id="nova-tentativa"
                  checked={novaTentativa}
                  onCheckedChange={(v) => setNovaTentativa(v === true)}
                />
                <Label htmlFor="nova-tentativa" className="text-sm font-normal text-foreground">
                  Essa mudança representa uma nova tentativa de resolver o problema
                </Label>
              </div>
              {erroStatus && (
                <p className="text-xs text-danger mb-3">{erroStatus}</p>
              )}
              <Button type="submit" disabled={enviandoStatus}>
                {enviandoStatus ? "Salvando..." : "Salvar status"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Peças trocadas */}
      <Card>
        <CardHeader>
          <CardTitle>Peças trocadas</CardTitle>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalPecaAberto(true)}
              disabled={semTecnico}
              title={semTecnico ? "Atribua um técnico à OS primeiro" : ""}
            >
              <Plus />
              Registrar peça
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {(os.pecasTrocadas ?? []).map((p) => (
              <div key={p.id} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-foreground">
                    {p.pecaCatalogo.nome}{" "}
                    <span className="codigo text-xs text-muted-foreground">
                      ({p.tipoServico}, tentativa {p.tentativaNumero})
                    </span>
                  </p>
                  {p.garantiaAte && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Garantia até {new Date(p.garantiaAte).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  {p.precoUnitario != null && (
                    <span className="codigo text-xs text-muted-foreground">
                      {formatarReais(p.precoUnitario * p.quantidade)}
                    </span>
                  )}
                  {p.resolveuProblema !== null && (
                    <span
                      className={`text-xs codigo ${
                        p.resolveuProblema ? "text-status-concluido" : "text-status-cancelado"
                      }`}
                    >
                      {p.resolveuProblema ? "resolveu" : "não resolveu"}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {(os.pecasTrocadas ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground py-3">Nenhuma peça registrada ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deslocamentos (viagens) */}
      <Card>
        <CardHeader>
          <CardTitle>Deslocamentos</CardTitle>
          {podeVerFinanceiro && (
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                onClick={abrirNovoDeslocamento}
                disabled={semTecnico}
                title={semTecnico ? "Atribua um técnico à OS primeiro" : ""}
              >
                <Plus />
                Registrar deslocamento
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {(os.deslocamentos ?? []).map((d) => {
              const custoTotal =
                (d.custoPassagem ?? 0) + (d.custoHospedagem ?? 0) + (d.custoAlimentacao ?? 0);
              const foiAviao = d.modalTransporte === "AVIAO";
              const IconeTransporte = foiAviao ? Plane : Car;
              return (
                <div key={d.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                      title={foiAviao ? "Avião" : "Carro"}
                    >
                      <IconeTransporte size={15} />
                    </span>
                    <div>
                    <p className="text-sm text-foreground">
                      {d.origemCidade ?? "—"} → {d.destinoCidade ?? "—"}
                      {d.diasViagem != null && (
                        <span className="codigo text-xs text-muted-foreground">
                          {" "}({d.diasViagem} {d.diasViagem === 1 ? "dia" : "dias"})
                        </span>
                      )}
                    </p>
                    <div className="flex gap-3 mt-0.5">
                      {d.custoPassagem != null && d.custoPassagem > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {foiAviao ? "Passagem" : "Combustível"}: {formatarReais(d.custoPassagem)}
                        </span>
                      )}
                      {d.custoHospedagem != null && d.custoHospedagem > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Hospedagem: {formatarReais(d.custoHospedagem)}
                        </span>
                      )}
                      {d.custoAlimentacao != null && d.custoAlimentacao > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Alimentação: {formatarReais(d.custoAlimentacao)}
                        </span>
                      )}
                    </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {custoTotal > 0 && (
                      <span className="codigo text-xs text-muted-foreground">
                        {formatarReais(custoTotal)}
                      </span>
                    )}
                    {podeVerFinanceiro && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => abrirEdicaoDeslocamento(d)}
                          title="Editar deslocamento"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => solicitarExclusaoDeslocamento(d.id)}
                          className="text-danger hover:text-danger"
                          title="Excluir deslocamento"
                        >
                          <X />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {(os.deslocamentos ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground py-3">Nenhum deslocamento registrado ainda.</p>
            )}
          </div>
          {erroDeslocamento && (
            <p className="text-xs text-danger mt-2">{erroDeslocamento}</p>
          )}
        </CardContent>
      </Card>

      {/* Anexos (fotos/laudos) */}
      <Card>
        <CardHeader>
          <CardTitle>Anexos</CardTitle>
          <CardAction>
            <div className="flex items-center gap-2">
              <Select value={tipoAnexo} onValueChange={(v) => setTipoAnexo(v as TipoAnexo)}>
                <SelectTrigger className="h-8 w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FOTO">Foto</SelectItem>
                  <SelectItem value="LAUDO">Laudo</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
              <input
                ref={inputAnexoRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleUploadAnexo}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => inputAnexoRef.current?.click()}
                disabled={enviandoAnexo}
              >
                <Upload />
                {enviandoAnexo ? "Enviando..." : "Anexar"}
              </Button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          {erroAnexo && <p className="text-xs text-danger mb-3">{erroAnexo}</p>}
          {(os.anexos ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">
              Nenhum anexo. Envie fotos da peça/equipamento ou laudos (imagem ou PDF, até 10 MB).
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(os.anexos ?? []).map((anexo) => {
                const ehImagem = /\.(png|jpe?g|webp|heic)$/i.test(anexo.url);
                return (
                  <div
                    key={anexo.id}
                    className="group relative overflow-hidden rounded-lg border border-border bg-muted/30"
                  >
                    <a
                      href={urlArquivoAnexo(anexo.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {ehImagem ? (
                        <img
                          src={urlArquivoAnexo(anexo.url)}
                          alt={anexo.nomeArquivo}
                          className="h-28 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-28 w-full items-center justify-center text-muted-foreground">
                          <FileText size={32} />
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 px-2.5 py-2">
                        {ehImagem ? (
                          <ImageIcon size={12} className="shrink-0 text-muted-foreground" />
                        ) : (
                          <Paperclip size={12} className="shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate text-xs text-foreground" title={anexo.nomeArquivo}>
                          {anexo.nomeArquivo}
                        </span>
                      </div>
                    </a>
                    <span className="absolute left-1.5 top-1.5 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur">
                      {ROTULO_TIPO_ANEXO[anexo.tipo]}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setAnexoParaExcluir(anexo)}
                      className="absolute right-1.5 top-1.5 bg-background/80 text-danger opacity-0 backdrop-blur transition-opacity hover:text-danger group-hover:opacity-100"
                      title="Excluir anexo"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fechamento financeiro — editável só por dono/gestor (é quem decide o
          valor cobrado e a comissão). O técnico vê uma versão só leitura,
          pra ter transparência sobre quanto vai receber, sem poder alterar. */}
      {podeVerFinanceiro ? (
        <Card>
          <CardHeader>
            <CardTitle>Fechamento financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              A comissão do técnico incide só sobre a mão de obra — peça é custo repassado ao cliente.
            </p>
            <form onSubmit={handleSalvarFinanceiro}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Valor das peças</p>
                  <p className="codigo text-lg font-semibold text-foreground">
                    {formatarReais(valorPecas)}
                  </p>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="valor-mao-obra">Valor da mão de obra (R$)</Label>
                  <Input
                    id="valor-mao-obra"
                    type="number"
                    min={0}
                    step="0.01"
                    value={valorMaoDeObra}
                    onChange={(e) => handleValorMaoDeObraChange(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Valor total do atendimento</p>
                  <p className="codigo text-lg font-semibold text-foreground">
                    {formatarReais(valorTotal)}
                  </p>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="valor-comissao">
                    {os.funcionario?.tipoComissao
                      ? `Comissão do técnico (${
                          os.funcionario.tipoComissao === "PERCENTUAL"
                            ? `${os.funcionario.valorComissao}% da mão de obra`
                            : "valor fixo"
                        })`
                      : "Comissão do técnico (sem comissão configurada)"}
                  </Label>
                  <Input
                    id="valor-comissao"
                    type="number"
                    min={0}
                    step="0.01"
                    value={valorComissao}
                    onChange={(e) => setValorComissao(e.target.value)}
                    disabled={!os.funcionario}
                    placeholder={!os.funcionario ? "Atribua um técnico primeiro" : "0,00"}
                  />
                </div>
              </div>
              <Button type="submit" disabled={salvandoFinanceiro}>
                {salvandoFinanceiro ? "Salvando..." : "Salvar fechamento"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        os.valorMaoDeObra != null && (
          <Card>
            <CardHeader>
              <CardTitle>Fechamento financeiro deste atendimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Mão de obra</p>
                  <p className="codigo text-lg font-semibold text-foreground mt-1">
                    {formatarReais(os.valorMaoDeObra)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sua comissão</p>
                  <p className="codigo text-lg font-semibold text-foreground mt-1">
                    {os.valorComissao != null ? formatarReais(os.valorComissao) : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Modal registrar peça trocada */}
      <Dialog
        open={modalPecaAberto}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setModalPecaAberto(false);
            setErroPeca(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar peça trocada</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRegistrarPeca} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="peca-catalogo">Peça</Label>
              <div className="flex gap-2">
                <Select required value={pecaCatalogoId} onValueChange={setPecaCatalogoId}>
                  <SelectTrigger id="peca-catalogo" className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pecas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                        {p.precoUnitario != null ? ` — ${formatarReais(p.precoUnitario)}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalNovaPeca(true)}
                  className="shrink-0"
                >
                  + nova
                </Button>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tipo-servico">Tipo de serviço</Label>
              <Select value={tipoServico} onValueChange={setTipoServico}>
                <SelectTrigger id="tipo-servico" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Substituição">Substituição</SelectItem>
                  <SelectItem value="Reparo">Reparo</SelectItem>
                  <SelectItem value="Limpeza">Limpeza</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="garantia-meses">Garantia (meses)</Label>
              <Input
                id="garantia-meses"
                type="number"
                min={0}
                value={garantiaMeses}
                onChange={(e) => setGarantiaMeses(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="resolveu-problema">Essa troca resolveu o problema?</Label>
              <Select
                value={resolveuProblema}
                onValueChange={(v) => setResolveuProblema(v as typeof resolveuProblema)}
              >
                <SelectTrigger id="resolveu-problema" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indefinido">Ainda não sei (aguardando teste)</SelectItem>
                  <SelectItem value="sim">Sim, resolveu</SelectItem>
                  <SelectItem value="nao">Não, será preciso tentar outra coisa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {erroPeca && (
              <p className="text-xs text-danger">{erroPeca}</p>
            )}
            <Button type="submit" disabled={enviandoPeca} className="w-full">
              {enviandoPeca ? "Salvando..." : "Registrar peça"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal registrar/editar deslocamento */}
      <Dialog
        open={modalDeslocamentoAberto}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setModalDeslocamentoAberto(false);
            setDeslocamentoEditando(null);
            setErroDeslocamento(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deslocamentoEditando ? "Editar deslocamento" : "Registrar deslocamento"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvarDeslocamento} className="space-y-4">
            <div className="grid gap-1.5">
              <Label>Meio de transporte</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { valor: "CARRO", rotulo: "Carro", Icone: Car },
                  { valor: "AVIAO", rotulo: "Avião", Icone: Plane },
                ] as const).map(({ valor, rotulo, Icone }) => (
                  <Button
                    key={valor}
                    type="button"
                    variant={modalTransporte === valor ? "default" : "outline"}
                    onClick={() => setModalTransporte(valor)}
                  >
                    <Icone size={16} />
                    {rotulo}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="origem-cidade">Cidade de origem</Label>
              <Input
                id="origem-cidade"
                placeholder="Ex: São Paulo"
                value={origemCidade}
                onChange={(e) => setOrigemCidade(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="destino-cidade">Cidade de destino</Label>
              <Input
                id="destino-cidade"
                placeholder="Ex: Campinas"
                value={destinoCidade}
                onChange={(e) => setDestinoCidade(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="custo-passagem">
                  {modalTransporte === "AVIAO" ? "Custo passagem (R$)" : "Custo combustível (R$)"}
                </Label>
                <Input
                  id="custo-passagem"
                  type="number"
                  min={0}
                  step="0.01"
                  value={custoPassagem}
                  onChange={(e) => setCustoPassagem(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="custo-hospedagem">Custo hospedagem (R$)</Label>
                <Input
                  id="custo-hospedagem"
                  type="number"
                  min={0}
                  step="0.01"
                  value={custoHospedagem}
                  onChange={(e) => setCustoHospedagem(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="custo-alimentacao">Custo alimentação (R$)</Label>
                <Input
                  id="custo-alimentacao"
                  type="number"
                  min={0}
                  step="0.01"
                  value={custoAlimentacao}
                  onChange={(e) => setCustoAlimentacao(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dias-viagem">Dias de viagem</Label>
                <Input
                  id="dias-viagem"
                  type="number"
                  min={1}
                  step="1"
                  value={diasViagem}
                  onChange={(e) => setDiasViagem(e.target.value)}
                />
              </div>
            </div>
            {erroDeslocamento && (
              <p className="text-xs text-danger">{erroDeslocamento}</p>
            )}
            <Button type="submit" disabled={enviandoDeslocamento} className="w-full">
              {enviandoDeslocamento
                ? "Salvando..."
                : deslocamentoEditando
                ? "Salvar alterações"
                : "Registrar deslocamento"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal cadastrar nova peça no catálogo */}
      <Dialog
        open={modalNovaPeca}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setModalNovaPeca(false);
            setErroCriarPeca(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar nova peça no catálogo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCriarPeca} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="nome-nova-peca">Nome da peça</Label>
              <Input
                id="nome-nova-peca"
                required
                value={nomeNovaPeca}
                onChange={(e) => setNomeNovaPeca(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="preco-nova-peca">Preço unitário (R$, opcional)</Label>
              <Input
                id="preco-nova-peca"
                type="number"
                min={0}
                step="0.01"
                value={precoNovaPeca}
                onChange={(e) => setPrecoNovaPeca(e.target.value)}
              />
            </div>
            {erroCriarPeca && (
              <p className="text-xs text-danger">{erroCriarPeca}</p>
            )}
            <Button type="submit" disabled={enviandoNovaPeca} className="w-full">
              {enviandoNovaPeca ? "Cadastrando..." : "Cadastrar peça"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão de deslocamento */}
      <Dialog
        open={modalConfirmarExclusao}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setModalConfirmarExclusao(false);
            setDeslocamentoParaExcluir(null);
            setErroDeslocamento(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir deslocamento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este deslocamento? Essa ação não pode ser desfeita.
          </p>
          {erroDeslocamento && (
            <p className="text-xs text-danger">{erroDeslocamento}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setModalConfirmarExclusao(false);
                setDeslocamentoParaExcluir(null);
                setErroDeslocamento(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmarExclusaoDeslocamento}
              className="bg-danger text-white hover:bg-danger/90"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão de anexo */}
      <Dialog
        open={anexoParaExcluir !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setAnexoParaExcluir(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir anexo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <span className="font-medium text-foreground">{anexoParaExcluir?.nomeArquivo}</span>?
            Essa ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAnexoParaExcluir(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmarExclusaoAnexo}
              className="bg-danger text-white hover:bg-danger/90"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
