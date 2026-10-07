-- AlterEnum
ALTER TYPE "StatusTarefa" ADD VALUE IF NOT EXISTS 'PAUSADO' BEFORE 'CONCLUIDA';

-- AlterTable
ALTER TABLE "tarefas_os" ADD COLUMN "duracaoAcumuladaSegundos" INTEGER NOT NULL DEFAULT 0;
