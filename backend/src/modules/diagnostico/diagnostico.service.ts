import { prisma } from "../../lib/prisma";

// Catálogo de diagnóstico codificado: Causa / Defeito / Solução. São tabelas
// de códigos padronizados que o técnico escolhe no fechamento do chamado, em
// vez de descrever tudo em texto livre. Defeito e Solução carregam um tempo
// estimado (em minutos) para permitir medir/planejar o tempo de atendimento.

export interface CausaInput {
  codigo: string;
  descricao: string;
}

export interface DefeitoInput {
  codigo: string;
  descricao: string;
  tempoEstimadoMin?: number;
}

export interface SolucaoInput {
  codigo: string;
  descricao: string;
  tempoEstimadoMin?: number;
}

// ---- Causa ----------------------------------------------------------------

export function listarCausas() {
  return prisma.causa.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" } });
}

export function criarCausa(dados: CausaInput) {
  return prisma.causa.create({ data: dados });
}

// ---- Defeito --------------------------------------------------------------

export function listarDefeitos() {
  return prisma.defeito.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" } });
}

export function criarDefeito(dados: DefeitoInput) {
  return prisma.defeito.create({ data: dados });
}

// ---- Solução --------------------------------------------------------------

export function listarSolucoes() {
  return prisma.solucao.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" } });
}

export function criarSolucao(dados: SolucaoInput) {
  return prisma.solucao.create({ data: dados });
}
