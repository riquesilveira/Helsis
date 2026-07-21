import { FormEvent, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { api } from "../../services/api";
import { PageHeader } from "../../components/ui/PageHeader";
import { Modal, Campo, classeInput } from "../../components/Modal";
import { classeBotao } from "../../components/ui/Button";

// Gestão do catálogo de diagnóstico codificado: Causa / Defeito / Solução.
// São tabelas de códigos padronizados que o técnico escolhe no fechamento do
// chamado. Aqui DONO/GESTOR criam, editam e desativam esses códigos — antes
// isso só existia via API/seed. Defeito e Solução têm um tempo estimado (min)
// usado para planejar/medir o atendimento.

type ItemCatalogo = {
  id: string;
  codigo: string;
  descricao: string;
  tempoEstimadoMin?: number | null;
};

type TipoCatalogo = "causas" | "defeitos" | "solucoes";

interface ConfigCatalogo {
  chave: TipoCatalogo;
  rotulo: string; // plural, usado na tab
  singular: string; // usado nos títulos de modal/botão
  genero: "m" | "f"; // concordância nas frases (novo/nova, cadastrado/cadastrada)
  temTempo: boolean;
}

const CATALOGOS: ConfigCatalogo[] = [
  { chave: "causas", rotulo: "Causas", singular: "causa", genero: "f", temTempo: false },
  { chave: "defeitos", rotulo: "Defeitos", singular: "defeito", genero: "m", temTempo: true },
  { chave: "solucoes", rotulo: "Soluções", singular: "solução", genero: "f", temTempo: true },
];

function formatarTempo(min?: number | null): string {
  if (!min) return "—";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

function SecaoCatalogo({ config }: { config: ConfigCatalogo }) {
  const f = config.genero === "f";
  const novo = f ? "Nova" : "Novo";
  const [itens, setItens] = useState<ItemCatalogo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);

  // modal de criar/editar
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<ItemCatalogo | null>(null);
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tempo, setTempo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    api
      .get(`/diagnostico/${config.chave}`)
      .then((r) => setItens(r.data))
      .catch(() => setErroLista("Não foi possível carregar os itens. Tente novamente."))
      .finally(() => setCarregando(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(carregar, [config.chave]);

  function abrirNovo() {
    setEditando(null);
    setCodigo("");
    setDescricao("");
    setTempo("");
    setErroForm(null);
    setModalAberto(true);
  }

  function abrirEdicao(item: ItemCatalogo) {
    setEditando(item);
    setCodigo(item.codigo);
    setDescricao(item.descricao);
    setTempo(item.tempoEstimadoMin ? String(item.tempoEstimadoMin) : "");
    setErroForm(null);
    setModalAberto(true);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErroForm(null);

    const corpo: Record<string, unknown> = {
      codigo: codigo.trim(),
      descricao: descricao.trim(),
    };
    if (config.temTempo) {
      corpo.tempoEstimadoMin = tempo ? Number(tempo) : undefined;
    }

    try {
      if (editando) {
        await api.patch(`/diagnostico/${config.chave}/${editando.id}`, corpo);
      } else {
        await api.post(`/diagnostico/${config.chave}`, corpo);
      }
      setModalAberto(false);
      carregar();
    } catch (err: any) {
      setErroForm(
        err?.response?.data?.erro ?? "Não foi possível salvar o item. Tente novamente."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(item: ItemCatalogo) {
    const ok = window.confirm(
      `Remover ${f ? "a" : "o"} ${config.singular} "${item.codigo} — ${item.descricao}" do catálogo? ` +
        `Ordens de serviço antigas que já usam este item não são afetadas.`
    );
    if (!ok) return;
    try {
      await api.delete(`/diagnostico/${config.chave}/${item.id}`);
      setItens((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err: any) {
      alert(err?.response?.data?.erro ?? "Não foi possível remover o item. Tente novamente.");
    }
  }

  return (
    <div className="bg-white border border-grafite-200 rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-grafite-200 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-grafite-900">
          {config.rotulo}
          {!carregando && (
            <span className="ml-2 text-xs font-normal text-grafite-400">{itens.length}</span>
          )}
        </h2>
        <button onClick={abrirNovo} className={classeBotao("primary", "sm")}>
          <Plus size={15} />
          {novo} {config.singular}
        </button>
      </div>

      {carregando ? (
        <p className="px-5 py-6 text-sm text-grafite-400">Carregando...</p>
      ) : erroLista ? (
        <p className="px-5 py-6 text-sm text-red-500">{erroLista}</p>
      ) : itens.length === 0 ? (
        <p className="px-5 py-6 text-sm text-grafite-400">
          Nenhum{f ? "a" : ""} {config.singular} cadastrad{f ? "a" : "o"} ainda.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-grafite-500 border-b border-grafite-100">
              <th className="px-5 py-2 font-medium w-32">Código</th>
              <th className="px-5 py-2 font-medium">Descrição</th>
              {config.temTempo && <th className="px-5 py-2 font-medium w-32">Tempo est.</th>}
              <th className="px-5 py-2 font-medium w-24 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} className="border-b border-grafite-50 last:border-0">
                <td className="px-5 py-2.5">
                  <span className="codigo font-medium text-grafite-800">{item.codigo}</span>
                </td>
                <td className="px-5 py-2.5 text-grafite-700">{item.descricao}</td>
                {config.temTempo && (
                  <td className="px-5 py-2.5 text-grafite-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={13} className="text-grafite-400" />
                      {formatarTempo(item.tempoEstimadoMin)}
                    </span>
                  </td>
                )}
                <td className="px-5 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => abrirEdicao(item)}
                      className="p-1.5 rounded-md text-grafite-500 hover:bg-grafite-100 hover:text-grafite-800 transition"
                      aria-label="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => excluir(item)}
                      className="p-1.5 rounded-md text-grafite-500 hover:bg-red-50 hover:text-red-600 transition"
                      aria-label="Remover"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        titulo={`${editando ? "Editar" : novo} ${config.singular}`}
      >
        <form onSubmit={salvar}>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Campo rotulo="Código">
                <input
                  required
                  className={classeInput}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="C01"
                />
              </Campo>
            </div>
            <div className="col-span-2">
              <Campo rotulo="Descrição">
                <input
                  required
                  minLength={2}
                  className={classeInput}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição padronizada"
                />
              </Campo>
            </div>
          </div>

          {config.temTempo && (
            <Campo rotulo="Tempo estimado (minutos) — opcional">
              <input
                type="number"
                min={1}
                className={classeInput}
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                placeholder="Ex.: 90"
              />
            </Campo>
          )}

          {erroForm && <p className="text-xs text-red-500 mb-3">{erroForm}</p>}

          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={() => setModalAberto(false)}
              className={classeBotao("secondary", "md")}
            >
              Cancelar
            </button>
            <button type="submit" disabled={salvando} className={classeBotao("primary", "md")}>
              {salvando ? "Salvando..." : editando ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function CatalogoDiagnostico() {
  const [tab, setTab] = useState<TipoCatalogo>("causas");
  const ativo = CATALOGOS.find((c) => c.chave === tab)!;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Catálogo de diagnóstico"
        subtitulo="Padronize as causas, defeitos e soluções escolhidos no fechamento dos chamados."
      />

      <div className="flex items-center gap-2 border-b border-grafite-200">
        {CATALOGOS.map((c) => (
          <button
            key={c.chave}
            onClick={() => setTab(c.chave)}
            className={`relative -mb-px px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === c.chave
                ? "text-teal-700 border-b-2 border-teal-600"
                : "text-grafite-500 hover:text-grafite-800 border-b-2 border-transparent"
            }`}
          >
            {c.rotulo}
          </button>
        ))}
      </div>

      <SecaoCatalogo key={ativo.chave} config={ativo} />
    </div>
  );
}
