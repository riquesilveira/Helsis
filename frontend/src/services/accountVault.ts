import { UsuarioLogado } from "../types";

/**
 * Trocador de contas — permite ficar logado em vários usuários ao mesmo tempo
 * e alternar entre eles sem precisar deslogar/relogar (modelo "account chooser"
 * do Google).
 *
 * Como o Helsis guarda a autenticação em localStorage (`token` + `usuario`), o
 * cofre é 100% no cliente: um array de contas salvas, cada uma com o seu próprio
 * token JWT. A conta ATIVA é a que está nas chaves `token`/`usuario` — as mesmas
 * que o interceptor do `api.ts` já lê —, então nada no resto do app precisa mudar.
 *
 * Nota de segurança: guardar N tokens em localStorage tem a MESMA exposição a XSS
 * que o token único de hoje (o app já guarda um ali). É uma ferramenta interna;
 * posture aceitável. Cada conta tem o prazo do próprio JWT — um 401 remove só a
 * conta expirada (ver api.ts).
 */

export interface ContaSalva {
  token: string;
  usuario: UsuarioLogado;
}

const CHAVE_COFRE = "contas";
export const MAX_CONTAS = 5;

function ler(): ContaSalva[] {
  try {
    const bruto = localStorage.getItem(CHAVE_COFRE);
    const lista = bruto ? (JSON.parse(bruto) as ContaSalva[]) : [];
    if (!Array.isArray(lista)) return [];
    return lista.filter((c) => c && c.token && c.usuario?.id);
  } catch {
    return [];
  }
}

function escrever(contas: ContaSalva[]) {
  localStorage.setItem(CHAVE_COFRE, JSON.stringify(contas));
}

export function listarContas(): ContaSalva[] {
  return ler();
}

export function contaAtivaId(): string | null {
  try {
    const bruto = localStorage.getItem("usuario");
    if (!bruto) return null;
    return (JSON.parse(bruto) as UsuarioLogado).id ?? null;
  } catch {
    return null;
  }
}

export function cofreCheio(): boolean {
  return ler().length >= MAX_CONTAS;
}

/**
 * Adiciona (ou atualiza o token de) uma conta no cofre. Chamada no login —
 * dedup por id, então relogar a mesma conta só renova o token.
 */
export function salvarConta(usuario: UsuarioLogado, token: string) {
  const contas = ler();
  const i = contas.findIndex((c) => c.usuario.id === usuario.id);
  const conta: ContaSalva = { token, usuario };
  if (i >= 0) {
    contas[i] = conta;
  } else {
    contas.push(conta);
  }
  escrever(contas);
}

/**
 * Garante que a sessão ativa (que pode ter sido criada ANTES desta feature
 * existir) esteja registrada no cofre, pra ela aparecer na lista.
 */
export function migrarSessaoAtiva() {
  const token = localStorage.getItem("token");
  const bruto = localStorage.getItem("usuario");
  if (!token || !bruto) return;
  try {
    const usuario = JSON.parse(bruto) as UsuarioLogado;
    if (usuario?.id && !ler().some((c) => c.usuario.id === usuario.id)) {
      salvarConta(usuario, token);
    }
  } catch {
    /* sessão ilegível — ignora */
  }
}

/** Ativa uma conta salva (vira a sessão corrente) e recarrega a aplicação. */
export function trocarPara(id: string) {
  const conta = ler().find((c) => c.usuario.id === id);
  if (!conta || contaAtivaId() === id) return;
  localStorage.setItem("token", conta.token);
  localStorage.setItem("usuario", JSON.stringify(conta.usuario));
  // Reload completo: não há store global, então recarregar garante que todo
  // componente releia o localStorage e o axios use o novo token.
  window.location.href = "/";
}

/**
 * Remove uma conta do cofre. Se for a ativa, cai na próxima conta salva; se não
 * sobrar nenhuma, limpa a sessão e volta ao login.
 */
export function removerConta(id: string) {
  const eraAtiva = contaAtivaId() === id;
  const restantes = ler().filter((c) => c.usuario.id !== id);
  escrever(restantes);
  if (!eraAtiva) return;
  const proxima = restantes[0];
  if (proxima) {
    localStorage.setItem("token", proxima.token);
    localStorage.setItem("usuario", JSON.stringify(proxima.usuario));
    window.location.href = "/";
  } else {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "/login";
  }
}

/** Sai de TODAS as contas e limpa o cofre. */
export function sairDeTodas() {
  localStorage.removeItem(CHAVE_COFRE);
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "/login";
}
