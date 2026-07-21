import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity } from "lucide-react";
import { api } from "../services/api";
import { Button } from "../components/ui/Button";

export function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const { data } = await api.post("/auth/login", { email, senha });
      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      navigate("/");
    } catch {
      setErro("E-mail ou senha inválidos.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-grafite-950 to-grafite-900 px-4">
      {/* brilho de fundo */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-teal-600/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 shadow-[0_0_30px_rgba(15,139,141,0.5)]">
            <Activity size={24} className="text-white" />
          </div>
          <p className="text-lg font-semibold tracking-tight text-white">Resso</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/95 p-8 shadow-dropdown backdrop-blur"
        >
          <h1 className="mb-6 text-center text-base font-semibold text-grafite-900">
            Sistema Inteligente de
            <br />
            Gestão de Serviços
          </h1>

          <label className="block text-xs font-medium text-grafite-600 mb-1.5">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-base mb-4"
          />

          <label className="block text-xs font-medium text-grafite-600 mb-1.5">Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            className="input-base mb-4"
          />

          {erro && <p className="mb-4 text-sm text-status-cancelado">{erro}</p>}

          <Button type="submit" disabled={carregando} className="w-full">
            {carregando ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
