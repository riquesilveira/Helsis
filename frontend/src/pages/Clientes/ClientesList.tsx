import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { Cliente } from "../../types";
import { Campo, classeInput, Modal } from "../../components/Modal";

const CLIENTE_VAZIO = { nome: "", telefone: "", email: "", documento: "", cidade: "", estado: "" };

export function ClientesList() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(CLIENTE_VAZIO);
  const [salvando, setSalvando] = useState(false);

  function carregar() {
    api.get("/clientes").then((r) => setClientes(r.data));
  }

  useEffect(carregar, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post("/clientes", form);
      setModalAberto(false);
      setForm(CLIENTE_VAZIO);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-grafite-900">Clientes</h1>
        <button
          onClick={() => setModalAberto(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md px-4 py-2 transition-colors"
        >
          + Novo cliente
        </button>
      </div>

      <div className="bg-white border border-grafite-200 rounded-lg divide-y divide-grafite-100">
        {clientes.map((c) => (
          <Link
            key={c.id}
            to={`/clientes/${c.id}`}
            className="flex items-center justify-between px-5 py-4 hover:bg-grafite-50"
          >
            <div>
              <p className="text-sm text-grafite-900">{c.nome}</p>
              <p className="text-xs text-grafite-500 mt-0.5">
                {c.telefone}
                {c.cidade ? ` — ${c.cidade}/${c.estado ?? ""}` : ""}
              </p>
            </div>
            <span className="codigo text-xs text-grafite-400">
              {c.equipamentos?.length ?? 0} equipamento(s)
            </span>
          </Link>
        ))}
        {clientes.length === 0 && (
          <p className="text-sm text-grafite-500 px-5 py-4">Nenhum cliente cadastrado ainda.</p>
        )}
      </div>

      <Modal titulo="Novo cliente" aberto={modalAberto} onFechar={() => setModalAberto(false)}>
        <form onSubmit={handleSubmit}>
          <Campo rotulo="Nome">
            <input
              required
              className={classeInput}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </Campo>
          <Campo rotulo="Telefone">
            <input
              required
              className={classeInput}
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </Campo>
          <Campo rotulo="E-mail (opcional)">
            <input
              type="email"
              className={classeInput}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Cidade">
              <input
                className={classeInput}
                value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              />
            </Campo>
            <Campo rotulo="Estado (UF)">
              <input
                maxLength={2}
                className={classeInput}
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })}
              />
            </Campo>
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md py-2 transition-colors disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Cadastrar cliente"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
