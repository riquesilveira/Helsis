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
  especialidades: "",
};

export function FuncionariosList() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

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
        salarioAtual: Number(form.salarioAtual),
        dataAdmissao: form.dataAdmissao,
        especialidades: form.especialidades
          ? form.especialidades.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      });
      setModalAberto(false);
      setForm(FORM_VAZIO);
      carregar();
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
          <Link
            key={f.id}
            to={`/funcionarios/${f.id}`}
            className="flex items-center justify-between px-5 py-4 hover:bg-grafite-50"
          >
            <div>
              <p className="text-sm text-grafite-900">{f.usuario.nome}</p>
              <p className="text-xs text-grafite-500 mt-0.5">{f.cargo}</p>
            </div>
            <span className="codigo text-sm text-grafite-600">
              R$ {Number(f.salarioAtual).toLocaleString("pt-BR")}
            </span>
          </Link>
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
            <Campo rotulo="Salário (R$)">
              <input
                required
                type="number"
                min={1}
                step="0.01"
                className={classeInput}
                value={form.salarioAtual}
                onChange={(e) => setForm({ ...form, salarioAtual: e.target.value })}
              />
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
          <Campo rotulo="Especialidades (separadas por vírgula, opcional)">
            <input
              placeholder="Ex: Ressonância Magnética, Tomografia"
              className={classeInput}
              value={form.especialidades}
              onChange={(e) => setForm({ ...form, especialidades: e.target.value })}
            />
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
    </div>
  );
}
