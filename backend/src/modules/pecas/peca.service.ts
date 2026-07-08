import { prisma } from "../../lib/prisma";

export interface PecaCatalogoInput {
  nome: string;
  categoria?: string;
  garantiaPadraoMeses?: number;
  precoUnitario?: number;
}

export function listarPecas() {
  return prisma.pecaCatalogo.findMany({ orderBy: { nome: "asc" } });
}

export function criarPeca(dados: PecaCatalogoInput) {
  return prisma.pecaCatalogo.create({ data: dados });
}
