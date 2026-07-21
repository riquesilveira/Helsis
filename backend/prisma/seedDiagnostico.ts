/**
 * Popula o catálogo de diagnóstico codificado (Causa / Defeito / Solução) com
 * um conjunto inicial voltado a equipamentos de diagnóstico por imagem
 * (ressonância, tomografia, etc). Idempotente — usa o código como chave, então
 * pode rodar quantas vezes precisar sem duplicar.
 * Uso: npx ts-node prisma/seedDiagnostico.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CAUSAS = [
  { codigo: "C-01", descricao: "Desgaste natural do componente" },
  { codigo: "C-02", descricao: "Falha elétrica / oscilação da rede" },
  { codigo: "C-03", descricao: "Uso incorreto pelo operador" },
  { codigo: "C-04", descricao: "Falta de manutenção preventiva" },
  { codigo: "C-05", descricao: "Falha no sistema de refrigeração" },
  { codigo: "C-06", descricao: "Contaminação / sujeira acumulada" },
  { codigo: "C-07", descricao: "Defeito de fabricação" },
];

const DEFEITOS = [
  { codigo: "D-01", descricao: "Superaquecimento do sistema", tempoEstimadoMin: 120 },
  { codigo: "D-02", descricao: "Falha na bobina de RF", tempoEstimadoMin: 240 },
  { codigo: "D-03", descricao: "Nível de hélio baixo / perda de hélio", tempoEstimadoMin: 180 },
  { codigo: "D-04", descricao: "Erro de calibração de imagem", tempoEstimadoMin: 90 },
  { codigo: "D-05", descricao: "Falha na fonte de alimentação", tempoEstimadoMin: 120 },
  { codigo: "D-06", descricao: "Compressor do chiller inoperante", tempoEstimadoMin: 180 },
  { codigo: "D-07", descricao: "Falha de comunicação do console", tempoEstimadoMin: 60 },
  { codigo: "D-08", descricao: "Ruído / artefato na imagem", tempoEstimadoMin: 90 },
];

const SOLUCOES = [
  { codigo: "S-01", descricao: "Substituição de componente", tempoEstimadoMin: 120 },
  { codigo: "S-02", descricao: "Recalibração do sistema", tempoEstimadoMin: 60 },
  { codigo: "S-03", descricao: "Reposição de hélio", tempoEstimadoMin: 120 },
  { codigo: "S-04", descricao: "Limpeza e higienização", tempoEstimadoMin: 45 },
  { codigo: "S-05", descricao: "Atualização / reinstalação de firmware", tempoEstimadoMin: 90 },
  { codigo: "S-06", descricao: "Ajuste e reaperto de conexões", tempoEstimadoMin: 30 },
  { codigo: "S-07", descricao: "Reparo da fonte de alimentação", tempoEstimadoMin: 120 },
  { codigo: "S-08", descricao: "Reinício e teste funcional", tempoEstimadoMin: 30 },
];

async function main() {
  for (const c of CAUSAS) {
    await prisma.causa.upsert({ where: { codigo: c.codigo }, update: { descricao: c.descricao }, create: c });
  }
  for (const d of DEFEITOS) {
    await prisma.defeito.upsert({ where: { codigo: d.codigo }, update: d, create: d });
  }
  for (const s of SOLUCOES) {
    await prisma.solucao.upsert({ where: { codigo: s.codigo }, update: s, create: s });
  }
  console.log(
    `Diagnóstico codificado: ${CAUSAS.length} causas, ${DEFEITOS.length} defeitos, ${SOLUCOES.length} soluções sincronizados.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
