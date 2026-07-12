import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../services/api";
import { NotificacaoItem, OrdemServico, OPCOES_STATUS, PecaCatalogo, StatusOS } from "../../types";
import { StatusTimeline } from "../../components/StatusTimeline";
import { Campo, classeInput, Modal } from "../../components/Modal";
import { usuarioLogado } from "../../services/auth";
import { formatarReais, tempoRelativo } from "../../utils/formatters";

const ROTULO_MODALIDADE: Record<OrdemServico["modalidade"], string> = {
  VISITA_TECNICA: "Visita técnica",
  OFICINA: "Oficina",
  REMOTO: "Suporte remoto",
};

export function OrdemServicoDetail() {
  const { id } = useParams();
  const usuario = usuarioLogado();
  const podeVerFinanceiro = usuario?.papel === "DONO" || usuario?.papel === "GESTOR";
  const [os, setOs] = useState<OrdemServico | null>(null);
  const [pecas, setPecas] = useState<PecaCatalogo[]>([]);
  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);

  // formulário de status
  const [novoStatus, setNovoStatus] = useState<StatusOS>("RECEBIDO");
  const [observacao, setObservacao] = useState("");
  const [novaTentativa, setNovaTentativa] = useState(false);
  const [enviandoStatus, setEnviandoStatus] = useState(false);
  const [erroStatus, setErroStatus] = useState<string | null>(null);

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
  const [origemCidade, setOrigemCidade] = useState("");
  const [destinoCidade, setDestinoCidade] = useState("");
  const [custoPassagem, setCustoPassagem] = useState("");
  const [custoHospedagem, setCustoHospedagem] = useState("");
  const [custoAlimentacao, setCustoAlimentacao] = useState("");
  const [diasViagem, setDiasViagem] = useState("");
  const [enviandoDeslocamento, setEnviandoDeslocamento] = useState(false);

  // confirmação de exclusão de deslocamento
  const [modalConfirmarExclusao, setModalConfirmarExclusao] = useState(false);
  const [deslocamentoParaExcluir, setDeslocamentoParaExcluir] = useState<string | null>(null);
  const [erroDeslocamento, setErroDeslocamento] = useState<string | null>(null);

  // fechamento financeiro
  const [valorMaoDeObra, setValorMaoDeObra] = useState("");
  const [valorComissao, setValorComissao] = useState("");
  const [salvandoFinanceiro, setSalvandoFinanceiro] = useState(false);

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

  // inicializa os campos de fechamento financeiro quando a OS carrega
  // (mas não toda vez que ela é recarregada, pra não sobrescrever o que
  // a pessoa está digitando)
  useEffect(() => {
    if (os) {
      setValorMaoDeObra(os.valorMaoDeObra != null ? String(os.valorMaoDeObra) : "");
      setValorComissao(os.valorComissao != null ? String(os.valorComissao) : "");
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

  async function handleRegistrarDeslocamento(e: FormEvent) {
    e.preventDefault();
    setEnviandoDeslocamento(true);
    try {
      await api.post(`/ordens-servico/${id}/deslocamentos`, {
        funcionarioId: os?.funcionario?.id,
        origemCidade: origemCidade || undefined,
        destinoCidade: destinoCidade || undefined,
        custoPassagem: custoPassagem ? Number(custoPassagem) : undefined,
        custoHospedagem: custoHospedagem ? Number(custoHospedagem) : undefined,
        custoAlimentacao: custoAlimentacao ? Number(custoAlimentacao) : undefined,
        diasViagem: diasViagem ? Number(diasViagem) : undefined,
      });
      setModalDeslocamentoAberto(false);
      setOrigemCidade("");
      setDestinoCidade("");
      setCustoPassagem("");
      setCustoHospedagem("");
      setCustoAlimentacao("");
      setDiasViagem("");
      carregar();
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

  if (!os) return <p className="text-sm text-grafite-500">Carregando...</p>;

  const semTecnico = !os.funcionario;
  const valorPecas = (os.pecasTrocadas ?? []).reduce(
    (soma, p) => soma + (p.precoUnitario ?? 0) * p.quantidade,
    0
  );
  const valorTotal = valorPecas + (Number(valorMaoDeObra) || 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2">
          <p className="codigo text-sm text-grafite-500">OS #{os.numero}</p>
          <span
            className={`codigo text-xs font-medium px-1.5 py-0.5 rounded ${
              os.tipo === "PREVENTIVA"
                ? "bg-teal-100 text-teal-700"
                : "bg-grafite-100 text-grafite-600"
            }`}
          >
            {os.tipo === "PREVENTIVA" ? "preventiva" : "corretiva"}
          </span>
          <span className="text-xs text-grafite-400" title={new Date(os.dataAbertura).toLocaleString("pt-BR")}>
            aberta {tempoRelativo(os.dataAbertura)}
          </span>
        </div>
        <h1 className="text-xl font-semibold text-grafite-900 mt-1">{os.cliente.nome}</h1>
        <p className="text-sm text-grafite-600 mt-1">
          {os.equipamento.tipo}
          {os.equipamento.marca ? ` — ${os.equipamento.marca} ${os.equipamento.modelo ?? ""}` : ""}
          {" · "}
          {ROTULO_MODALIDADE[os.modalidade]}
        </p>
      </div>

      <div className="bg-white border border-grafite-200 rounded-lg p-5">
        <p className="text-xs text-grafite-500 mb-1">Problema relatado</p>
        <p className="text-sm text-grafite-900">{os.descricaoProblema}</p>
      </div>

      <div>
        <h2 className="text-sm font-medium text-grafite-900 mb-3">Acompanhamento</h2>
        <StatusTimeline historico={os.statusHistoricos} statusAtual={os.statusAtual} />
      </div>

      <div className="bg-white border border-grafite-200 rounded-lg p-5">
        <h2 className="text-sm font-medium text-grafite-900 mb-3">
          Notificações enviadas ao cliente
        </h2>
        <div className="divide-y divide-grafite-100">
          {notificacoes.map((n) => (
            <div key={n.id} className="py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-grafite-900 truncate">{n.mensagem.split("\n")[0]}</p>
                <p className="codigo text-xs text-grafite-500 mt-0.5">
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
                className={`text-xs codigo flex-shrink-0 ${
                  n.status === "ENVIADA" ? "text-status-concluido" : "text-status-cancelado"
                }`}
                title={n.erro}
              >
                {n.status === "ENVIADA" ? "enviada" : "falhou"}
              </span>
            </div>
          ))}
          {notificacoes.length === 0 && (
            <p className="text-sm text-grafite-500 py-2">Nenhuma notificação enviada ainda.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-grafite-200 rounded-lg p-5">
          <p className="text-xs text-grafite-500">Técnico responsável</p>
          <p className="text-sm text-grafite-900 mt-1">
            {os.funcionario?.usuario.nome ?? "Não atribuído"}
          </p>
        </div>
        <div className="bg-white border border-grafite-200 rounded-lg p-5">
          <p className="text-xs text-grafite-500">Tentativas até agora</p>
          <p className="codigo text-sm text-grafite-900 mt-1">{os.numeroTentativas + 1}</p>
        </div>
      </div>

      {/* Atualizar status */}
      {os.statusAtual !== "CONCLUIDO" && os.statusAtual !== "CANCELADO" && (
        <div className="bg-white border border-grafite-200 rounded-lg p-5">
          <h2 className="text-sm font-medium text-grafite-900 mb-3">Atualizar status</h2>
          <form onSubmit={handleAtualizarStatus}>
            <Campo rotulo="Novo status">
              <select
                className={classeInput}
                value={novoStatus}
                onChange={(e) => setNovoStatus(e.target.value as StatusOS)}
              >
                {OPCOES_STATUS.map((op) => (
                  <option key={op.status} value={op.status}>
                    {op.rotulo}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Observação (opcional)">
              <textarea
                rows={2}
                className={classeInput}
                placeholder="Ex: peça trocada não resolveu, retornando ao reparo"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </Campo>
            <label className="flex items-center gap-2 mb-4 text-sm text-grafite-700">
              <input
                type="checkbox"
                checked={novaTentativa}
                onChange={(e) => setNovaTentativa(e.target.checked)}
              />
              Essa mudança representa uma nova tentativa de resolver o problema
            </label>
            {erroStatus && (
              <p className="text-xs text-red-500 mb-3">{erroStatus}</p>
            )}
            <button
              type="submit"
              disabled={enviandoStatus}
              className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md px-4 py-2 transition-colors disabled:opacity-60"
            >
              {enviandoStatus ? "Salvando..." : "Salvar status"}
            </button>
          </form>
        </div>
      )}

      {/* Peças trocadas */}
      <div className="bg-white border border-grafite-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-grafite-900">Peças trocadas</h2>
          <button
            onClick={() => setModalPecaAberto(true)}
            disabled={semTecnico}
            className="text-xs font-medium text-teal-700 hover:text-teal-800 disabled:opacity-40 disabled:cursor-not-allowed"
            title={semTecnico ? "Atribua um técnico à OS primeiro" : ""}
          >
            + Registrar peça
          </button>
        </div>

        <div className="divide-y divide-grafite-100">
          {(os.pecasTrocadas ?? []).map((p) => (
            <div key={p.id} className="py-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-grafite-900">
                  {p.pecaCatalogo.nome}{" "}
                  <span className="codigo text-xs text-grafite-500">
                    ({p.tipoServico}, tentativa {p.tentativaNumero})
                  </span>
                </p>
                {p.garantiaAte && (
                  <p className="text-xs text-grafite-500 mt-0.5">
                    Garantia até {new Date(p.garantiaAte).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                {p.precoUnitario != null && (
                  <span className="codigo text-xs text-grafite-600">
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
            <p className="text-sm text-grafite-500 py-3">Nenhuma peça registrada ainda.</p>
          )}
        </div>
      </div>

      {/* Deslocamentos (viagens) */}
      <div className="bg-white border border-grafite-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-grafite-900">Deslocamentos</h2>
          {podeVerFinanceiro && (
            <button
              onClick={() => setModalDeslocamentoAberto(true)}
              disabled={semTecnico}
              className="text-xs font-medium text-teal-700 hover:text-teal-800 disabled:opacity-40 disabled:cursor-not-allowed"
              title={semTecnico ? "Atribua um técnico à OS primeiro" : ""}
            >
              + Registrar deslocamento
            </button>
          )}
        </div>

        <div className="divide-y divide-grafite-100">
          {(os.deslocamentos ?? []).map((d) => {
            const custoTotal =
              (d.custoPassagem ?? 0) + (d.custoHospedagem ?? 0) + (d.custoAlimentacao ?? 0);
            return (
              <div key={d.id} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-grafite-900">
                    {d.origemCidade ?? "—"} → {d.destinoCidade ?? "—"}
                    {d.diasViagem != null && (
                      <span className="codigo text-xs text-grafite-500">
                        {" "}({d.diasViagem} {d.diasViagem === 1 ? "dia" : "dias"})
                      </span>
                    )}
                  </p>
                  <div className="flex gap-3 mt-0.5">
                    {d.custoPassagem != null && d.custoPassagem > 0 && (
                      <span className="text-xs text-grafite-500">
                        Passagem: {formatarReais(d.custoPassagem)}
                      </span>
                    )}
                    {d.custoHospedagem != null && d.custoHospedagem > 0 && (
                      <span className="text-xs text-grafite-500">
                        Hospedagem: {formatarReais(d.custoHospedagem)}
                      </span>
                    )}
                    {d.custoAlimentacao != null && d.custoAlimentacao > 0 && (
                      <span className="text-xs text-grafite-500">
                        Alimentação: {formatarReais(d.custoAlimentacao)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {custoTotal > 0 && (
                    <span className="codigo text-xs text-grafite-600">
                      {formatarReais(custoTotal)}
                    </span>
                  )}
                  {podeVerFinanceiro && (
                    <button
                      onClick={() => solicitarExclusaoDeslocamento(d.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                      title="Excluir deslocamento"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {(os.deslocamentos ?? []).length === 0 && (
            <p className="text-sm text-grafite-500 py-3">Nenhum deslocamento registrado ainda.</p>
          )}
        </div>
        {erroDeslocamento && (
          <p className="text-xs text-red-500 mt-2">{erroDeslocamento}</p>
        )}
      </div>

      {/* Fechamento financeiro — editável só por dono/gestor (é quem decide o
          valor cobrado e a comissão). O técnico vê uma versão só leitura,
          pra ter transparência sobre quanto vai receber, sem poder alterar. */}
      {podeVerFinanceiro ? (
        <div className="bg-white border border-grafite-200 rounded-lg p-5">
          <h2 className="text-sm font-medium text-grafite-900 mb-1">Fechamento financeiro</h2>
          <p className="text-xs text-grafite-500 mb-4">
            A comissão do técnico incide só sobre a mão de obra — peça é custo repassado ao cliente.
          </p>
          <form onSubmit={handleSalvarFinanceiro}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-grafite-500 mb-1">Valor das peças</p>
                <p className="codigo text-lg font-semibold text-grafite-900">
                  {formatarReais(valorPecas)}
                </p>
              </div>
              <Campo rotulo="Valor da mão de obra (R$)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={classeInput}
                  value={valorMaoDeObra}
                  onChange={(e) => handleValorMaoDeObraChange(e.target.value)}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-grafite-500 mb-1">Valor total do atendimento</p>
                <p className="codigo text-lg font-semibold text-grafite-900">
                  {formatarReais(valorTotal)}
                </p>
              </div>
              <Campo
                rotulo={
                  os.funcionario?.tipoComissao
                    ? `Comissão do técnico (${
                        os.funcionario.tipoComissao === "PERCENTUAL"
                          ? `${os.funcionario.valorComissao}% da mão de obra`
                          : "valor fixo"
                      })`
                    : "Comissão do técnico (sem comissão configurada)"
                }
              >
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={classeInput}
                  value={valorComissao}
                  onChange={(e) => setValorComissao(e.target.value)}
                  disabled={!os.funcionario}
                  placeholder={!os.funcionario ? "Atribua um técnico primeiro" : "0,00"}
                />
              </Campo>
            </div>
            <button
              type="submit"
              disabled={salvandoFinanceiro}
              className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md px-4 py-2 transition-colors disabled:opacity-60"
            >
              {salvandoFinanceiro ? "Salvando..." : "Salvar fechamento"}
            </button>
          </form>
        </div>
      ) : (
        os.valorMaoDeObra != null && (
          <div className="bg-white border border-grafite-200 rounded-lg p-5">
            <h2 className="text-sm font-medium text-grafite-900 mb-3">
              Fechamento financeiro deste atendimento
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-grafite-500">Mão de obra</p>
                <p className="codigo text-lg font-semibold text-grafite-900 mt-1">
                  {formatarReais(os.valorMaoDeObra)}
                </p>
              </div>
              <div>
                <p className="text-xs text-grafite-500">Sua comissão</p>
                <p className="codigo text-lg font-semibold text-teal-600 mt-1">
                  {os.valorComissao != null ? formatarReais(os.valorComissao) : "—"}
                </p>
              </div>
            </div>
          </div>
        )
      )}

      <Modal
        titulo="Registrar peça trocada"
        aberto={modalPecaAberto}
        onFechar={() => { setModalPecaAberto(false); setErroPeca(null); }}
      >
        <form onSubmit={handleRegistrarPeca}>
          <Campo rotulo="Peça">
            <div className="flex gap-2">
              <select
                required
                className={classeInput}
                value={pecaCatalogoId}
                onChange={(e) => setPecaCatalogoId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {pecas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                    {p.precoUnitario != null ? ` — ${formatarReais(p.precoUnitario)}` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setModalNovaPeca(true)}
                className="text-xs text-teal-700 hover:text-teal-800 flex-shrink-0"
              >
                + nova
              </button>
            </div>
          </Campo>
          <Campo rotulo="Tipo de serviço">
            <select
              className={classeInput}
              value={tipoServico}
              onChange={(e) => setTipoServico(e.target.value)}
            >
              <option value="Substituição">Substituição</option>
              <option value="Reparo">Reparo</option>
              <option value="Limpeza">Limpeza</option>
            </select>
          </Campo>
          <Campo rotulo="Garantia (meses)">
            <input
              type="number"
              min={0}
              className={classeInput}
              value={garantiaMeses}
              onChange={(e) => setGarantiaMeses(Number(e.target.value))}
            />
          </Campo>
          <Campo rotulo="Essa troca resolveu o problema?">
            <select
              className={classeInput}
              value={resolveuProblema}
              onChange={(e) => setResolveuProblema(e.target.value as typeof resolveuProblema)}
            >
              <option value="indefinido">Ainda não sei (aguardando teste)</option>
              <option value="sim">Sim, resolveu</option>
              <option value="nao">Não, será preciso tentar outra coisa</option>
            </select>
          </Campo>
          {erroPeca && (
            <p className="text-xs text-red-500 mb-3">{erroPeca}</p>
          )}
          <button
            type="submit"
            disabled={enviandoPeca}
            className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md py-2 transition-colors disabled:opacity-60"
          >
            {enviandoPeca ? "Salvando..." : "Registrar peça"}
          </button>
        </form>
      </Modal>

      <Modal
        titulo="Registrar deslocamento"
        aberto={modalDeslocamentoAberto}
        onFechar={() => setModalDeslocamentoAberto(false)}
      >
        <form onSubmit={handleRegistrarDeslocamento}>
          <Campo rotulo="Cidade de origem">
            <input
              className={classeInput}
              placeholder="Ex: São Paulo"
              value={origemCidade}
              onChange={(e) => setOrigemCidade(e.target.value)}
            />
          </Campo>
          <Campo rotulo="Cidade de destino">
            <input
              className={classeInput}
              placeholder="Ex: Campinas"
              value={destinoCidade}
              onChange={(e) => setDestinoCidade(e.target.value)}
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Custo passagem (R$)">
              <input
                type="number"
                min={0}
                step="0.01"
                className={classeInput}
                value={custoPassagem}
                onChange={(e) => setCustoPassagem(e.target.value)}
              />
            </Campo>
            <Campo rotulo="Custo hospedagem (R$)">
              <input
                type="number"
                min={0}
                step="0.01"
                className={classeInput}
                value={custoHospedagem}
                onChange={(e) => setCustoHospedagem(e.target.value)}
              />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Custo alimentação (R$)">
              <input
                type="number"
                min={0}
                step="0.01"
                className={classeInput}
                value={custoAlimentacao}
                onChange={(e) => setCustoAlimentacao(e.target.value)}
              />
            </Campo>
            <Campo rotulo="Dias de viagem">
              <input
                type="number"
                min={1}
                step="1"
                className={classeInput}
                value={diasViagem}
                onChange={(e) => setDiasViagem(e.target.value)}
              />
            </Campo>
          </div>
          <button
            type="submit"
            disabled={enviandoDeslocamento}
            className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md py-2 transition-colors disabled:opacity-60"
          >
            {enviandoDeslocamento ? "Salvando..." : "Registrar deslocamento"}
          </button>
        </form>
      </Modal>

      <Modal
        titulo="Cadastrar nova peça no catálogo"
        aberto={modalNovaPeca}
        onFechar={() => { setModalNovaPeca(false); setErroCriarPeca(null); }}
      >
        <form onSubmit={handleCriarPeca}>
          <Campo rotulo="Nome da peça">
            <input
              required
              className={classeInput}
              value={nomeNovaPeca}
              onChange={(e) => setNomeNovaPeca(e.target.value)}
            />
          </Campo>
          <Campo rotulo="Preço unitário (R$, opcional)">
            <input
              type="number"
              min={0}
              step="0.01"
              className={classeInput}
              value={precoNovaPeca}
              onChange={(e) => setPrecoNovaPeca(e.target.value)}
            />
          </Campo>
          {erroCriarPeca && (
            <p className="text-xs text-red-500 mb-3">{erroCriarPeca}</p>
          )}
          <button
            type="submit"
            disabled={enviandoNovaPeca}
            className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md py-2 transition-colors disabled:opacity-60"
          >
            {enviandoNovaPeca ? "Cadastrando..." : "Cadastrar peça"}
          </button>
        </form>
      </Modal>

      {/* Modal de confirmação de exclusão de deslocamento */}
      <Modal
        titulo="Excluir deslocamento"
        aberto={modalConfirmarExclusao}
        onFechar={() => { setModalConfirmarExclusao(false); setDeslocamentoParaExcluir(null); setErroDeslocamento(null); }}
      >
        <p className="text-sm text-grafite-700 mb-5">
          Tem certeza que deseja excluir este deslocamento? Essa ação não pode ser desfeita.
        </p>
        {erroDeslocamento && (
          <p className="text-xs text-red-500 mb-3">{erroDeslocamento}</p>
        )}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => { setModalConfirmarExclusao(false); setDeslocamentoParaExcluir(null); setErroDeslocamento(null); }}
            className="px-4 py-2 text-sm font-medium text-grafite-700 border border-grafite-200 rounded-md hover:bg-grafite-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmarExclusaoDeslocamento}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
          >
            Excluir
          </button>
        </div>
      </Modal>
    </div>
  );
}
