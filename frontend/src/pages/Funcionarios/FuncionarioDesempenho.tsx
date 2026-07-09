import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../services/api";
import { DesempenhoFuncionario, Funcionario, TipoComissao } from "../../types";
import { Campo, classeInput, Modal } from "../../components/Modal";

function formatarMoeda(valor: string): string {
  const apenas = valor.replace(/\D/g, "");
  if (!apenas) return "";
  const centavos = parseInt(apenas, 10);
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function moedaParaNumero(valor: string): number {
  return Number(valor.replace(/\./g, "").replace(",", "."));
}

function CartaoMetrica({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="bg-white border border-grafite-200 rounded-lg p-5">
      <p className="text-xs text-grafite-500">{rotulo}</p>
      <p className={`codigo text-2xl font-semibold mt-1 ${destaque ? "text-teal-600" : "text-grafite-900"}`}>
        {valor}
      </p>
    </div>
  );
}

function formatarReais(valor: number) {
  return `R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
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
    });
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
      api.get(`/desempenho/${id}`).then((r) => setDesempenho(r.data));
    } finally {
      setSalvandoEdit(false);
    }
  }

  useEffect(() => {
    api.get(`/desempenho/${id}`).then((r) => setDesempenho(r.data));
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

  if (!desempenho || !funcionario) return <p className="text-sm text-grafite-500">Carregando...</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-grafite-900">{desempenho.nome}</h1>
            <button
              onClick={abrirModalEditar}
              className="text-xs font-medium text-teal-700 hover:text-teal-800"
            >
              Editar
            </button>
          </div>
          <p className="text-sm text-grafite-600 mt-1">{desempenho.cargo}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link to={`/funcionarios/${id}/resumo`} className="text-xs font-medium text-teal-700 hover:text-teal-800">
            Resumo mensal (contracheque) →
          </Link>
          <Link to={`/funcionarios/${id}/rota`} className="text-xs font-medium text-teal-700 hover:text-teal-800">
            Ver rota do dia →
          </Link>
        </div>
      </div>

      <p className="text-xs text-grafite-500 max-w-md">
        Essas métricas são calculadas a partir do histórico real de ordens de serviço —
        é a base objetiva usada para avaliar pedidos de aumento.
      </p>

      <div className="grid grid-cols-3 gap-4">
        <CartaoMetrica
          rotulo="Taxa de acerto na 1ª visita"
          valor={`${Math.round(desempenho.taxaResolucaoPrimeiraTentativa * 100)}%`}
          destaque
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
        <h2 className="text-sm font-medium text-grafite-900 mb-3">Remuneração</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-grafite-200 rounded-lg p-5">
            <p className="text-xs text-grafite-500">Salário atual</p>
            <p className="codigo text-xl font-semibold text-grafite-900 mt-1">
              {formatarReais(funcionario.salarioAtual)}
            </p>
          </div>
          <div className="bg-white border border-grafite-200 rounded-lg p-5">
            <p className="text-xs text-grafite-500">Comissão acumulada (atendimentos concluídos)</p>
            <p className="codigo text-xl font-semibold text-teal-600 mt-1">
              {formatarReais(desempenho.comissaoAcumulada)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-grafite-200 rounded-lg p-5 max-w-md">
        <h2 className="text-sm font-medium text-grafite-900 mb-1">Configurar comissão</h2>
        <p className="text-xs text-grafite-500 mb-4">
          A comissão incide só sobre o valor de mão de obra de cada atendimento — nunca sobre peças.
        </p>
        <form onSubmit={salvarComissao}>
          <Campo rotulo="Tipo de comissão">
            <select
              className={classeInput}
              value={tipoComissao}
              onChange={(e) => setTipoComissao(e.target.value as "" | TipoComissao)}
            >
              <option value="">Nenhuma (só salário fixo)</option>
              <option value="PERCENTUAL">Percentual sobre a mão de obra</option>
              <option value="FIXO">Valor fixo por atendimento concluído</option>
            </select>
          </Campo>
          {tipoComissao && (
            <Campo rotulo={tipoComissao === "PERCENTUAL" ? "Percentual (%)" : "Valor fixo (R$)"}>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                className={classeInput}
                value={valorComissao}
                onChange={(e) => setValorComissao(e.target.value)}
              />
            </Campo>
          )}
          <button
            type="submit"
            disabled={salvandoComissao}
            className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md px-4 py-2 transition-colors disabled:opacity-60"
          >
            {salvandoComissao ? "Salvando..." : "Salvar comissão"}
          </button>
        </form>
      </div>

      <Modal titulo="Editar funcionário" aberto={modalEditar} onFechar={() => setModalEditar(false)}>
        <form onSubmit={salvarEdicao}>
          <Campo rotulo="Nome completo">
            <input
              required
              className={classeInput}
              value={editForm.nome}
              onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
            />
          </Campo>
          <Campo rotulo="E-mail">
            <input
              required
              type="email"
              className={classeInput}
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Cargo">
              <input
                required
                className={classeInput}
                value={editForm.cargo}
                onChange={(e) => setEditForm({ ...editForm, cargo: e.target.value })}
              />
            </Campo>
            <Campo rotulo="Salário">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-grafite-500">R$</span>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  className={`${classeInput} pl-9`}
                  value={editForm.salarioAtual}
                  onChange={(e) => setEditForm({ ...editForm, salarioAtual: formatarMoeda(e.target.value) })}
                />
              </div>
            </Campo>
          </div>
          <Campo rotulo="Especialidades">
            {editEspecialidades.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {editEspecialidades.map((esp, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-medium px-2.5 py-1 rounded-full"
                  >
                    {esp}
                    <button
                      type="button"
                      onClick={() => setEditEspecialidades((prev) => prev.filter((_, j) => j !== i))}
                      className="text-teal-400 hover:text-teal-700"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                placeholder="Ex: Ressonância Magnética"
                className={classeInput}
                value={novaEsp}
                onChange={(e) => setNovaEsp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    adicionarEsp();
                  }
                }}
              />
              <button
                type="button"
                onClick={adicionarEsp}
                className="flex-shrink-0 text-sm font-medium text-teal-600 hover:text-teal-700 rounded-md px-3 py-2 transition-colors"
              >
                + Adicionar
              </button>
            </div>
          </Campo>
          <button
            type="submit"
            disabled={salvandoEdit}
            className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md py-2 transition-colors disabled:opacity-60"
          >
            {salvandoEdit ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
