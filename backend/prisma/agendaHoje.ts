import { PrismaClient, ModalidadeAtendimento, StatusOS } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Script idempotente e NÃO destrutivo: garante que todo técnico tenha pelo
 * menos 2 atendimentos abertos agendados pra hoje, pra que o painel
 * "Agenda de hoje, por técnico" mostre todos com afazeres. Não apaga nada —
 * só cria as OS que estiverem faltando.
 */

const ALVO_POR_TECNICO = 2;
const STATUS_ABERTOS: StatusOS[] = [StatusOS.RECEBIDO, StatusOS.DIAGNOSTICO, StatusOS.EM_REPARO];

const PROBLEMAS = [
  "Equipamento não gera imagem com qualidade adequada.",
  "Alerta de calibração recorrente durante os exames.",
  "Ruído anormal no sistema de refrigeração.",
  "Falha intermitente ao iniciar o exame.",
  "Componente com desgaste identificado na última visita.",
];

function hojeAs(hora: number): Date {
  const d = new Date();
  d.setHours(hora, 0, 0, 0);
  return d;
}

async function main() {
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const fimHoje = new Date(inicioHoje);
  fimHoje.setDate(fimHoje.getDate() + 1);

  const funcionarios = await prisma.funcionario.findMany({ include: { usuario: true } });
  const equipamentos = await prisma.equipamento.findMany();

  if (equipamentos.length === 0) {
    console.log("Nenhum equipamento cadastrado — nada a fazer.");
    return;
  }

  let criadas = 0;

  for (let i = 0; i < funcionarios.length; i++) {
    const f = funcionarios[i];

    const jaAgendadasHoje = await prisma.ordemServico.count({
      where: {
        funcionarioId: f.id,
        statusAtual: { in: STATUS_ABERTOS },
        dataAgendada: { gte: inicioHoje, lt: fimHoje },
      },
    });

    const faltam = ALVO_POR_TECNICO - jaAgendadasHoje;
    if (faltam <= 0) {
      console.log(`• ${f.usuario.nome}: já tem ${jaAgendadasHoje} hoje — ok.`);
      continue;
    }

    for (let j = 0; j < faltam; j++) {
      const eq = equipamentos[(i + j) % equipamentos.length];
      await prisma.ordemServico.create({
        data: {
          clienteId: eq.clienteId,
          equipamentoId: eq.id,
          funcionarioId: f.id,
          modalidade: ModalidadeAtendimento.VISITA_TECNICA,
          statusAtual: STATUS_ABERTOS[(i + j) % STATUS_ABERTOS.length],
          descricaoProblema: PROBLEMAS[(i + j) % PROBLEMAS.length],
          numeroTentativas: 0,
          dataAgendada: hojeAs(8 + jaAgendadasHoje + j * 3),
          statusHistoricos: {
            create: [{ status: StatusOS.RECEBIDO, tentativaNumero: 1, observacao: "Chamado aberto." }],
          },
        },
      });
      criadas++;
    }
    console.log(`• ${f.usuario.nome}: +${faltam} agendada(s) pra hoje.`);
  }

  console.log(`\nConcluído. ${criadas} OS criada(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
