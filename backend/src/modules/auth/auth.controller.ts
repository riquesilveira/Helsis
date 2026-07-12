import { Request, Response } from "express";
import { z } from "zod";
import { login, alterarSenha, atualizarPerfil, buscarPerfil } from "./auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
});

const alterarSenhaSchema = z.object({
  senhaAtual: z.string().min(1),
  novaSenha: z.string().min(6),
});

const atualizarPerfilSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
});

export async function loginController(req: Request, res: Response) {
  const dados = loginSchema.parse(req.body);
  const resultado = await login(dados);
  res.json(resultado);
}

export async function alterarSenhaController(req: Request, res: Response) {
  const { senhaAtual, novaSenha } = alterarSenhaSchema.parse(req.body);
  await alterarSenha({ usuarioId: req.usuario!.id, senhaAtual, novaSenha });
  res.json({ mensagem: "Senha alterada com sucesso." });
}

export async function atualizarPerfilController(req: Request, res: Response) {
  const dados = atualizarPerfilSchema.parse(req.body);
  const usuario = await atualizarPerfil({ usuarioId: req.usuario!.id, ...dados });
  res.json(usuario);
}

export async function perfilController(req: Request, res: Response) {
  const perfil = await buscarPerfil(req.usuario!.id);
  res.json(perfil);
}
