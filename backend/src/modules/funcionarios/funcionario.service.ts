import bcrypt from "bcryptjs";
import { PapelUsuario } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

export interface CriarFuncionarioInput {
  nome: string;
  email: string;
  senha: string;
  cargo: string;
  salarioAtual: number;
  dataAdmissao: string; // ISO date
  especialidades?: string[];
}

export function listarFuncionarios() {
  return prisma.funcionario.findMany({
    where: { ativo: true },
    include: { usuario: { select: { nome: true, email: true } } },
    orderBy: { criadoEm: "desc" },
  });
}

export async function buscarFuncionarioPorId(id: string) {
  const funcionario = await prisma.funcionario.findUnique({
    where: { id },
    include: { usuario: { select: { nome: true, email: true } } },
  });
  if (!funcionario) throw new AppError("Funcionário não encontrado.", 404);
  return funcionario;
}

/**
 * Resolve o perfil de técnico a partir do id do USUÁRIO logado (vindo do
 * token JWT). É assim que o backend descobre "quem é o técnico" sem
 * precisar confiar em um funcionarioId enviado pelo cliente — importante
 * pra um técnico só conseguir pedir aumento (ou ver o próprio desempenho)
 * para si mesmo, nunca para outra pessoa.
 */
export async function buscarFuncionarioPorUsuarioId(usuarioId: string) {
  const funcionario = await prisma.funcionario.findUnique({
    where: { usuarioId },
    include: { usuario: { select: { nome: true, email: true } } },
  });
  if (!funcionario) {
    throw new AppError("Nenhum perfil de técnico associado a este usuário.", 404);
  }
  return funcionario;
}

export async function criarFuncionario(dados: CriarFuncionarioInput) {
  const senhaHash = await bcrypt.hash(dados.senha, 10);

  return prisma.usuario.create({
    data: {
      nome: dados.nome,
      email: dados.email,
      senhaHash,
      papel: PapelUsuario.TECNICO,
      funcionario: {
        create: {
          cargo: dados.cargo,
          salarioAtual: dados.salarioAtual,
          dataAdmissao: new Date(dados.dataAdmissao),
          especialidades: dados.especialidades ?? [],
        },
      },
    },
    include: { funcionario: true },
  });
}

export async function atualizarSalario(id: string, novoSalario: number) {
  await buscarFuncionarioPorId(id);
  return prisma.funcionario.update({
    where: { id },
    data: { salarioAtual: novoSalario },
  });
}

export interface ConfigComissaoInput {
  tipoComissao: "PERCENTUAL" | "FIXO" | null;
  valorComissao: number | null;
}

/**
 * Define como o técnico é comissionado — percentual sobre a mão de obra,
 * valor fixo por atendimento, ou nenhuma comissão (só salário). Passar
 * tipoComissao null remove a comissão do técnico.
 */
export async function atualizarComissao(id: string, dados: ConfigComissaoInput) {
  await buscarFuncionarioPorId(id);
  return prisma.funcionario.update({
    where: { id },
    data: { tipoComissao: dados.tipoComissao, valorComissao: dados.valorComissao },
  });
}
