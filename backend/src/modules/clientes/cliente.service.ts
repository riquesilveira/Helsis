import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

export interface ClienteInput {
  nome: string;
  documento?: string;
  telefone: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
}

export function listarClientes() {
  return prisma.cliente.findMany({
    orderBy: { nome: "asc" },
    include: { equipamentos: true },
  });
}

export async function buscarClientePorId(id: string) {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: { equipamentos: true, ordensServico: true },
  });

  if (!cliente) throw new AppError("Cliente não encontrado.", 404);
  return cliente;
}

export function criarCliente(dados: ClienteInput) {
  return prisma.cliente.create({ data: dados });
}

export async function atualizarCliente(id: string, dados: Partial<ClienteInput>) {
  await buscarClientePorId(id); // garante que existe (ou lança 404)
  return prisma.cliente.update({ where: { id }, data: dados });
}

export async function removerCliente(id: string) {
  const cliente = await buscarClientePorId(id);

  // Não há cascade no schema: bloqueia com mensagem clara em vez de deixar
  // estourar erro de FK quando o cliente ainda tem vínculos.
  if (cliente.ordensServico.length > 0) {
    throw new AppError(
      "Não é possível excluir um cliente com ordens de serviço vinculadas.",
      409
    );
  }
  if (cliente.equipamentos.length > 0) {
    throw new AppError(
      "Não é possível excluir um cliente com equipamentos cadastrados. Remova os equipamentos antes.",
      409
    );
  }

  return prisma.cliente.delete({ where: { id } });
}
