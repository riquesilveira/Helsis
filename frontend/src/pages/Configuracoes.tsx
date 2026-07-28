import { FormEvent, useEffect, useState } from "react";
import { api } from "../services/api";
import { usuarioLogado } from "../services/auth";
import { User, Lock, Shield, Calendar } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/shadcn/card";
import { Button } from "../components/shadcn/button";
import { Input } from "../components/shadcn/input";
import { Label } from "../components/shadcn/label";

const ROTULO_PAPEL: Record<string, string> = {
  DONO: "Diretor Técnico",
  GESTOR: "Gestor",
  SUPORTE: "Suporte Técnico",
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
    // tenta buscar do backend; se falhar, usa localStorage como fallback
    api.get("/auth/me").then((r) => {
      setPerfil(r.data);
      setNome(r.data.nome);
      setEmail(r.data.email);
    }).catch(() => {
      const local = usuarioLogado();
      if (local) {
        setPerfil({ id: local.id, nome: local.nome, email: local.email, papel: local.papel, criadoEm: "" });
        setNome(local.nome);
        setEmail(local.email);
      }
    });
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
      setTimeout(() => setMsgPerfil(null), 4000);
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
      setTimeout(() => setMsgSenha(null), 4000);
    } catch (err: any) {
      setMsgSenha({ tipo: "erro", texto: err?.response?.data?.erro ?? "Não foi possível alterar a senha." });
    } finally {
      setSalvandoSenha(false);
    }
  }

  if (!perfil) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader titulo="Configurações" />

      {/* Info da conta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Shield className="size-4 text-muted-foreground" />
            Informações da conta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Função</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {ROTULO_PAPEL[perfil.papel] ?? perfil.papel}
              </p>
            </div>
            {perfil.criadoEm && (
              <div>
                <p className="text-xs text-muted-foreground">Membro desde</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-foreground">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {new Date(perfil.criadoEm).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Editar perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <User className="size-4 text-muted-foreground" />
            Editar perfil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={salvarPerfil} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="perfil-nome">Nome completo</Label>
                <Input
                  id="perfil-nome"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="perfil-email">E-mail</Label>
                <Input
                  id="perfil-email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            {msgPerfil && (
              <p className={`text-xs ${msgPerfil.tipo === "ok" ? "text-foreground" : "text-danger"}`}>
                {msgPerfil.texto}
              </p>
            )}
            <Button type="submit" disabled={salvandoPerfil}>
              {salvandoPerfil ? "Salvando..." : "Salvar perfil"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Alterar senha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Lock className="size-4 text-muted-foreground" />
            Alterar senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={alterarSenha} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="senha-atual">Senha atual</Label>
              <Input
                id="senha-atual"
                required
                type="password"
                autoComplete="current-password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="senha-nova">Nova senha</Label>
                <Input
                  id="senha-nova"
                  required
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="senha-confirmar">Confirmar nova senha</Label>
                <Input
                  id="senha-confirmar"
                  required
                  type="password"
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />
              </div>
            </div>
            {msgSenha && (
              <p className={`text-xs ${msgSenha.tipo === "ok" ? "text-foreground" : "text-danger"}`}>
                {msgSenha.texto}
              </p>
            )}
            <Button type="submit" disabled={salvandoSenha}>
              {salvandoSenha ? "Alterando..." : "Alterar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
