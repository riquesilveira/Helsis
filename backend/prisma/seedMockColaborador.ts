/**
 * Popula dados de DEMONSTRAÇÃO para a conta de colaborador de teste
 * (colaborador.teste@resso.tec.br): ordens de serviço atribuídas a ele, com
 * timeline de status e tarefas cronometradas, pra a "Minha rota" e a lista de
 * OS aparecerem cheias ao logar como o técnico.
 *
 * Uso:    npx ts-node prisma/seedMockColaborador.ts
 * Limpar: npx ts-node prisma/seedMockColaborador.ts --reset
 */
import {
  PrismaClient,
  StatusOS,
  ModalidadeAtendimento,
  StatusTarefa,
} from "@prisma/client";

const prisma = new PrismaClient();
const EMAIL = "colaborador.teste@resso.tec.br";

const hojeAs = (h: number) => {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d;
};
const atras = (ms: number) => new Date(Date.now() - ms);
const H = 3600_000;
const DIA = 24 * H;

type DefTarefa = { cat: number; status: StatusTarefa; durSeg?: number };
type DefOS = {
  status: StatusOS;
  problema: string;
  agendaHora?: number; // agendada pra hoje nesse horário
  diasAtras?: number; // OS concluída no passado
  historico: StatusOS[];
  tarefas: DefTarefa[];
};

const DEFS: DefOS[] = [
  {
    status: StatusOS.EM_REPARO,
    problema: "Ressonância com artefato de imagem intermitente após a última manutenção.",
    agendaHora: 8,
    historico: [StatusOS.RECEBIDO, StatusOS.DIAGNOSTICO, StatusOS.EM_REPARO],
    tarefas: [
      { cat: 1, status: StatusTarefa.CONCLUIDA, durSeg: 2480 },
      { cat: 0, status: StatusTarefa.EM_ANDAMENTO },
    ],
  },
  {
    status: StatusOS.RECEBIDO,
    problema: "Tomógrafo travando durante a inicialização do console.",
    agendaHora: 10,
    historico: [StatusOS.RECEBIDO],
    tarefas: [{ cat: 9, status: StatusTarefa.CONCLUIDA, durSeg: 2650 }],
  },
  {
    status: StatusOS.RECEBIDO,
    problema: "Transdutor do ultrassom com falha de imagem em determinados ângulos.",
    agendaHora: 14,
    historico: [StatusOS.RECEBIDO],
    tarefas: [],
  },
  {
    status: StatusOS.AGUARDANDO_PECA,
    problema: "Fonte de alta tensão do raio-X apresentando instabilidade.",
    historico: [StatusOS.RECEBIDO, StatusOS.DIAGNOSTICO, StatusOS.AGUARDANDO_PECA],
    tarefas: [{ cat: 9, status: StatusTarefa.CONCLUIDA, durSeg: 2100 }],
  },
  {
    status: StatusOS.EM_REPARO,
    problema: "Mamógrafo com alerta de calibração do detector digital.",
    agendaHora: 16,
    historico: [StatusOS.RECEBIDO, StatusOS.EM_REPARO],
    tarefas: [
      { cat: 4, status: StatusTarefa.CONCLUIDA, durSeg: 2300 },
      { cat: 8, status: StatusTarefa.EM_ANDAMENTO },
    ],
  },
  {
    status: StatusOS.CONCLUIDO,
    problema: "Substituição da bobina de RF e recalibração — concluído.",
    diasAtras: 3,
    historico: [
      StatusOS.RECEBIDO,
      StatusOS.DIAGNOSTICO,
      StatusOS.EM_REPARO,
      StatusOS.CONCLUIDO,
    ],
    tarefas: [
      { cat: 0, status: StatusTarefa.CONCLUIDA, durSeg: 5200 },
      { cat: 1, status: StatusTarefa.CONCLUIDA, durSeg: 3300 },
      { cat: 8, status: StatusTarefa.CONCLUIDA, durSeg: 1450 },
    ],
  },
  {
    status: StatusOS.CONCLUIDO,
    problema: "Manutenção preventiva semestral do tomógrafo.",
    diasAtras: 9,
    historico: [
      StatusOS.RECEBIDO,
      StatusOS.DIAGNOSTICO,
      StatusOS.EM_REPARO,
      StatusOS.CONCLUIDO,
    ],
    tarefas: [{ cat: 9, status: StatusTarefa.CONCLUIDA, durSeg: 2700 }],
  },
];

async function main() {
  const usuario = await prisma.usuario.findUnique({
    where: { email: EMAIL },
    include: { funcionario: true },
  });
  if (!usuario?.funcionario) {
    console.log(`Colaborador de teste (${EMAIL}) não encontrado.`);
    return;
  }
  const fid = usuario.funcionario.id;

  if (process.argv.includes("--reset")) {
    const oss = await prisma.ordemServico.findMany({
      where: { funcionarioId: fid },
      select: { id: true },
    });
    const ids = oss.map((o) => o.id);
    await prisma.tarefaOS.deleteMany({ where: { ordemServicoId: { in: ids } } });
    await prisma.statusHistorico.deleteMany({ where: { ordemServicoId: { in: ids } } });
    await prisma.pecaTrocada.deleteMany({ where: { ordemServicoId: { in: ids } } });
    await prisma.deslocamento.deleteMany({ where: { ordemServicoId: { in: ids } } });
    await prisma.notificacao.deleteMany({ where: { ordemServicoId: { in: ids } } });
    await prisma.anexo.deleteMany({ where: { ordemServicoId: { in: ids } } });
    await prisma.ordemServico.deleteMany({ where: { funcionarioId: fid } });
    console.log(`Removidas ${ids.length} OS de demonstração do colaborador.`);
    return;
  }

  const clientes = await prisma.cliente.findMany({ include: { equipamentos: true } });
  const comEquip = clientes.filter((c) => c.equipamentos.length > 0);
  if (comEquip.length === 0) {
    console.log("Nenhum cliente com equipamento cadastrado para vincular as OS.");
    return;
  }
  const tarefas = await prisma.tarefaCatalogo.findMany({
    where: { ativo: true },
    orderBy: { codigo: "asc" },
  });

  let criadas = 0;
  for (let i = 0; i < DEFS.length; i++) {
    const def = DEFS[i];
    const alvo = comEquip[i % comEquip.length];
    const equip = alvo.equipamentos[0];

    // Base temporal: hoje (para agendadas/abertas) ou N dias atrás (concluídas).
    const base = def.diasAtras != null ? atras(def.diasAtras * DIA) : atras(3 * H);
    const passo = (2 * H) / Math.max(1, def.historico.length - 1);

    const os = await prisma.ordemServico.create({
      data: {
        clienteId: alvo.id,
        equipamentoId: equip.id,
        funcionarioId: fid,
        modalidade: ModalidadeAtendimento.VISITA_TECNICA,
        statusAtual: def.status,
        descricaoProblema: def.problema,
        numeroTentativas: 0,
        dataAgendada: def.agendaHora != null ? hojeAs(def.agendaHora) : null,
        dataConclusao: def.status === StatusOS.CONCLUIDO ? base : null,
        resolvidoNaPrimeira: def.status === StatusOS.CONCLUIDO ? true : null,
        criadoEm: new Date(base.getTime() - 2 * H),
        statusHistoricos: {
          create: def.historico.map((st, idx) => ({
            status: st,
            tentativaNumero: 1,
            funcionarioId: fid,
            observacao:
              st === StatusOS.RECEBIDO
                ? "Chamado aberto."
                : st === StatusOS.DIAGNOSTICO
                  ? "Avaliação técnica iniciada."
                  : st === StatusOS.EM_REPARO
                    ? "Reparo em execução."
                    : st === StatusOS.AGUARDANDO_PECA
                      ? "Peça solicitada — aguardando chegada."
                      : st === StatusOS.AGUARDANDO_VALIDACAO
                        ? "Fechamento parcial — aguardando validação do suporte."
                        : "Atendimento concluído.",
            criadoEm: new Date(base.getTime() - 2 * H + idx * passo),
          })),
        },
      },
    });

    for (let t = 0; t < def.tarefas.length; t++) {
      const dt = def.tarefas[t];
      const tarefa = tarefas[dt.cat % tarefas.length];
      if (!tarefa) continue;
      const concluida = dt.status === StatusTarefa.CONCLUIDA;
      const emAndamento = dt.status === StatusTarefa.EM_ANDAMENTO;
      const fim = new Date(base.getTime() - t * 30 * 60_000);
      const inicio = concluida
        ? new Date(fim.getTime() - (dt.durSeg ?? 1800) * 1000)
        : emAndamento
          ? atras(40 * 60_000)
          : null;
      await prisma.tarefaOS.create({
        data: {
          ordemServicoId: os.id,
          tarefaCatalogoId: tarefa.id,
          funcionarioId: concluida || emAndamento ? fid : null,
          status: dt.status,
          iniciadoEm: inicio,
          finalizadoEm: concluida ? fim : null,
          duracaoSegundos: concluida ? dt.durSeg ?? 1800 : null,
        },
      });
    }
    criadas++;
  }

  console.log(`Mocks do colaborador: ${criadas} OS criadas (com timeline e tarefas).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
