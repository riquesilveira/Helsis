import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import { Funcionario } from "../../types";

export function FuncionariosList() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);

  useEffect(() => {
    api.get("/funcionarios").then((r) => setFuncionarios(r.data));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-grafite-900">Equipe & desempenho</h1>

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
    </div>
  );
}
