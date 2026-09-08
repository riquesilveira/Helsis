import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppError } from "../../utils/AppError";

// Mock do Prisma — os testes exercitam só a regra de negócio (um turno aberto por vez).
vi.mock("../../lib/prisma", () => ({
  prisma: {
    registroPonto: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../../lib/prisma";
import { registrarEntrada, registrarSaida } from "./ponto.service";

const reg = prisma.registroPonto as unknown as {
  findFirst: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

beforeEach(() => vi.clearAllMocks());

describe("registrarEntrada", () => {
  it("cria o registro quando não há turno aberto", async () => {
    reg.findFirst.mockResolvedValue(null);
    reg.create.mockResolvedValue({ id: "r1" });

    const r = await registrarEntrada("func1");
    expect(reg.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ funcionarioId: "func1" }) })
    );
    expect(r).toEqual({ id: "r1" });
  });

  it("rejeita (409) quando já existe turno aberto", async () => {
    reg.findFirst.mockResolvedValue({ id: "aberto", saida: null });

    await expect(registrarEntrada("func1")).rejects.toMatchObject({ statusCode: 409 });
    expect(reg.create).not.toHaveBeenCalled();
  });
});

describe("registrarSaida", () => {
  it("fecha o turno aberto preenchendo a saída", async () => {
    reg.findFirst.mockResolvedValue({ id: "aberto", saida: null });
    reg.update.mockResolvedValue({ id: "aberto", saida: new Date() });

    await registrarSaida("func1");
    expect(reg.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "aberto" },
        data: expect.objectContaining({ saida: expect.any(Date) }),
      })
    );
  });

  it("rejeita (409) quando não há turno aberto", async () => {
    reg.findFirst.mockResolvedValue(null);

    await expect(registrarSaida("func1")).rejects.toBeInstanceOf(AppError);
    expect(reg.update).not.toHaveBeenCalled();
  });
});
