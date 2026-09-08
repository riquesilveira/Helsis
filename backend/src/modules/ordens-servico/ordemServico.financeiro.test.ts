import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do Prisma — testa só o cálculo de comissão do fechamento financeiro.
vi.mock("../../lib/prisma", () => ({
  prisma: {
    ordemServico: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../../lib/prisma";
import { atualizarFinanceiro } from "./ordemServico.service";

const os = prisma.ordemServico as unknown as {
  findUnique: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

/** Captura o valorComissao que seria persistido. */
function comissaoPersistida() {
  return os.update.mock.calls[0][0].data.valorComissao as number | null;
}

beforeEach(() => {
  vi.clearAllMocks();
  os.update.mockImplementation((args) => Promise.resolve(args.data));
});

describe("atualizarFinanceiro — cálculo de comissão", () => {
  it("404 quando a OS não existe", async () => {
    os.findUnique.mockResolvedValue(null);
    await expect(atualizarFinanceiro("os-x", { valorMaoDeObra: 100 })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("PERCENTUAL: comissão = mão de obra × percentual / 100", () => {
    os.findUnique.mockResolvedValue({
      funcionario: { tipoComissao: "PERCENTUAL", valorComissao: 10 },
    });
    return atualizarFinanceiro("os-1", { valorMaoDeObra: 1000 }).then(() => {
      expect(comissaoPersistida()).toBe(100); // 10% de 1000
    });
  });

  it("FIXO: comissão = valor configurado, independente da mão de obra", () => {
    os.findUnique.mockResolvedValue({
      funcionario: { tipoComissao: "FIXO", valorComissao: 250 },
    });
    return atualizarFinanceiro("os-1", { valorMaoDeObra: 999 }).then(() => {
      expect(comissaoPersistida()).toBe(250);
    });
  });

  it("override manual tem precedência sobre a config do funcionário", () => {
    os.findUnique.mockResolvedValue({
      funcionario: { tipoComissao: "PERCENTUAL", valorComissao: 10 },
    });
    return atualizarFinanceiro("os-1", { valorMaoDeObra: 1000, valorComissaoManual: 42 }).then(() => {
      expect(comissaoPersistida()).toBe(42);
    });
  });

  it("sem config de comissão e sem override → comissão null", () => {
    os.findUnique.mockResolvedValue({
      funcionario: { tipoComissao: null, valorComissao: null },
    });
    return atualizarFinanceiro("os-1", { valorMaoDeObra: 1000 }).then(() => {
      expect(comissaoPersistida()).toBeNull();
    });
  });

  it("comissão incide só sobre a mão de obra (peças não entram na base)", () => {
    // A função recebe apenas valorMaoDeObra; o valor de peças nunca é somado à base.
    os.findUnique.mockResolvedValue({
      funcionario: { tipoComissao: "PERCENTUAL", valorComissao: 20 },
    });
    return atualizarFinanceiro("os-1", { valorMaoDeObra: 500 }).then(() => {
      expect(comissaoPersistida()).toBe(100); // 20% de 500, sem influência de peças
    });
  });
});
