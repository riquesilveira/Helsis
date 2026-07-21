import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "../../services/api";
import { Funcionario } from "../../types";
import { Campo, classeInput, Modal } from "../../components/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button, classeBotao } from "../../components/ui/Button";

/** Formata centavos como moeda brasileira: 350000 → "3.500,00" */
function formatarMoeda(valor: string): string {
  const apenas = valor.replace(/\D/g, "");
  if (!apenas) return "";
  const centavos = parseInt(apenas, 10);
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

/** Converte "3.500,00" → 3500 (número) */
function moedaParaNumero(valor: string): number {
  return Number(valor.replace(/\./g, "").replace(",", "."));
}

const FORM_VAZIO = {
  nome: "",
  email: "",
  senha: "",
  cargo: "",
  salarioAtual: "",
  dataAdmissao: new Date().toISOString().slice(0, 10),
  papel: "TECNICO",
};

/** Papéis atribuíveis a um funcionário interno (nível 1 a 3). */
const PAPEIS_FUNCIONARIO: { valor: string; rotulo: string }[] = [
  { valor: "TECNICO", rotulo: "Técnico (N1)" },
  { valor: "SUPORTE", rotulo: "Suporte Técnico (N2)" },
  { valor: "GESTOR", rotulo: "Gerente Técnico (N3)" },
];

const ROTULO_PAPEL: Record<string, string> = {
  DONO: "Diretor Técnico",
  GESTOR: "Gerente Técnico",
  SUPORTE: "Suporte Técnico",
  TECNICO: "Técnico",
};

export function FuncionariosList() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [novaEspecialidade, setNovaEspecialidade] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroSubmit, setErroSubmit] = useState<string | null>(null);

  // modal de edição
  const [modalEditar, setModalEditar] = useState(false);
  const [editId, setEditId] = useState("");
  const [editForm, setEditForm] = useState({ nome: "", email: "", cargo: "", salarioAtual: "", papel: "TECNICO" });
  const [editEspecialidades, setEditEspecialidades] = useState<string[]>([]);
  const [novaEditEsp, setNovaEditEsp] = useState("");
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [erroEdit, setErroEdit] = useState<string | null>(null);

  function abrirModalEditar(f: Funcionario) {
    setEditId(f.id);
    setEditForm({
      nome: f.usuario.nome,
      email: f.usuario.email,
      cargo: f.cargo,
      salarioAtual: Number(f.salarioAtual).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      papel: f.usuario.papel ?? "TECNICO",
    });
    setEditEspecialidades(f.especialidades ?? []);
    setNovaEditEsp("");
    setModalEditar(true);
  }

  function adicionarEditEsp() {
    const valor = novaEditEsp.trim();
    if (valor && !editEspecialidades.includes(valor)) {
      setEditEspecialidades([...editEspecialidades, valor]);
    }
    setNovaEditEsp("");
  }

  async function salvarEdicao(e: FormEvent) {
    e.preventDefault();
    setErroEdit(null);
    setSalvandoEdit(true);
    try {
      await api.patch(`/funcionarios/${editId}`, {
        nome: editForm.nome,
        email: editForm.email,
        cargo: editForm.cargo,
        salarioAtual: moedaParaNumero(editForm.salarioAtual),
        especialidades: editEspecialidades,
        papel: editForm.papel,
      });
      setModalEditar(false);
      carregar();
    } catch (err: any) {
      setErroEdit(err?.response?.data?.erro ?? "Não foi possível salvar. Tente novamente.");
    } finally {
      setSalvandoEdit(false);
    }
  }

  function adicionarEspecialidade() {
    const valor = novaEspecialidade.trim();
    if (valor && !especialidades.includes(valor)) {
      setEspecialidades([...especialidades, valor]);
    }
    setNovaEspecialidade("");
  }

  function removerEspecialidade(index: number) {
    setEspecialidades((prev) => prev.filter((_, i) => i !== index));
  }

  function carregar() {
    setCarregando(true);
    api.get("/funcionarios").then((r) => setFuncionarios(r.data)).catch(() => {}).finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErroSubmit(null);
    setSalvando(true);
    try {
      await api.post("/funcionarios", {
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        cargo: form.cargo,
        salarioAtual: moedaParaNumero(form.salarioAtual),
        dataAdmissao: form.dataAdmissao,
        especialidades,
        papel: form.papel,
      });
      setModalAberto(false);
      setForm(FORM_VAZIO);
      setEspecialidades([]);
      carregar();
    } catch (err: any) {
      setErroSubmit(err?.response?.data?.erro ?? "Não foi possível cadastrar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Equipe & desempenho"
        subtitulo="Técnicos e colaboradores da operação."
        acoes={
          <Button onClick={() => setModalAberto(true)}>
            <Plus size={16} />
            Novo funcionário
          </Button>
        }
      />

      <Card className="divide-y divide-grafite-100 overflow-hidden p-0">
        {carregando && (
          <p className="text-sm text-grafite-500 px-5 py-4">Carregando...</p>
        )}
        {!carregando && funcionarios.map((f) => (
          <div key={f.id} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-grafite-50">
            <Link to={`/funcionarios/${f.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-sm font-semibold text-white">
                {f.usuario.nome.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-grafite-900 truncate">{f.usuario.nome}</p>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      abrirModalEditar(f);
                    }}
                    className="flex-shrink-0 text-xs font-medium text-teal-700 hover:text-teal-800"
                  >
                    Editar
                  </button>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <p className="text-xs text-grafite-500 truncate">{f.cargo}</p>
                  {f.usuario.papel && f.usuario.papel !== "TECNICO" && (
                    <span className="inline-flex flex-shrink-0 items-center rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                      {ROTULO_PAPEL[f.usuario.papel] ?? f.usuario.papel}
                    </span>
                  )}
                </div>
              </div>
            </Link>
            <span className="codigo text-sm text-grafite-700 flex-shrink-0">
              R$ {Number(f.salarioAtual).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
        {!carregando && funcionarios.length === 0 && (
          <p className="text-sm text-grafite-500 px-5 py-4">Nenhum funcionário cadastrado.</p>
        )}
      </Card>

      <Modal titulo="Novo funcionário" aberto={modalAberto} onFechar={() => { setModalAberto(false); setErroSubmit(null); }}>
        <form onSubmit={handleSubmit}>
          <Campo rotulo="Nome completo">
            <input
              required
              className={classeInput}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="E-mail (login)">
              <input
                required
                type="email"
                name="email"
                autoComplete="off"
                className={classeInput}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Campo>
            <Campo rotulo="Senha">
              <input
                required
                type="password"
                minLength={6}
                autoComplete="new-password"
                className={classeInput}
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
              />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Cargo">
              <input
                required
                placeholder="Ex: Técnico, Técnico Sênior"
                className={classeInput}
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
              />
            </Campo>
            <Campo rotulo="Salário">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-grafite-500">R$</span>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  className={`${classeInput} pl-9`}
                  value={form.salarioAtual}
                  onChange={(e) => setForm({ ...form, salarioAtual: formatarMoeda(e.target.value) })}
                />
              </div>
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Data de admissão">
              <input
                required
                type="date"
                className={classeInput}
                value={form.dataAdmissao}
                onChange={(e) => setForm({ ...form, dataAdmissao: e.target.value })}
              />
            </Campo>
            <Campo rotulo="Nível de acesso">
              <select
                className={classeInput}
                value={form.papel}
                onChange={(e) => setForm({ ...form, papel: e.target.value })}
              >
                {PAPEIS_FUNCIONARIO.map((p) => (
                  <option key={p.valor} value={p.valor}>{p.rotulo}</option>
                ))}
              </select>
            </Campo>
          </div>
          <Campo rotulo="Especialidades">
            {especialidades.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {especialidades.map((esp, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-medium px-2.5 py-1 rounded-full"
                  >
                    {esp}
                    <button
                      type="button"
                      onClick={() => removerEspecialidade(i)}
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
                value={novaEspecialidade}
                onChange={(e) => setNovaEspecialidade(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    adicionarEspecialidade();
                  }
                }}
              />
              <button
                type="button"
                onClick={adicionarEspecialidade}
                className="flex-shrink-0 text-sm font-medium text-teal-600 hover:text-teal-700 rounded-md px-3 py-2 transition-colors"
              >
                + Adicionar
              </button>
            </div>
          </Campo>
          {erroSubmit && (
            <p className="text-xs text-red-500 mb-3">{erroSubmit}</p>
          )}
          <button type="submit" disabled={salvando} className={`${classeBotao("primary")} mt-2 w-full`}>
            {salvando ? "Salvando..." : "Cadastrar funcionário"}
          </button>
        </form>
      </Modal>

      <Modal titulo="Editar funcionário" aberto={modalEditar} onFechar={() => { setModalEditar(false); setErroEdit(null); }}>
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
          <Campo rotulo="Nível de acesso">
            <select
              className={classeInput}
              value={editForm.papel}
              onChange={(e) => setEditForm({ ...editForm, papel: e.target.value })}
            >
              {PAPEIS_FUNCIONARIO.map((p) => (
                <option key={p.valor} value={p.valor}>{p.rotulo}</option>
              ))}
            </select>
          </Campo>
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
                value={novaEditEsp}
                onChange={(e) => setNovaEditEsp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    adicionarEditEsp();
                  }
                }}
              />
              <button
                type="button"
                onClick={adicionarEditEsp}
                className="flex-shrink-0 text-sm font-medium text-teal-600 hover:text-teal-700 rounded-md px-3 py-2 transition-colors"
              >
                + Adicionar
              </button>
            </div>
          </Campo>
          {erroEdit && (
            <p className="text-xs text-red-500 mb-3">{erroEdit}</p>
          )}
          <button type="submit" disabled={salvandoEdit} className={`${classeBotao("primary")} mt-2 w-full`}>
            {salvandoEdit ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
