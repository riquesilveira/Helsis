-- CreateEnum
CREATE TYPE "TipoAnexo" AS ENUM ('FOTO', 'LAUDO', 'OUTRO');

-- AlterTable
ALTER TABLE "equipamentos" ADD COLUMN     "dataUltimaCalibracao" TIMESTAMP(3),
ADD COLUMN     "registroAnvisa" TEXT,
ADD COLUMN     "responsavelTecnico" TEXT,
ADD COLUMN     "validadeCalibracao" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "equipamentoId" TEXT,
    "numero" TEXT,
    "slaHorasResposta" INTEGER NOT NULL,
    "vigenciaInicio" TIMESTAMP(3) NOT NULL,
    "vigenciaFim" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexos" (
    "id" TEXT NOT NULL,
    "ordemServicoId" TEXT NOT NULL,
    "funcionarioId" TEXT,
    "tipo" "TipoAnexo" NOT NULL DEFAULT 'FOTO',
    "url" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "tamanhoBytes" INTEGER,
    "descricao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contratos_clienteId_idx" ON "contratos"("clienteId");

-- CreateIndex
CREATE INDEX "contratos_equipamentoId_idx" ON "contratos"("equipamentoId");

-- CreateIndex
CREATE INDEX "anexos_ordemServicoId_idx" ON "anexos"("ordemServicoId");

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "equipamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
