-- CreateEnum
CREATE TYPE "ModalTransporte" AS ENUM ('CARRO', 'AVIAO');

-- AlterTable
ALTER TABLE "deslocamentos" ADD COLUMN     "modalTransporte" "ModalTransporte" NOT NULL DEFAULT 'CARRO';
