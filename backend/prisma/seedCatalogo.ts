/**
 * Popula (ou atualiza) apenas o catálogo de equipamentos, sem tocar no
 * resto dos dados. Idempotente — pode rodar quantas vezes for preciso.
 * Uso: npx ts-node prisma/seedCatalogo.ts
 */
import { PrismaClient } from "@prisma/client";
import { EQUIPAMENTOS_CATALOGO } from "./equipamentosCatalogo";

const prisma = new PrismaClient();

async function main() {
  for (const item of EQUIPAMENTOS_CATALOGO) {
    await prisma.equipamentoCatalogo.upsert({
      where: { tipo_marca_modelo: item },
      update: {},
      create: item,
    });
  }
  console.log(`Catálogo de equipamentos: ${EQUIPAMENTOS_CATALOGO.length} itens sincronizados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
