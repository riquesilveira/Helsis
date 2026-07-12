-- CreateTable
CREATE TABLE "equipamentos_catalogo" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,

    CONSTRAINT "equipamentos_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipamentos_catalogo_tipo_marca_modelo_key" ON "equipamentos_catalogo"("tipo", "marca", "modelo");
