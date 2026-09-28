/**
 * Popula o catálogo de tarefas cronometráveis com um conjunto inicial voltado a
 * equipamentos de diagnóstico por imagem. São as tarefas nomeadas que o técnico
 * executa dentro de uma OS e que têm o tempo medido automaticamente, permitindo
 * ao dono comparar colaboradores na MESMA tarefa. Idempotente — usa o código
 * como chave, então pode rodar quantas vezes precisar sem duplicar.
 * Uso: npx ts-node prisma/seedTarefas.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TAREFAS = [
  { codigo: "T-01", descricao: "Trocar bobina de RF", tempoEstimadoMin: 90 },
  { codigo: "T-02", descricao: "Calibrar sistema de imagem", tempoEstimadoMin: 60 },
  { codigo: "T-03", descricao: "Reposição de hélio", tempoEstimadoMin: 120 },
  { codigo: "T-04", descricao: "Substituir fonte de alimentação", tempoEstimadoMin: 75 },
  { codigo: "T-05", descricao: "Limpeza e higienização do equipamento", tempoEstimadoMin: 40 },
  { codigo: "T-06", descricao: "Reaperto e ajuste de conexões", tempoEstimadoMin: 25 },
  { codigo: "T-07", descricao: "Atualizar firmware do console", tempoEstimadoMin: 50 },
  { codigo: "T-08", descricao: "Reparo do chiller / refrigeração", tempoEstimadoMin: 100 },
  { codigo: "T-09", descricao: "Teste funcional e validação final", tempoEstimadoMin: 30 },
  { codigo: "T-10", descricao: "Diagnóstico inicial no local", tempoEstimadoMin: 45 },
];

async function main() {
  for (const t of TAREFAS) {
    await prisma.tarefaCatalogo.upsert({
      where: { codigo: t.codigo },
      update: { descricao: t.descricao, tempoEstimadoMin: t.tempoEstimadoMin },
      create: t,
    });
  }
  console.log(`Catálogo de tarefas: ${TAREFAS.length} tarefas sincronizadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
