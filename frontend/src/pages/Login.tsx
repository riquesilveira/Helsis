import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Check, Eye, EyeOff } from "lucide-react";
import { api } from "../services/api";
import { listarContas, salvarConta } from "../services/accountVault";
import { Button } from "../components/shadcn/button";
import { Input } from "../components/shadcn/input";
import { Label } from "../components/shadcn/label";

const DESTAQUES = [
  "Acompanhe chamados em tempo real",
  "Rotas e produtividade da equipe em campo",
  "Relatórios, contratos e comissões automáticos",
];

export function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();
  // Já existe alguma conta salva? Então este login é "adicionar outra conta".
  const adicionandoConta = listarContas().length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const { data } = await api.post("/auth/login", { email, senha });
      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      salvarConta(data.usuario, data.token);
      navigate("/");
    } catch {
      setErro("E-mail ou senha inválidos.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Painel de marca — só no desktop */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-grafite-900 p-12 text-white lg:flex">
        {/* Textura pontilhada sutil + brilho difuso, puro CSS (sem assets). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/[0.06] blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-white/[0.04] blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Activity size={22} />
          </div>
          <span className="text-xl font-semibold tracking-tight">Helsis</span>
        </div>

        <div className="relative space-y-7">
          <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            Gestão inteligente de assistência técnica
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-white/60">
            Ordens de serviço, equipe em campo, contratos e indicadores — tudo em um só lugar.
          </p>
          <ul className="space-y-3.5">
            {DESTAQUES.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
                  <Check className="size-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          © {new Date().getFullYear()} Helsis · Sistema Inteligente de Gestão de Serviços
        </p>
      </aside>

      {/* Coluna do formulário */}
      <main className="flex w-full flex-col items-center justify-center px-5 py-10 lg:w-1/2">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Marca compacta — só no mobile (o painel cobre o desktop). */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Activity size={24} />
            </div>
            <p className="text-lg font-semibold tracking-tight text-foreground">Helsis</p>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {adicionandoConta ? "Adicionar outra conta" : "Bem-vindo de volta"}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {adicionandoConta
                ? "Entre com outra conta para alternar sem sair da atual."
                : "Entre com suas credenciais para acessar o painel."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="voce@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="login-senha">Senha</Label>
              <div className="relative">
                <Input
                  id="login-senha"
                  type={mostrarSenha ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground pointer-coarse:size-10"
                >
                  {mostrarSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {erro && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{erro}</p>
            )}

            <Button type="submit" disabled={carregando} className="w-full">
              {carregando ? "Entrando..." : adicionandoConta ? "Entrar com esta conta" : "Entrar"}
            </Button>

            {adicionandoConta && (
              <Button asChild variant="ghost" className="w-full">
                <Link to="/">Cancelar</Link>
              </Button>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
