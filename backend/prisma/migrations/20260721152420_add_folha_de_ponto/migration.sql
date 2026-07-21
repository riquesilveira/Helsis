-- CreateTable
CREATE TABLE "registros_ponto" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "entrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saida" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_ponto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registros_ponto_funcionarioId_idx" ON "registros_ponto"("funcionarioId");

-- AddForeignKey
ALTER TABLE "registros_ponto" ADD CONSTRAINT "registros_ponto_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
