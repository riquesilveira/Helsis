-- CreateEnum
CREATE TYPE "PapelUsuario" AS ENUM ('DONO', 'GESTOR', 'TECNICO', 'CLIENTE');

-- CreateEnum
CREATE TYPE "TipoComissao" AS ENUM ('PERCENTUAL', 'FIXO');

-- CreateEnum
CREATE TYPE "StatusOS" AS ENUM ('RECEBIDO', 'DIAGNOSTICO', 'AGUARDANDO_PECA', 'EM_REPARO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "ModalidadeAtendimento" AS ENUM ('VISITA_TECNICA', 'OFICINA', 'REMOTO');

-- CreateEnum
CREATE TYPE "TipoOS" AS ENUM ('CORRETIVA', 'PREVENTIVA');

-- CreateEnum
CREATE TYPE "CanalNotificacao" AS ENUM ('SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "StatusNotificacao" AS ENUM ('ENVIADA', 'FALHOU');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "PapelUsuario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funcionarios" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "salarioAtual" DECIMAL(10,2) NOT NULL,
    "dataAdmissao" TIMESTAMP(3) NOT NULL,
    "especialidades" TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoComissao" "TipoComissao",
    "valorComissao" DECIMAL(10,2),

    CONSTRAINT "funcionarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipamentos" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "numeroSerie" TEXT,
    "localInstalacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "frequenciaManutencaoMeses" INTEGER,
    "ultimaManutencaoPreventiva" TIMESTAMP(3),
    "proximaManutencaoPreventiva" TIMESTAMP(3),

    CONSTRAINT "equipamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordens_servico" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "clienteId" TEXT NOT NULL,
    "equipamentoId" TEXT NOT NULL,
    "funcionarioId" TEXT,
    "tipo" "TipoOS" NOT NULL DEFAULT 'CORRETIVA',
    "modalidade" "ModalidadeAtendimento" NOT NULL,
    "statusAtual" "StatusOS" NOT NULL DEFAULT 'RECEBIDO',
    "descricaoProblema" TEXT NOT NULL,
    "numeroTentativas" INTEGER NOT NULL DEFAULT 0,
    "resolvidoNaPrimeira" BOOLEAN,
    "dataAgendada" TIMESTAMP(3),
    "dataAbertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataConclusao" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "valorMaoDeObra" DECIMAL(10,2),
    "valorComissao" DECIMAL(10,2),

    CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_historico" (
    "id" TEXT NOT NULL,
    "ordemServicoId" TEXT NOT NULL,
    "status" "StatusOS" NOT NULL,
    "observacao" TEXT,
    "tentativaNumero" INTEGER NOT NULL DEFAULT 1,
    "funcionarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pecas_catalogo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT,
    "garantiaPadraoMeses" INTEGER NOT NULL DEFAULT 3,
    "precoUnitario" DECIMAL(10,2),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pecas_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pecas_trocadas" (
    "id" TEXT NOT NULL,
    "ordemServicoId" TEXT NOT NULL,
    "pecaCatalogoId" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "tipoServico" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "tentativaNumero" INTEGER NOT NULL DEFAULT 1,
    "resolveuProblema" BOOLEAN,
    "garantiaAte" TIMESTAMP(3),
    "precoUnitario" DECIMAL(10,2),
    "dataTroca" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pecas_trocadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deslocamentos" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "ordemServicoId" TEXT NOT NULL,
    "origemCidade" TEXT,
    "destinoCidade" TEXT,
    "custoPassagem" DECIMAL(10,2),
    "custoHospedagem" DECIMAL(10,2),
    "custoAlimentacao" DECIMAL(10,2),
    "diasViagem" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deslocamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "ordemServicoId" TEXT NOT NULL,
    "canal" "CanalNotificacao" NOT NULL,
    "destinatario" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "status" "StatusNotificacao" NOT NULL,
    "erro" TEXT,
    "enviadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "funcionarios_usuarioId_key" ON "funcionarios"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_usuarioId_key" ON "clientes"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ordens_servico_numero_key" ON "ordens_servico"("numero");

-- AddForeignKey
ALTER TABLE "funcionarios" ADD CONSTRAINT "funcionarios_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "equipamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_historico" ADD CONSTRAINT "status_historico_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_historico" ADD CONSTRAINT "status_historico_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pecas_trocadas" ADD CONSTRAINT "pecas_trocadas_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pecas_trocadas" ADD CONSTRAINT "pecas_trocadas_pecaCatalogoId_fkey" FOREIGN KEY ("pecaCatalogoId") REFERENCES "pecas_catalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pecas_trocadas" ADD CONSTRAINT "pecas_trocadas_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deslocamentos" ADD CONSTRAINT "deslocamentos_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deslocamentos" ADD CONSTRAINT "deslocamentos_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
