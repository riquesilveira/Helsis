import { PrismaClient, PapelUsuario, ModalidadeAtendimento, StatusOS, TipoOS } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DIA = 24 * 60 * 60 * 1000;
const diasAtras = (d: number) => new Date(Date.now() - d * DIA);
const diasFrente = (d: number) => new Date(Date.now() + d * DIA);

/**
 * Cria uma OS já concluída no passado, com peça e/ou deslocamento
 * opcionais — mesmo padrão do seed principal, só que aditivo.
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
  const data = diasAtras(input.diasAtras);

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
      statusHistoricos: {
        create: [
          { status: StatusOS.RECEBIDO, tentativaNumero: 1, observacao: "Chamado aberto.", criadoEm: data },
          { status: StatusOS.DIAGNOSTICO, tentativaNumero: 1, observacao: "Técnico avaliou no local.", criadoEm: data },
          { status: StatusOS.EM_REPARO, tentativaNumero: 1, observacao: "Atendimento em execução.", criadoEm: data },
          { status: StatusOS.CONCLUIDO, tentativaNumero: 1, observacao: "Atendimento concluído.", criadoEm: data },
        ],
      },
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

/** Upsert de um usuário técnico por e-mail (idempotente). */
async function upsertTecnico(input: {
  nome: string;
  email: string;
  senhaHash: string;
  cargo: string;
  salarioAtual: number;
  dataAdmissao: string;
  especialidades: string[];
  tipoComissao: "PERCENTUAL" | "FIXO";
  valorComissao: number;
}) {
  const usuario = await prisma.usuario.upsert({
    where: { email: input.email },
    update: {},
    create: {
      nome: input.nome,
      email: input.email,
      senhaHash: input.senhaHash,
      papel: PapelUsuario.TECNICO,
      funcionario: {
        create: {
          cargo: input.cargo,
          salarioAtual: input.salarioAtual,
          dataAdmissao: new Date(input.dataAdmissao),
          especialidades: input.especialidades,
          tipoComissao: input.tipoComissao,
          valorComissao: input.valorComissao,
        },
      },
    },
    include: { funcionario: true },
  });
  return usuario;
}

async function main() {
  const SENTINELA = "extra-seed@empresa.com"; // marca de execução anterior

  const sentinelaCliente = await prisma.cliente.findFirst({ where: { email: SENTINELA } });

  const senhaHash = await bcrypt.hash("123456", 10);

  // ------------------------------------------------------------------
  // EQUIPE — 4 novos técnicos (upsert por e-mail; seguro re-rodar)
  // ------------------------------------------------------------------
  const rafael = await upsertTecnico({
    nome: "Rafael Monteiro",
    email: "rafael@empresa.com",
    senhaHash,
    cargo: "Técnico Sênior",
    salarioAtual: 4300,
    dataAdmissao: "2021-08-05",
    especialidades: ["Ressonância Magnética", "Tomógrafo"],
    tipoComissao: "PERCENTUAL",
    valorComissao: 18,
  });

  const beatriz = await upsertTecnico({
    nome: "Beatriz Lima",
    email: "beatriz@empresa.com",
    senhaHash,
    cargo: "Técnica Pleno",
    salarioAtual: 3300,
    dataAdmissao: "2023-02-20",
    especialidades: ["Ultrassom Doppler", "Mamógrafo Digital"],
    tipoComissao: "FIXO",
    valorComissao: 90,
  });

  const diego = await upsertTecnico({
    nome: "Diego Ferreira",
    email: "diego@empresa.com",
    senhaHash,
    cargo: "Técnico",
    salarioAtual: 3100,
    dataAdmissao: "2024-01-15",
    especialidades: ["Raio-X Digital", "Tomógrafo"],
    tipoComissao: "PERCENTUAL",
    valorComissao: 12,
  });

  const patricia = await upsertTecnico({
    nome: "Patrícia Souza",
    email: "patricia@empresa.com",
    senhaHash,
    cargo: "Técnica Sênior",
    salarioAtual: 4500,
    dataAdmissao: "2020-11-10",
    especialidades: ["Ressonância Magnética", "Mamógrafo Digital"],
    tipoComissao: "PERCENTUAL",
    valorComissao: 20,
  });

  console.log(`Equipe: 4 técnicos garantidos (rafael, beatriz, diego, patricia).`);

  if (sentinelaCliente) {
    console.log("⚠️  Clientes/OS extras já existem (sentinela encontrada). Pulando bloco para não duplicar.");
    console.log("✅ Concluído (somente equipe garantida).");
    return;
  }

  // ------------------------------------------------------------------
  // PEÇAS — reaproveita catálogo existente; cria as que faltarem
  // ------------------------------------------------------------------
  async function garantirPeca(nome: string, categoria: string, garantia: number, preco: number) {
    const existente = await prisma.pecaCatalogo.findFirst({ where: { nome } });
    if (existente) return existente;
    return prisma.pecaCatalogo.create({
      data: { nome, categoria, garantiaPadraoMeses: garantia, precoUnitario: preco },
    });
  }

  const bobina = await garantirPeca("Bobina de gradiente", "Ressonância", 6, 2200);
  const tuboRaioX = await garantirPeca("Tubo de raio-X", "Tomografia", 12, 3500);
  const detector = await garantirPeca("Detector digital", "Mamografia", 12, 4500);
  const transdutor = await garantirPeca("Transdutor", "Ultrassom", 6, 1800);
  const fonteAT = await garantirPeca("Fonte de alta tensão", "Raio-X", 12, 2800);
  const placaControle = await garantirPeca("Placa de controle", "Geral", 6, 1600);
  const compressorHelio = await garantirPeca("Compressor de hélio", "Ressonância", 12, 5200);

  // ------------------------------------------------------------------
  // CLIENTES + EQUIPAMENTOS (8 novos clientes)
  // ------------------------------------------------------------------
  const centroRio = await prisma.cliente.create({
    data: {
      nome: "Centro de Diagnóstico Imagem Rio",
      documento: "12.345.678/0001-90",
      telefone: "(21) 99812-3344",
      email: "contato@imagemrio.com.br",
      endereco: "Av. das Américas, 4200",
      cidade: "Rio de Janeiro",
      estado: "RJ",
    },
  });
  const eqRioRM = await prisma.equipamento.create({
    data: {
      clienteId: centroRio.id,
      tipo: "Ressonância Magnética",
      marca: "Philips",
      modelo: "Ingenia 1.5T",
      numeroSerie: "SN-RJ-0091",
      localInstalacao: "Bloco A, 3º andar",
      frequenciaManutencaoMeses: 6,
      ultimaManutencaoPreventiva: diasAtras(120),
      proximaManutencaoPreventiva: diasFrente(60),
    },
  });
  const eqRioTC = await prisma.equipamento.create({
    data: {
      clienteId: centroRio.id,
      tipo: "Tomógrafo",
      marca: "Canon Medical",
      modelo: "Aquilion Prime",
      numeroSerie: "SN-RJ-0092",
      localInstalacao: "Bloco A, térreo",
      frequenciaManutencaoMeses: 12,
      ultimaManutencaoPreventiva: diasAtras(300),
      proximaManutencaoPreventiva: diasFrente(65),
    },
  });

  const santaMonica = await prisma.cliente.create({
    data: {
      nome: "Hospital Santa Mônica",
      documento: "23.456.789/0001-01",
      telefone: "(81) 99765-8821",
      email: "manutencao@santamonica.com.br",
      endereco: "Rua do Príncipe, 880",
      cidade: "Recife",
      estado: "PE",
    },
  });
  const eqRecifeMamo = await prisma.equipamento.create({
    data: {
      clienteId: santaMonica.id,
      tipo: "Mamógrafo Digital",
      marca: "Hologic",
      modelo: "Selenia Dimensions",
      numeroSerie: "SN-PE-0210",
      localInstalacao: "Centro de Imagem, sala 4",
      frequenciaManutencaoMeses: 6,
      ultimaManutencaoPreventiva: diasAtras(190),
      proximaManutencaoPreventiva: diasAtras(10), // vencida — vira alerta
    },
  });

  const bemEstar = await prisma.cliente.create({
    data: {
      nome: "Clínica Radiológica Bem Estar",
      documento: "34.567.890/0001-12",
      telefone: "(85) 98844-1200",
      email: "contato@bemestarradiologia.com.br",
      endereco: "Av. Dom Luís, 1200",
      cidade: "Fortaleza",
      estado: "CE",
    },
  });
  const eqFortalezaRX = await prisma.equipamento.create({
    data: {
      clienteId: bemEstar.id,
      tipo: "Raio-X Digital",
      marca: "Siemens",
      modelo: "Ysio Max",
      numeroSerie: "SN-CE-0333",
      localInstalacao: "Sala 1",
      frequenciaManutencaoMeses: 12,
      ultimaManutencaoPreventiva: diasAtras(60),
      proximaManutencaoPreventiva: diasFrente(300),
    },
  });
  const eqFortalezaUS = await prisma.equipamento.create({
    data: {
      clienteId: bemEstar.id,
      tipo: "Ultrassom Doppler",
      marca: "GE Healthcare",
      modelo: "Voluson E10",
      numeroSerie: "SN-CE-0334",
      localInstalacao: "Sala 3",
    },
  });

  const institutoCoracao = await prisma.cliente.create({
    data: {
      nome: "Instituto do Coração Diagnósticos",
      documento: "45.678.901/0001-23",
      telefone: "(51) 99977-3010",
      email: "engenharia@coracaodiag.com.br",
      endereco: "Av. Ipiranga, 6690",
      cidade: "Porto Alegre",
      estado: "RS",
    },
  });
  const eqPoaTC = await prisma.equipamento.create({
    data: {
      clienteId: institutoCoracao.id,
      tipo: "Tomógrafo",
      marca: "Siemens",
      modelo: "Somatom go.Up",
      numeroSerie: "SN-RS-0455",
      localInstalacao: "Setor de Imagem",
      frequenciaManutencaoMeses: 12,
      ultimaManutencaoPreventiva: diasAtras(340),
      proximaManutencaoPreventiva: diasFrente(25),
    },
  });

  const universitarioNorte = await prisma.cliente.create({
    data: {
      nome: "Hospital Universitário Norte",
      documento: "56.789.012/0001-34",
      telefone: "(92) 98123-4567",
      email: "clinica@hunorte.com.br",
      endereco: "Av. Djalma Batista, 3000",
      cidade: "Manaus",
      estado: "AM",
    },
  });
  const eqManausRM = await prisma.equipamento.create({
    data: {
      clienteId: universitarioNorte.id,
      tipo: "Ressonância Magnética",
      marca: "GE Healthcare",
      modelo: "Signa Explorer",
      numeroSerie: "SN-AM-0511",
      localInstalacao: "Ala Norte, 1º andar",
      frequenciaManutencaoMeses: 6,
      ultimaManutencaoPreventiva: diasAtras(170),
      proximaManutencaoPreventiva: diasFrente(15),
    },
  });

  const imagemPremium = await prisma.cliente.create({
    data: {
      nome: "Clínica Imagem Premium",
      documento: "67.890.123/0001-45",
      telefone: "(61) 99655-7788",
      email: "contato@imagempremium.com.br",
      endereco: "SGAS 915, Bloco C",
      cidade: "Brasília",
      estado: "DF",
    },
  });
  const eqBsbUS = await prisma.equipamento.create({
    data: {
      clienteId: imagemPremium.id,
      tipo: "Ultrassom Doppler",
      marca: "Philips",
      modelo: "EPIQ 7",
      numeroSerie: "SN-DF-0620",
      localInstalacao: "Sala 2",
    },
  });

  const medCenter = await prisma.cliente.create({
    data: {
      nome: "Med Center Diagnósticos",
      documento: "78.901.234/0001-56",
      telefone: "(62) 98700-1122",
      email: "manutencao@medcenter.com.br",
      endereco: "Av. T-63, 1500",
      cidade: "Goiânia",
      estado: "GO",
    },
  });
  const eqGoianiaRX = await prisma.equipamento.create({
    data: {
      clienteId: medCenter.id,
      tipo: "Raio-X Digital",
      marca: "GE Healthcare",
      modelo: "Definium 8000",
      numeroSerie: "SN-GO-0730",
      localInstalacao: "Térreo, sala 5",
      frequenciaManutencaoMeses: 12,
      ultimaManutencaoPreventiva: diasAtras(400),
      proximaManutencaoPreventiva: diasAtras(35), // vencida
    },
  });

  const clinicasLitoral = await prisma.cliente.create({
    data: {
      nome: "Hospital das Clínicas Litoral",
      documento: "89.012.345/0001-67",
      telefone: "(48) 99433-9090",
      email: "engenhariaclinica@hclitoral.com.br",
      endereco: "Rod. SC-401, 4000",
      cidade: "Florianópolis",
      estado: "SC",
    },
  });
  const eqFloriMamo = await prisma.equipamento.create({
    data: {
      clienteId: clinicasLitoral.id,
      tipo: "Mamógrafo Digital",
      marca: "GE Healthcare",
      modelo: "Senographe Pristina",
      numeroSerie: "SN-SC-0841",
      localInstalacao: "Centro de Mama, sala 1",
      frequenciaManutencaoMeses: 6,
      ultimaManutencaoPreventiva: diasAtras(80),
      proximaManutencaoPreventiva: diasFrente(100),
    },
  });

  // sentinela: cliente invisível de controle (para idempotência do bloco)
  await prisma.cliente.create({
    data: { nome: "__seed_extra__", telefone: "(00) 00000-0000", email: SENTINELA },
  });

  console.log("Clientes: 8 novos criados (+ equipamentos).");

  // ------------------------------------------------------------------
  // ORDENS DE SERVIÇO EM ABERTO (4) — alimentam alertas do painel
  // ------------------------------------------------------------------

  // Rio — RM, agendada pra hoje, em reparo, 2ª tentativa
  const osAberta1 = await prisma.ordemServico.create({
    data: {
      clienteId: centroRio.id,
      equipamentoId: eqRioRM.id,
      funcionarioId: rafael.funcionario!.id,
      modalidade: ModalidadeAtendimento.VISITA_TECNICA,
      statusAtual: StatusOS.EM_REPARO,
      descricaoProblema: "Artefatos de imagem recorrentes na sequência T2.",
      numeroTentativas: 1,
      dataAgendada: new Date(),
      statusHistoricos: {
        create: [
          { status: StatusOS.RECEBIDO, tentativaNumero: 1, observacao: "Chamado aberto." },
          { status: StatusOS.DIAGNOSTICO, tentativaNumero: 1, observacao: "Avaliação no local." },
          { status: StatusOS.EM_REPARO, tentativaNumero: 2, observacao: "Primeira troca não resolveu; nova tentativa." },
        ],
      },
    },
  });
  await prisma.pecaTrocada.create({
    data: {
      ordemServicoId: osAberta1.id,
      pecaCatalogoId: bobina.id,
      funcionarioId: rafael.funcionario!.id,
      tipoServico: "Substituição",
      tentativaNumero: 1,
      resolveuProblema: false,
      precoUnitario: 2200,
    },
  });
  await prisma.deslocamento.create({
    data: {
      funcionarioId: rafael.funcionario!.id,
      ordemServicoId: osAberta1.id,
      origemCidade: "Curitiba",
      destinoCidade: "Rio de Janeiro",
      custoPassagem: 780,
      custoHospedagem: 320,
      custoAlimentacao: 110,
      diasViagem: 2,
    },
  });

  // Recife — mamógrafo, aguardando peça
  await prisma.ordemServico.create({
    data: {
      clienteId: santaMonica.id,
      equipamentoId: eqRecifeMamo.id,
      funcionarioId: beatriz.funcionario!.id,
      modalidade: ModalidadeAtendimento.VISITA_TECNICA,
      statusAtual: StatusOS.AGUARDANDO_PECA,
      descricaoProblema: "Detector digital com colunas mortas na imagem.",
      numeroTentativas: 0,
      dataAgendada: diasFrente(3),
      criadoEm: diasAtras(4),
      statusHistoricos: {
        create: [
          { status: StatusOS.RECEBIDO, tentativaNumero: 1, observacao: "Chamado aberto.", criadoEm: diasAtras(4) },
          { status: StatusOS.DIAGNOSTICO, tentativaNumero: 1, observacao: "Diagnóstico: detector com defeito.", criadoEm: diasAtras(3) },
          { status: StatusOS.AGUARDANDO_PECA, tentativaNumero: 1, observacao: "Detector solicitado ao fornecedor.", criadoEm: diasAtras(3) },
        ],
      },
    },
  });

  // Porto Alegre — tomógrafo, recebido, sem técnico (não atribuída)
  const seteDiasAtras = diasAtras(7);
  await prisma.ordemServico.create({
    data: {
      clienteId: institutoCoracao.id,
      equipamentoId: eqPoaTC.id,
      funcionarioId: null,
      modalidade: ModalidadeAtendimento.OFICINA,
      statusAtual: StatusOS.RECEBIDO,
      descricaoProblema: "Tomógrafo desligando sozinho durante aquisição.",
      numeroTentativas: 0,
      criadoEm: seteDiasAtras,
      atualizadoEm: seteDiasAtras,
      statusHistoricos: {
        create: [
          { status: StatusOS.RECEBIDO, tentativaNumero: 1, observacao: "Chamado aberto.", criadoEm: seteDiasAtras },
        ],
      },
    },
  });

  // Manaus — RM, diagnóstico, agendada
  await prisma.ordemServico.create({
    data: {
      clienteId: universitarioNorte.id,
      equipamentoId: eqManausRM.id,
      funcionarioId: patricia.funcionario!.id,
      modalidade: ModalidadeAtendimento.VISITA_TECNICA,
      statusAtual: StatusOS.DIAGNOSTICO,
      descricaoProblema: "Ruído acústico anormal e aquecimento do gabinete.",
      numeroTentativas: 0,
      dataAgendada: diasFrente(1),
      criadoEm: diasAtras(2),
      statusHistoricos: {
        create: [
          { status: StatusOS.RECEBIDO, tentativaNumero: 1, observacao: "Chamado aberto.", criadoEm: diasAtras(2) },
          { status: StatusOS.DIAGNOSTICO, tentativaNumero: 1, observacao: "Em avaliação técnica.", criadoEm: diasAtras(1) },
        ],
      },
    },
  });

  console.log("OS em aberto: 4 criadas.");

  // ------------------------------------------------------------------
  // ORDENS DE SERVIÇO CONCLUÍDAS — espalhadas nos últimos ~55 dias
  // ------------------------------------------------------------------
  const fechadas = [
    // Rafael — RM Rio (percentual 18%)
    {
      clienteId: centroRio.id, equipamentoId: eqRioTC.id, funcionarioId: rafael.funcionario!.id,
      tipo: "CORRETIVA" as const, descricaoProblema: "Tubo do tomógrafo com desgaste, imagem com ruído.",
      diasAtras: 2, valorMaoDeObra: 620, valorComissao: 111.6,
      peca: { pecaCatalogoId: tuboRaioX.id, precoUnitario: 3500 },
      deslocamento: { origem: "Curitiba", destino: "Rio de Janeiro", passagem: 760, hospedagem: 300, alimentacao: 100 },
    },
    // Beatriz — mamógrafo Florianópolis (fixo 90)
    {
      clienteId: clinicasLitoral.id, equipamentoId: eqFloriMamo.id, funcionarioId: beatriz.funcionario!.id,
      tipo: "PREVENTIVA" as const, descricaoProblema: "Manutenção preventiva semestral do mamógrafo.",
      diasAtras: 5, valorMaoDeObra: 700, valorComissao: 90,
      deslocamento: { origem: "Curitiba", destino: "Florianópolis", passagem: 260, alimentacao: 60 },
    },
    // Diego — Raio-X Goiânia (percentual 12%)
    {
      clienteId: medCenter.id, equipamentoId: eqGoianiaRX.id, funcionarioId: diego.funcionario!.id,
      tipo: "CORRETIVA" as const, descricaoProblema: "Fonte de alta tensão instável, disparos falhando.",
      diasAtras: 6, valorMaoDeObra: 480, valorComissao: 57.6,
      peca: { pecaCatalogoId: fonteAT.id, precoUnitario: 2800 },
      deslocamento: { origem: "Curitiba", destino: "Goiânia", passagem: 520, hospedagem: 220, alimentacao: 90 },
    },
    // Patrícia — RM Manaus (percentual 20%)
    {
      clienteId: universitarioNorte.id, equipamentoId: eqManausRM.id, funcionarioId: patricia.funcionario!.id,
      tipo: "CORRETIVA" as const, descricaoProblema: "Compressor de hélio com perda de pressão.",
      diasAtras: 9, valorMaoDeObra: 900, valorComissao: 180,
      peca: { pecaCatalogoId: compressorHelio.id, precoUnitario: 5200 },
      deslocamento: { origem: "Curitiba", destino: "Manaus", passagem: 1450, hospedagem: 600, alimentacao: 220 },
    },
    // Beatriz — ultrassom Fortaleza (fixo 90)
    {
      clienteId: bemEstar.id, equipamentoId: eqFortalezaUS.id, funcionarioId: beatriz.funcionario!.id,
      tipo: "CORRETIVA" as const, descricaoProblema: "Transdutor convexo com falha em parte da imagem.",
      diasAtras: 12, valorMaoDeObra: 520, valorComissao: 90,
      peca: { pecaCatalogoId: transdutor.id, precoUnitario: 1800 },
      deslocamento: { origem: "Curitiba", destino: "Fortaleza", passagem: 980, hospedagem: 340, alimentacao: 130 },
    },
    // Diego — Raio-X Fortaleza (percentual 12%)
    {
      clienteId: bemEstar.id, equipamentoId: eqFortalezaRX.id, funcionarioId: diego.funcionario!.id,
      tipo: "PREVENTIVA" as const, descricaoProblema: "Manutenção preventiva anual do raio-X digital.",
      diasAtras: 16, valorMaoDeObra: 400, valorComissao: 48,
      deslocamento: { origem: "Curitiba", destino: "Fortaleza", passagem: 950, hospedagem: 320, alimentacao: 120 },
    },
    // Rafael — RM Rio (percentual 18%)
    {
      clienteId: centroRio.id, equipamentoId: eqRioRM.id, funcionarioId: rafael.funcionario!.id,
      tipo: "CORRETIVA" as const, descricaoProblema: "Placa de controle da mesa com falha intermitente.",
      diasAtras: 21, valorMaoDeObra: 560, valorComissao: 100.8,
      peca: { pecaCatalogoId: placaControle.id, precoUnitario: 1600 },
      deslocamento: { origem: "Curitiba", destino: "Rio de Janeiro", passagem: 740, hospedagem: 300, alimentacao: 100 },
    },
    // Patrícia — mamógrafo Recife (percentual 20%)
    {
      clienteId: santaMonica.id, equipamentoId: eqRecifeMamo.id, funcionarioId: patricia.funcionario!.id,
      tipo: "CORRETIVA" as const, descricaoProblema: "Detector com ruído; substituição preventiva de módulo.",
      diasAtras: 27, valorMaoDeObra: 640, valorComissao: 128,
      peca: { pecaCatalogoId: detector.id, precoUnitario: 4500 },
      deslocamento: { origem: "Curitiba", destino: "Recife", passagem: 1050, hospedagem: 380, alimentacao: 150 },
    },
    // Diego — tomógrafo Porto Alegre (percentual 12%)
    {
      clienteId: institutoCoracao.id, equipamentoId: eqPoaTC.id, funcionarioId: diego.funcionario!.id,
      tipo: "PREVENTIVA" as const, descricaoProblema: "Manutenção preventiva anual do tomógrafo.",
      diasAtras: 33, valorMaoDeObra: 450, valorComissao: 54,
      deslocamento: { origem: "Curitiba", destino: "Porto Alegre", passagem: 340, alimentacao: 70 },
    },
    // Rafael — tomógrafo Rio (percentual 18%)
    {
      clienteId: centroRio.id, equipamentoId: eqRioTC.id, funcionarioId: rafael.funcionario!.id,
      tipo: "CORRETIVA" as const, descricaoProblema: "Calibração e troca de tubo do tomógrafo.",
      diasAtras: 40, valorMaoDeObra: 700, valorComissao: 126,
      peca: { pecaCatalogoId: tuboRaioX.id, precoUnitario: 3500 },
      deslocamento: { origem: "Curitiba", destino: "Rio de Janeiro", passagem: 720, hospedagem: 300, alimentacao: 100 },
    },
    // Beatriz — ultrassom Brasília (fixo 90)
    {
      clienteId: imagemPremium.id, equipamentoId: eqBsbUS.id, funcionarioId: beatriz.funcionario!.id,
      tipo: "CORRETIVA" as const, descricaoProblema: "Transdutor linear sem sinal em parte dos elementos.",
      diasAtras: 47, valorMaoDeObra: 500, valorComissao: 90,
      peca: { pecaCatalogoId: transdutor.id, precoUnitario: 1800 },
      deslocamento: { origem: "Curitiba", destino: "Brasília", passagem: 480, alimentacao: 80 },
    },
    // Patrícia — mamógrafo Florianópolis (percentual 20%)
    {
      clienteId: clinicasLitoral.id, equipamentoId: eqFloriMamo.id, funcionarioId: patricia.funcionario!.id,
      tipo: "CORRETIVA" as const, descricaoProblema: "Falha no compressor da paleta de compressão.",
      diasAtras: 54, valorMaoDeObra: 580, valorComissao: 116,
      peca: { pecaCatalogoId: placaControle.id, precoUnitario: 1600 },
      deslocamento: { origem: "Curitiba", destino: "Florianópolis", passagem: 250, alimentacao: 60 },
    },
  ];

  for (const os of fechadas) {
    await criarOSFechada(os);
  }

  console.log(`OS concluídas: ${fechadas.length} criadas.`);
  console.log("✅ Seed extra concluído com sucesso.");
  console.log("   Novos técnicos: rafael@, beatriz@, diego@, patricia@ (senha 123456)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
