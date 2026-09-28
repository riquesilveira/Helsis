-- CreateEnum
CREATE TYPE "StatusTarefa" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA');

-- CreateTable
CREATE TABLE "tarefas_catalogo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tempoEstimadoMin" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarefas_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefas_os" (
    "id" TEXT NOT NULL,
    "ordemServicoId" TEXT NOT NULL,
    "tarefaCatalogoId" TEXT NOT NULL,
    "funcionarioId" TEXT,
    "status" "StatusTarefa" NOT NULL DEFAULT 'PENDENTE',
    "iniciadoEm" TIMESTAMP(3),
    "finalizadoEm" TIMESTAMP(3),
    "duracaoSegundos" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarefas_os_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tarefas_catalogo_codigo_key" ON "tarefas_catalogo"("codigo");

-- CreateIndex
CREATE INDEX "tarefas_os_ordemServicoId_idx" ON "tarefas_os"("ordemServicoId");

-- CreateIndex
CREATE INDEX "tarefas_os_tarefaCatalogoId_idx" ON "tarefas_os"("tarefaCatalogoId");

-- CreateIndex
CREATE INDEX "tarefas_os_funcionarioId_idx" ON "tarefas_os"("funcionarioId");

-- AddForeignKey
ALTER TABLE "tarefas_os" ADD CONSTRAINT "tarefas_os_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas_os" ADD CONSTRAINT "tarefas_os_tarefaCatalogoId_fkey" FOREIGN KEY ("tarefaCatalogoId") REFERENCES "tarefas_catalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas_os" ADD CONSTRAINT "tarefas_os_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
