-- AlterTable
ALTER TABLE "ordens_servico" ADD COLUMN     "causaId" TEXT,
ADD COLUMN     "defeitoId" TEXT,
ADD COLUMN     "solucaoId" TEXT;

-- CreateTable
CREATE TABLE "causas" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "causas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defeitos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tempoEstimadoMin" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defeitos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solucoes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tempoEstimadoMin" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solucoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "causas_codigo_key" ON "causas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "defeitos_codigo_key" ON "defeitos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "solucoes_codigo_key" ON "solucoes"("codigo");

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_causaId_fkey" FOREIGN KEY ("causaId") REFERENCES "causas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_defeitoId_fkey" FOREIGN KEY ("defeitoId") REFERENCES "defeitos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_solucaoId_fkey" FOREIGN KEY ("solucaoId") REFERENCES "solucoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
