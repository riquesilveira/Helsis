-- CreateTable
CREATE TABLE "configuracao_etapas" (
    "id" TEXT NOT NULL,
    "status" "StatusOS" NOT NULL,
    "rotulo" TEXT NOT NULL,
    "rotuloCliente" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracao_etapas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracao_etapas_status_key" ON "configuracao_etapas"("status");
