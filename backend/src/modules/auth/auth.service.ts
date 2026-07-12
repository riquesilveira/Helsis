import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

interface LoginInput {
  email: string;
  senha: string;
}

interface AlterarSenhaInput {
  usuarioId: string;
  senhaAtual: string;
  novaSenha: string;
}

interface AtualizarPerfilInput {
  usuarioId: string;
  nome?: string;
  email?: string;
}

export async function alterarSenha({ usuarioId, senhaAtual, novaSenha }: AlterarSenhaInput) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw new AppError("Usuário não encontrado.", 404);

  const senhaConfere = await bcrypt.compare(senhaAtual, usuario.senhaHash);
  if (!senhaConfere) throw new AppError("Senha atual incorreta.", 400);

  const novoHash = await bcrypt.hash(novaSenha, 10);
  await prisma.usuario.update({ where: { id: usuarioId }, data: { senhaHash: novoHash } });
}

export async function atualizarPerfil({ usuarioId, nome, email }: AtualizarPerfilInput) {
  const data: Record<string, string> = {};
  if (nome) data.nome = nome;
  if (email) {
    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente && existente.id !== usuarioId) {
      throw new AppError("Este e-mail já está em uso.", 400);
    }
    data.email = email;
  }

  const usuario = await prisma.usuario.update({
    where: { id: usuarioId },
    data,
    select: { id: true, nome: true, email: true, papel: true },
  });
  return usuario;
}

export async function buscarPerfil(usuarioId: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, nome: true, email: true, papel: true, criadoEm: true },
  });
  if (!usuario) throw new AppError("Usuário não encontrado.", 404);
  return usuario;
}

export async function login({ email, senha }: LoginInput) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario || !usuario.ativo) {
    throw new AppError("E-mail ou senha inválidos.", 401);
  }

  const senhaConfere = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaConfere) {
    throw new AppError("E-mail ou senha inválidos.", 401);
  }

  const opcoesToken: jwt.SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"],
  };

  const token = jwt.sign(
    { id: usuario.id, papel: usuario.papel },
    process.env.JWT_SECRET as string,
    opcoesToken
  );

  return {
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
  };
}
