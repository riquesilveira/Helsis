import { FormEvent, useEffect, useState } from "react";
import { api } from "../services/api";
import { Campo, classeInput } from "../components/Modal";
import { Settings, User, Lock, Shield, Calendar } from "lucide-react";

const ROTULO_PAPEL: Record<string, string> = {
  DONO: "Diretor Técnico",
  GESTOR: "Gestor",
  TECNICO: "Técnico",
  CLIENTE: "Cliente",
};

interface Perfil {
  id: string;
  nome: string;
  email: string;
  papel: string;
  criadoEm: string;
}

export function Configuracoes() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  // edição de perfil
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [msgPerfil, setMsgPerfil] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // alteração de senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [msgSenha, setMsgSenha] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    api.get("/auth/me").then((r) => {
      setPerfil(r.data);
      setNome(r.data.nome);
      setEmail(r.data.email);
    }).catch(() => {});
  }, []);

  async function salvarPerfil(e: FormEvent) {
    e.preventDefault();
    setSalvandoPerfil(true);
    setMsgPerfil(null);
    try {
      const { data } = await api.patch("/auth/me", { nome, email });
      setPerfil((prev) => (prev ? { ...prev, nome: data.nome, email: data.email } : prev));
      // atualiza localStorage pra refletir no sidebar
      const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
      usuario.nome = data.nome;
      usuario.email = data.email;
      localStorage.setItem("usuario", JSON.stringify(usuario));
      setMsgPerfil({ tipo: "ok", texto: "Perfil atualizado com sucesso." });
    } catch (err: any) {
      setMsgPerfil({ tipo: "erro", texto: err?.response?.data?.erro ?? "Não foi possível atualizar o perfil." });
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function alterarSenha(e: FormEvent) {
    e.preventDefault();
    setMsgSenha(null);
    if (novaSenha !== confirmarSenha) {
      setMsgSenha({ tipo: "erro", texto: "As senhas não coincidem." });
      return;
    }
    setSalvandoSenha(true);
    try {
      await api.post("/auth/alterar-senha", { senhaAtual, novaSenha });
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      setMsgSenha({ tipo: "ok", texto: "Senha alterada com sucesso." });
    } catch (err: any) {
      setMsgSenha({ tipo: "erro", texto: err?.response?.data?.erro ?? "Não foi possível alterar a senha." });
    } finally {
      setSalvandoSenha(false);
    }
  }

  if (!perfil) return <p className="text-sm text-grafite-500">Carregando...</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Settings size={22} className="text-grafite-400" />
        <h1 className="text-xl font-semibold text-grafite-900">Configurações</h1>
      </div>

      {/* Info da conta */}
      <div className="bg-white border border-grafite-200 rounded-lg p-5">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={18} className="text-teal-600" />
          <h2 className="text-sm font-medium text-grafite-900">Informações da conta</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-grafite-500">Função</p>
            <p className="text-sm text-grafite-900 mt-0.5 font-medium">
              {ROTULO_PAPEL[perfil.papel] ?? perfil.papel}
            </p>
          </div>
          <div>
            <p className="text-xs text-grafite-500">Membro desde</p>
            <p className="text-sm text-grafite-900 mt-0.5 flex items-center gap-1.5">
              <Calendar size={14} className="text-grafite-400" />
              {new Date(perfil.criadoEm).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Editar perfil */}
      <div className="bg-white border border-grafite-200 rounded-lg p-5">
        <div className="flex items-center gap-3 mb-4">
          <User size={18} className="text-teal-600" />
          <h2 className="text-sm font-medium text-grafite-900">Editar perfil</h2>
        </div>
        <form onSubmit={salvarPerfil}>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Nome completo">
              <input
                required
                className={classeInput}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </Campo>
            <Campo rotulo="E-mail">
              <input
                required
                type="email"
                className={classeInput}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Campo>
          </div>
          {msgPerfil && (
            <p className={`text-xs mb-3 ${msgPerfil.tipo === "ok" ? "text-teal-600" : "text-red-500"}`}>
              {msgPerfil.texto}
            </p>
          )}
          <button
            type="submit"
            disabled={salvandoPerfil}
            className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md px-4 py-2 transition-colors disabled:opacity-60"
          >
            {salvandoPerfil ? "Salvando..." : "Salvar perfil"}
          </button>
        </form>
      </div>

      {/* Alterar senha */}
      <div className="bg-white border border-grafite-200 rounded-lg p-5">
        <div className="flex items-center gap-3 mb-4">
          <Lock size={18} className="text-teal-600" />
          <h2 className="text-sm font-medium text-grafite-900">Alterar senha</h2>
        </div>
        <form onSubmit={alterarSenha}>
          <Campo rotulo="Senha atual">
            <input
              required
              type="password"
              autoComplete="current-password"
              className={classeInput}
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Nova senha">
              <input
                required
                type="password"
                minLength={6}
                autoComplete="new-password"
                className={classeInput}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />
            </Campo>
            <Campo rotulo="Confirmar nova senha">
              <input
                required
                type="password"
                minLength={6}
                autoComplete="new-password"
                className={classeInput}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
              />
            </Campo>
          </div>
          {msgSenha && (
            <p className={`text-xs mb-3 ${msgSenha.tipo === "ok" ? "text-teal-600" : "text-red-500"}`}>
              {msgSenha.texto}
            </p>
          )}
          <button
            type="submit"
            disabled={salvandoSenha}
            className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-md px-4 py-2 transition-colors disabled:opacity-60"
          >
            {salvandoSenha ? "Alterando..." : "Alterar senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
