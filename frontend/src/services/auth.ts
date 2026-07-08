import { UsuarioLogado } from "../types";

export function usuarioLogado(): UsuarioLogado | null {
  const bruto = localStorage.getItem("usuario");
  if (!bruto) return null;
  try {
    return JSON.parse(bruto) as UsuarioLogado;
  } catch {
    return null;
  }
}
