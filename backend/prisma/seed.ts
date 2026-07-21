import { PrismaClient, PapelUsuario, ModalidadeAtendimento, StatusOS, TipoOS } from "@prisma/client";
import bcrypt from "bcryptjs";
import { EQUIPAMENTOS_CATALOGO } from "./equipamentosCatalogo";

const prisma = new PrismaClient();

/**
 * Cria uma OS já concluída no passado, com peça e/ou deslocamento
 * opcionais. Existe só pra reduzir repetição no seed — o volume de
 * exemplos é o que dá densidade real ao gráfico de faturamento e ao
 * painel de despesas por tipo.
 */
async function criarOSFechada(input: {
  clienteId: string;
  equipamentoId: string;
  funcionarioId: string;
  tipo: "CORRETIVA" | "PREVENTIVA";
  descricaoProblema: string;
  diasAtras: number;
  valorMaoDeObra: number;
  valorComissao: number;
  peca?: { pecaCatalogoId: string; precoUnitario: number; tipoServico?: string };
  deslocamento?: {
    origem: string;
    destino: string;
    passagem: number;
    hospedagem?: number;
    alimentacao?: number;
  };
}) {
  const data = new Date(Date.now() - input.diasAtras * 24 * 60 * 60 * 1000);

  const historicos = [
    { status: StatusOS.RECEBIDO, tentativaNumero: 1, observacao: "Chamado aberto.", criadoEm: data },
    { status: StatusOS.DIAGNOSTICO, tentativaNumero: 1, observacao: "Técnico avaliou no local.", criadoEm: data },
    { status: StatusOS.EM_REPARO, tentativaNumero: 1, observacao: "Atendimento em execução.", criadoEm: data },
    { status: StatusOS.CONCLUIDO, tentativaNumero: 1, observacao: "Atendimento concluído.", criadoEm: data },
  ];

  const os = await prisma.ordemServico.create({
    data: {
      clienteId: input.clienteId,
      equipamentoId: input.equipamentoId,
      funcionarioId: input.funcionarioId,
      tipo: input.tipo as TipoOS,
      modalidade: ModalidadeAtendimento.VISITA_TECNICA,
      statusAtual: StatusOS.CONCLUIDO,
      descricaoProblema: input.descricaoProblema,
      numeroTentativas: 0,
      resolvidoNaPrimeira: true,
      dataConclusao: data,
      valorMaoDeObra: input.valorMaoDeObra,
      valorComissao: input.valorComissao,
      criadoEm: data,
      statusHistoricos: { create: historicos },
    },
  });

  if (input.peca) {
    await prisma.pecaTrocada.create({
      data: {
        ordemServicoId: os.id,
        pecaCatalogoId: input.peca.pecaCatalogoId,
        funcionarioId: input.funcionarioId,
        tipoServico: input.peca.tipoServico ?? "Substituição",
        tentativaNumero: 1,
        resolveuProblema: true,
        precoUnitario: input.peca.precoUnitario,
        dataTroca: data,
      },
    });
  }

  if (input.deslocamento) {
    await prisma.deslocamento.create({
      data: {
        funcionarioId: input.funcionarioId,
        ordemServicoId: os.id,
        origemCidade: input.deslocamento.origem,
        destinoCidade: input.deslocamento.destino,
        custoPassagem: input.deslocamento.passagem,
        custoHospedagem: input.deslocamento.hospedagem ?? null,
        custoAlimentacao: input.deslocamento.alimentacao ?? null,
        diasViagem: input.deslocamento.hospedagem ? 2 : 1,
        criadoEm: data,
      },
    });
  }

  return os;
}

async function main() {
  // ------------------------------------------------------------------
  // Catálogo de referência de equipamentos (tipo/marca/modelo) — sempre
  // roda, mesmo em bancos já existentes, e é idempotente (upsert).
  // ------------------------------------------------------------------
  for (const item of EQUIPAMENTOS_CATALOGO) {
    await prisma.equipamentoCatalogo.upsert({
      where: { tipo_marca_modelo: item },
      update: {},
      create: item,
    });
  }
  console.log(`Catálogo de equipamentos: ${EQUIPAMENTOS_CATALOGO.length} itens.`);

  const senhaHash = await bcrypt.hash("123456", 10);

  // ------------------------------------------------------------------
  // DONO
  // ------------------------------------------------------------------
  const dono = await prisma.usuario.create({
    data: { nome: "Marcos Dono", email: "dono@empresa.com", senhaHash, papel: PapelUsuario.DONO },
  });

  // ------------------------------------------------------------------
  // TÉCNICOS (3 — cada um com uma configuração de comissão diferente)
  // ------------------------------------------------------------------
  const joao = await prisma.usuario.create({
    data: {
      nome: "João Gomes",
      email: "joao@empresa.com",
      senhaHash,
      papel: PapelUsuario.TECNICO,
      funcionario: {
        create: {
          cargo: "Técnico",
          salarioAtual: 3500,
          dataAdmissao: new Date("2023-01-10"),
          especialidades: ["Ressonância Magnética", "Tomografia Computadorizada"],
          tipoComissao: "PERCENTUAL",
          valorComissao: 15,
        },
      },
    },
    include: { funcionario: true },
  });

  const marina = await prisma.usuario.create({
    data: {
      nome: "Marina Alves",
      email: "marina@empresa.com",
      senhaHash,
      papel: PapelUsuario.TECNICO,
      funcionario: {
        create: {
          cargo: "Técnica Pleno",
          salarioAtual: 3200,
          dataAdmissao: new Date("2023-06-01"),
          especialidades: ["Tomografia Computadorizada", "Raio-X"],
          tipoComissao: "FIXO",
          valorComissao: 80,
        },
      },
    },
    include: { funcionario: true },
  });

  const carlos = await prisma.usuario.create({
    data: {
      nome: "Carlos Eduardo",
      email: "carlos@empresa.com",
      senhaHash,
      papel: PapelUsuario.TECNICO,
      funcionario: {
        create: {
          cargo: "Técnico Sênior",
          salarioAtual: 4200,
          dataAdmissao: new Date("2022-03-15"),
          especialidades: ["Mamografia", "Ultrassom", "Ressonância Magnética"],
          tipoComissao: "PERCENTUAL",
          valorComissao: 20,
        },
      },
    },
    include: { funcionario: true },
  });

  // ------------------------------------------------------------------
  // CLIENTES (4)
  // ------------------------------------------------------------------
  const hospitalCentral = await prisma.cliente.create({
    data: {
      nome: "Hospital Central",
      telefone: "(71) 99999-0000",
      email: "contato@hospitalcentral.com",
      cidade: "Salvador",
      estado: "BA",
    },
  });

  const clinicaSaoLucas = await prisma.cliente.create({
    data: {
      nome: "Clínica São Lucas — Diagnóstico por Imagem",
      telefone: "(41) 98888-1234",
      email: "contato@clinicasaolucas.com",
      cidade: "Curitiba",
      estado: "PR",
    },
  });

  const institutoSantaFe = await prisma.cliente.create({
    data: {
      nome: "Instituto de Radiologia Santa Fé",
      telefone: "(11) 97777-5678",
      email: "contato@institutosantafe.com",
      cidade: "São Paulo",
      estado: "SP",
    },
  });

  const hospitalRegional = await prisma.cliente.create({
    data: {
      nome: "Hospital Regional do Vale",
      telefone: "(31) 96666-4321",
      email: "contato@hospitalregional.com",
      cidade: "Belo Horizonte",
      estado: "MG",
    },
  });

  // ------------------------------------------------------------------
  // EQUIPAMENTOS (5)
  // ------------------------------------------------------------------
  const ressonancia = await prisma.equipamento.create({
    data: {
      clienteId: hospitalCentral.id,
      tipo: "Ressonância Magnética 1.5T",
      marca: "Siemens",
      modelo: "Magnetom Essenza",
      numeroSerie: "SN-123456",
      localInstalacao: "Ala B, 2º andar",
      frequenciaManutencaoMeses: 6,
      ultimaManutencaoPreventiva: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      proximaManutencaoPreventiva: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  const tomografo = await prisma.equipamento.create({
    data: {
      clienteId: clinicaSaoLucas.id,
      tipo: "Tomógrafo 64 canais",
      marca: "GE Healthcare",
      modelo: "Revolution EVO",
      numeroSerie: "SN-987654",
      localInstalacao: "Térreo, sala 3",
      frequenciaManutencaoMeses: 12,
      ultimaManutencaoPreventiva: new Date(Date.now() - 335 * 24 * 60 * 60 * 1000),
      proximaManutencaoPreventiva: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    },
  });

  const mamografo = await prisma.equipamento.create({
    data: {
      clienteId: institutoSantaFe.id,
      tipo: "Mamógrafo Digital",
      marca: "Hologic",
      modelo: "3Dimensions",
      numeroSerie: "SN-445566",
      localInstalacao: "1º andar, sala 2",
      frequenciaManutencaoMeses: 6,
      ultimaManutencaoPreventiva: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
      proximaManutencaoPreventiva: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const raioX = await prisma.equipamento.create({
    data: {
      clienteId: institutoSantaFe.id,
      tipo: "Raio-X Digital",
      marca: "Philips",
      modelo: "DigitalDiagnost C90",
      numeroSerie: "SN-778899",
      localInstalacao: "Térreo, sala 1",
      frequenciaManutencaoMeses: 12,
    },
  });

  const ultrassom = await prisma.equipamento.create({
    data: {
      clienteId: hospitalRegional.id,
      tipo: "Ultrassom Doppler",
      marca: "Samsung",
      modelo: "HERA W10",
      numeroSerie: "SN-112233",
      localInstalacao: "Ala de diagnóstico",
      // sem frequência definida — esse equipamento só tem manutenção corretiva
    },
  });

  // ------------------------------------------------------------------
  // CATÁLOGO DE PEÇAS (5)
  // ------------------------------------------------------------------
  const bobina = await prisma.pecaCatalogo.create({
    data: { nome: "Bobina de gradiente", categoria: "Ressonância", garantiaPadraoMeses: 6, precoUnitario: 2200 },
  });
  const tuboRaioX = await prisma.pecaCatalogo.create({
    data: { nome: "Tubo de raio-X", categoria: "Tomografia", garantiaPadraoMeses: 12, precoUnitario: 3500 },
  });
  const detectorDigital = await prisma.pecaCatalogo.create({
    data: { nome: "Detector digital", categoria: "Mamografia", garantiaPadraoMeses: 12, precoUnitario: 4500 },
  });
  const transdutor = await prisma.pecaCatalogo.create({
    data: { nome: "Transdutor", categoria: "Ultrassom", garantiaPadraoMeses: 6, precoUnitario: 1800 },
  });
  const fonteAltaTensao = await prisma.pecaCatalogo.create({
    data: { nome: "Fonte de alta tensão", categoria: "Raio-X", garantiaPadraoMeses: 12, precoUnitario: 2800 },
  });

  // ------------------------------------------------------------------
  // ORDENS DE SERVIÇO EM ABERTO (2 exemplos de alerta pro painel)
  // ------------------------------------------------------------------

  // OS aberta, agendada pra hoje, na 2ª tentativa (peça errada na primeira)
  const os1 = await prisma.ordemServico.create({
    data: {
      clienteId: hospitalCentral.id,
      equipamentoId: ressonancia.id,
      funcionarioId: joao.funcionario!.id,
      modalidade: ModalidadeAtendimento.VISITA_TECNICA,
      statusAtual: StatusOS.EM_REPARO,
      descricaoProblema: "Equipamento não gera imagem com qualidade adequada.",
      numeroTentativas: 1,
      dataAgendada: new Date(),
      statusHistoricos: {
        create: [
          { status: StatusOS.RECEBIDO, tentativaNumero: 1, observacao: "Chamado aberto." },
          { status: StatusOS.DIAGNOSTICO, tentativaNumero: 1, observacao: "Técnico avaliou no local." },
          {
            status: StatusOS.EM_REPARO,
            tentativaNumero: 2,
            observacao: "Primeira peça trocada não resolveu, tentando novamente.",
          },
        ],
      },
    },
  });

  await prisma.pecaTrocada.create({
    data: {
      ordemServicoId: os1.id,
      pecaCatalogoId: bobina.id,
      funcionarioId: joao.funcionario!.id,
      tipoServico: "Substituição",
      tentativaNumero: 1,
      resolveuProblema: false,
      precoUnitario: 2200,
    },
  });

  await prisma.deslocamento.create({
    data: {
      funcionarioId: joao.funcionario!.id,
      ordemServicoId: os1.id,
      origemCidade: "Curitiba",
      destinoCidade: "Salvador",
      custoPassagem: 1200,
      custoHospedagem: 450,
      custoAlimentacao: 180,
      diasViagem: 2,
    },
  });

  // OS sem técnico atribuído e parada há 5 dias sem atualização (esquecida)
  const cincoDiasAtras = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  await prisma.ordemServico.create({
    data: {
      clienteId: hospitalCentral.id,
      equipamentoId: ressonancia.id,
      funcionarioId: null,
      modalidade: ModalidadeAtendimento.OFICINA,
      statusAtual: StatusOS.RECEBIDO,
      descricaoProblema: "Equipamento fazendo ruído estranho durante o exame.",
      numeroTentativas: 0,
      criadoEm: cincoDiasAtras,
      atualizadoEm: cincoDiasAtras,
      statusHistoricos: {
        create: [
          { status: StatusOS.RECEBIDO, tentativaNumero: 1, observacao: "Chamado aberto.", criadoEm: cincoDiasAtras },
        ],
      },
    },
  });

  // OS abertas agendadas pra HOJE — garante que todos os técnicos apareçam
  // com afazeres no painel "Agenda de hoje, por técnico" do dashboard.
  const hojeAs = (hora: number) => {
    const d = new Date();
    d.setHours(hora, 0, 0, 0);
    return d;
  };

  const agendaHoje = [
    {
      clienteId: institutoSantaFe.id,
      equipamentoId: mamografo.id,
      funcionarioId: marina.funcionario!.id,
      statusAtual: StatusOS.DIAGNOSTICO,
      descricaoProblema: "Mamógrafo com alerta de calibração do detector digital.",
      hora: 9,
    },
    {
      clienteId: hospitalRegional.id,
      equipamentoId: ultrassom.id,
      funcionarioId: marina.funcionario!.id,
      statusAtual: StatusOS.RECEBIDO,
      descricaoProblema: "Transdutor com falha intermitente de imagem.",
      hora: 15,
    },
    {
      clienteId: institutoSantaFe.id,
      equipamentoId: raioX.id,
      funcionarioId: carlos.funcionario!.id,
      statusAtual: StatusOS.EM_REPARO,
      descricaoProblema: "Raio-X com ruído na fonte de alta tensão.",
      hora: 8,
    },
    {
      clienteId: hospitalRegional.id,
      equipamentoId: ultrassom.id,
      funcionarioId: carlos.funcionario!.id,
      statusAtual: StatusOS.DIAGNOSTICO,
      descricaoProblema: "Ultrassom não liga após queda de energia.",
      hora: 13,
    },
    {
      clienteId: clinicaSaoLucas.id,
      equipamentoId: tomografo.id,
      funcionarioId: joao.funcionario!.id,
      statusAtual: StatusOS.RECEBIDO,
      descricaoProblema: "Tomógrafo travando durante a inicialização.",
      hora: 16,
    },
  ];

  for (const item of agendaHoje) {
    await prisma.ordemServico.create({
      data: {
        clienteId: item.clienteId,
        equipamentoId: item.equipamentoId,
        funcionarioId: item.funcionarioId,
        modalidade: ModalidadeAtendimento.VISITA_TECNICA,
        statusAtual: item.statusAtual,
        descricaoProblema: item.descricaoProblema,
        numeroTentativas: 0,
        dataAgendada: hojeAs(item.hora),
        statusHistoricos: {
          create: [{ status: StatusOS.RECEBIDO, tentativaNumero: 1, observacao: "Chamado aberto." }],
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // ORDENS DE SERVIÇO CONCLUÍDAS — espalhadas pelos últimos ~45 dias,
  // pra dar densidade real ao gráfico de faturamento e ao painel de
  // despesas por tipo (passagem, hotel, alimentação, comissão, salário).
  // ------------------------------------------------------------------

  // Hoje — Marina, local (sem deslocamento)
  await criarOSFechada({
    clienteId: clinicaSaoLucas.id,
    equipamentoId: tomografo.id,
    funcionarioId: marina.funcionario!.id,
    tipo: "CORRETIVA",
    descricaoProblema: "Tubo de raio-X apresentando falha intermitente durante o exame.",
    diasAtras: 0,
    valorMaoDeObra: 600,
    valorComissao: 80,
    peca: { pecaCatalogoId: tuboRaioX.id, precoUnitario: 3500 },
  });

  // 3 dias atrás — João, viagem a Salvador
  await criarOSFechada({
    clienteId: hospitalCentral.id,
    equipamentoId: ressonancia.id,
    funcionarioId: joao.funcionario!.id,
    tipo: "CORRETIVA",
    descricaoProblema: "Manutenção corretiva em bobina de superfície.",
    diasAtras: 3,
    valorMaoDeObra: 450,
    valorComissao: 67.5,
    peca: { pecaCatalogoId: bobina.id, precoUnitario: 2200, tipoServico: "Reparo" },
    deslocamento: { origem: "Curitiba", destino: "Salvador", passagem: 900, hospedagem: 300, alimentacao: 90 },
  });

  // 8 dias atrás — Carlos, preventiva em São Paulo (viagem curta, sem hotel)
  await criarOSFechada({
    clienteId: institutoSantaFe.id,
    equipamentoId: mamografo.id,
    funcionarioId: carlos.funcionario!.id,
    tipo: "PREVENTIVA",
    descricaoProblema: "Manutenção preventiva semestral do mamógrafo.",
    diasAtras: 8,
    valorMaoDeObra: 700,
    valorComissao: 140,
    deslocamento: { origem: "Curitiba", destino: "São Paulo", passagem: 450, alimentacao: 80 },
  });

  // 14 dias atrás — Carlos, viagem a Belo Horizonte
  await criarOSFechada({
    clienteId: hospitalRegional.id,
    equipamentoId: ultrassom.id,
    funcionarioId: carlos.funcionario!.id,
    tipo: "CORRETIVA",
    descricaoProblema: "Transdutor com falha de imagem em determinados ângulos.",
    diasAtras: 14,
    valorMaoDeObra: 550,
    valorComissao: 110,
    peca: { pecaCatalogoId: transdutor.id, precoUnitario: 1800 },
    deslocamento: { origem: "Curitiba", destino: "Belo Horizonte", passagem: 850, hospedagem: 250, alimentacao: 120 },
  });

  // 20 dias atrás — João, São Paulo
  await criarOSFechada({
    clienteId: institutoSantaFe.id,
    equipamentoId: raioX.id,
    funcionarioId: joao.funcionario!.id,
    tipo: "CORRETIVA",
    descricaoProblema: "Fonte de alta tensão apresentando instabilidade.",
    diasAtras: 20,
    valorMaoDeObra: 480,
    valorComissao: 72,
    peca: { pecaCatalogoId: fonteAltaTensao.id, precoUnitario: 2800 },
    deslocamento: { origem: "Curitiba", destino: "São Paulo", passagem: 420, alimentacao: 75 },
  });

  // 25 dias atrás — Marina, preventiva local (sem deslocamento)
  await criarOSFechada({
    clienteId: clinicaSaoLucas.id,
    equipamentoId: tomografo.id,
    funcionarioId: marina.funcionario!.id,
    tipo: "PREVENTIVA",
    descricaoProblema: "Manutenção preventiva anual do tomógrafo.",
    diasAtras: 25,
    valorMaoDeObra: 400,
    valorComissao: 80,
  });

  // 35 dias atrás (mês passado) — Marina, entregue
  await criarOSFechada({
    clienteId: clinicaSaoLucas.id,
    equipamentoId: tomografo.id,
    funcionarioId: marina.funcionario!.id,
    tipo: "CORRETIVA",
    descricaoProblema: "Calibração periódica do tomógrafo.",
    diasAtras: 35,
    valorMaoDeObra: 500,
    valorComissao: 80,
    peca: { pecaCatalogoId: tuboRaioX.id, precoUnitario: 3500 },
  });

  // 38 dias atrás (mês passado) — João, São Paulo
  await criarOSFechada({
    clienteId: institutoSantaFe.id,
    equipamentoId: mamografo.id,
    funcionarioId: joao.funcionario!.id,
    tipo: "CORRETIVA",
    descricaoProblema: "Detector digital com ruído excessivo nas imagens.",
    diasAtras: 38,
    valorMaoDeObra: 420,
    valorComissao: 63,
    peca: { pecaCatalogoId: detectorDigital.id, precoUnitario: 4500 },
    deslocamento: { origem: "Curitiba", destino: "São Paulo", passagem: 400, alimentacao: 70 },
  });

  // 42 dias atrás (mês passado) — Carlos, Salvador
  await criarOSFechada({
    clienteId: hospitalCentral.id,
    equipamentoId: ressonancia.id,
    funcionarioId: carlos.funcionario!.id,
    tipo: "CORRETIVA",
    descricaoProblema: "Substituição de bobina de superfície com defeito.",
    diasAtras: 42,
    valorMaoDeObra: 650,
    valorComissao: 130,
    peca: { pecaCatalogoId: bobina.id, precoUnitario: 2200 },
    deslocamento: { origem: "Curitiba", destino: "Salvador", passagem: 1100, hospedagem: 400, alimentacao: 160 },
  });

  console.log("✅ Seed concluído.");
  console.log(`   Login do dono: ${dono.email} / senha: 123456`);
  console.log(`   Login do técnico (ressonância/tomografia): ${joao.email} / senha: 123456`);
  console.log(`   Login da técnica (tomografia/raio-X): ${marina.email} / senha: 123456`);
  console.log(`   Login do técnico sênior (mamografia/ultrassom): ${carlos.email} / senha: 123456`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
