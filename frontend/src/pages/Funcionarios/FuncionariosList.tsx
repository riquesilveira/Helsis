import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { Funcionario } from "../../types";
import { Campo, classeInput, Modal } from "../../components/Modal";

const FORM_VAZIO = {
  nome: "",
  email: "",
  senha: "",
  cargo: "",
  salarioAtual: "",
  dataAdmissao: new Date().toISOString().slice(0, 10),
};

export function FuncionariosList() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [novaEspecialidade, setNovaEspecialidade] = useState("");
  const [salvando, setSalvando] = useState(false);

  // modal de edição
  const [modalEditar, setModalEditar] = useState(false);
  const [editId, setEditId] = useState("");
  const [editForm, setEditForm] = useState({ nome: "", email: "", cargo: "", salarioAtual: "" });
  const [editEspecialidades, setEditEspecialidades] = useState<string[]>([]);
  const [novaEditEsp, setNovaEditEsp] = useState("");
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  function abrirModalEditar(f: Funcionario) {
    setEditId(f.id);
    setEditForm({
      nome: f.usuario.nome,
      email: f.usuario.email,
      cargo: f.cargo,
      salarioAtual: String(Number(f.salarioAtual)).replace(".", ","),
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
    setSalvandoEdit(true);
    try {
      await api.patch(`/funcionarios/${editId}`, {
        nome: editForm.nome,
        email: editForm.email,
        cargo: editForm.cargo,
        salarioAtual: Number(editForm.salarioAtual.replace(/\./g, "").replace(",", ".")),
        especialidades: editEspecialidades,
      });
      setModalEditar(false);
      carregar();
    } catch (err: any) {
      alert(err?.response?.data?.erro ?? "Não foi possível salvar. Tente novamente.");
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
    setEspecialidades(especialidades.filter((_, i) => i !== index));
  }

  function carregar() {
    api.get("/funcionarios").then((r) => setFuncionarios(r.data));
  }

  useEffect(carregar, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post("/funcionarios", {
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        cargo: form.cargo,
        salarioAtual: Number(form.salarioAtual.replace(/\./g, "").replace(",", ".")),
        dataAdmissao: form.dataAdmissao,
        especialidades,
      });
      setModalAberto(false);
      setForm(FORM_VAZIO);
      setEspecialidades([]);
      carregar();
    } catch (err: any) {
      alert(err?.response?.data?.erro ?? "Não foi possível cadastrar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-grafite-900">Equipe & desempenho</h1>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md px-4 py-2 transition-colors"
        >
          + Novo funcionário
        </button>
      </div>

      <div className="bg-white border border-grafite-200 rounded-lg divide-y divide-grafite-100">
        {funcionarios.map((f) => (
          <div key={f.id} className="flex items-center justify-between px-5 py-4 hover:bg-grafite-50">
            <Link to={`/funcionarios/${f.id}`} className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm text-grafite-900">{f.usuario.nome}</p>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    abrirModalEditar(f);
                  }}
                  className="text-xs font-medium text-teal-700 hover:text-teal-800"
                >
                  Editar
                </button>
              </div>
              <p className="text-xs text-grafite-500 mt-0.5">{f.cargo}</p>
            </Link>
            <span className="codigo text-sm text-grafite-600">
              R$ {Number(f.salarioAtual).toLocaleString("pt-BR")}
            </span>
          </div>
        ))}
        {funcionarios.length === 0 && (
          <p className="text-sm text-grafite-500 px-5 py-4">Nenhum funcionário cadastrado.</p>
        )}
      </div>

      <Modal titulo="Novo funcionário" aberto={modalAberto} onFechar={() => setModalAberto(false)}>
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
                  inputMode="decimal"
                  placeholder="0,00"
                  className={`${classeInput} pl-9`}
                  value={form.salarioAtual}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.,]/g, "");
                    setForm({ ...form, salarioAtual: raw });
                  }}
                />
              </div>
            </Campo>
          </div>
          <Campo rotulo="Data de admissão">
            <input
              required
              type="date"
              className={classeInput}
              value={form.dataAdmissao}
              onChange={(e) => setForm({ ...form, dataAdmissao: e.target.value })}
            />
          </Campo>
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
          <button
            type="submit"
            disabled={salvando}
            className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md py-2 transition-colors disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Cadastrar funcionário"}
          </button>
        </form>
      </Modal>

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
                  inputMode="decimal"
                  className={`${classeInput} pl-9`}
                  value={editForm.salarioAtual}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.,]/g, "");
                    setEditForm({ ...editForm, salarioAtual: raw });
                  }}
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
                      onClick={() => setEditEspecialidades(editEspecialidades.filter((_, j) => j !== i))}
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
