-- CreateTable
CREATE TABLE "empresa" (
    "id" TEXT NOT NULL DEFAULT 'empresa',
    "nome" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);
