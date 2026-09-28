/**
 * Seed OPCIONAL de DEMONSTRAÇÃO — cria execuções de tarefas cronometradas já
 * concluídas (com durações variadas por técnico) para que a tela "Comparativo
 * de produtividade" e o histórico do funcionário apareçam preenchidos sem
 * precisar registrar tudo à mão.
 *
 * ⚠️ Isto insere dados FICTÍCIOS de tempo. Rode só num ambiente de demo/teste.
 * Para limpar depois: `DELETE FROM tarefas_os;` (ou o comando abaixo com --reset).
 *
 * Uso:   npx ts-node prisma/seedTarefasExecucoes.ts
 * Limpar: npx ts-node prisma/seedTarefasExecucoes.ts --reset
 */
import { PrismaClient, StatusTarefa } from "@prisma/client";

const prisma = new PrismaClient();

// Fatores de velocidade por técnico (1.0 = no tempo estimado; <1 mais rápido).
// Índices batem com a ordem dos técnicos encontrados.
const PERFIS = [0.8, 1.0, 1.25];

async function main() {
  const reset = process.argv.includes("--reset");
  if (reset) {
    const { count } = await prisma.tarefaOS.deleteMany({});
    console.log(`Removidas ${count} execuções de tarefas.`);
    return;
  }

  const tecnicos = await prisma.funcionario.findMany({
    where: { ativo: true, usuario: { papel: "TECNICO" } },
    include: { usuario: { select: { nome: true } } },
    orderBy: { criadoEm: "asc" },
  });
  const tarefas = await prisma.tarefaCatalogo.findMany({
    where: { ativo: true, tempoEstimadoMin: { not: null } },
    orderBy: { codigo: "asc" },
  });
  // Precisa de ao menos uma OS pra pendurar as execuções (o vínculo é
  // obrigatório). Usa qualquer OS concluída de cada técnico como âncora.
  const oss = await prisma.ordemServico.findMany({
    where: { funcionarioId: { not: null } },
    select: { id: true, funcionarioId: true },
  });

  if (tecnicos.length === 0 || tarefas.length === 0 || oss.length === 0) {
    console.log("Sem técnicos, tarefas ou OS suficientes para semear execuções.");
    return;
  }

  const osPorTecnico = new Map<string, string>();
  for (const os of oss) if (os.funcionarioId) osPorTecnico.set(os.funcionarioId, os.id);

  let criadas = 0;
  for (let t = 0; t < tecnicos.length; t++) {
    const tecnico = tecnicos[t];
    const fator = PERFIS[t % PERFIS.length];
    const osId = osPorTecnico.get(tecnico.id);
    if (!osId) continue;

    // Cada técnico executa ~6 tarefas, 2 a 3 execuções de cada, com leve variação.
    for (const tarefa of tarefas.slice(0, 6)) {
      const baseSeg = (tarefa.tempoEstimadoMin as number) * 60 * fator;
      const execucoes = 2 + ((t + tarefa.codigo.length) % 2); // 2 ou 3
      for (let i = 0; i < execucoes; i++) {
        // Variação determinística de ±12% (sem Math.random pra ser reprodutível).
        const variacao = 1 + ((i % 3) - 1) * 0.12;
        const dur = Math.max(30, Math.round(baseSeg * variacao));
        const fim = new Date(Date.now() - (t * 3 + i) * 24 * 60 * 60 * 1000);
        const inicio = new Date(fim.getTime() - dur * 1000);
        await prisma.tarefaOS.create({
          data: {
            ordemServicoId: osId,
            tarefaCatalogoId: tarefa.id,
            funcionarioId: tecnico.id,
            status: StatusTarefa.CONCLUIDA,
            iniciadoEm: inicio,
            finalizadoEm: fim,
            duracaoSegundos: dur,
          },
        });
        criadas++;
      }
    }
  }

  console.log(`Execuções de demonstração criadas: ${criadas} (para ${tecnicos.length} técnicos).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
