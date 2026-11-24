import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
vi.mock("../../lib/prisma", () => ({ prisma: { empresa: { findUnique } } }));

import { obterEmpresa } from "./configuracao.service";

beforeEach(() => vi.clearAllMocks());

describe("obterEmpresa", () => {
  it("sem cadastro, devolve tudo null", async () => {
    findUnique.mockResolvedValue(null);
    expect(await obterEmpresa()).toEqual({ nome: null, telefone: null, whatsapp: null, email: null });
  });

  it("tabela ausente (migração não aplicada) não derruba o portal", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    findUnique.mockRejectedValue(Object.assign(new Error("table does not exist"), { code: "P2021" }));
    expect(await obterEmpresa()).toEqual({ nome: null, telefone: null, whatsapp: null, email: null });
  });

  it("outros erros continuam subindo", async () => {
    findUnique.mockRejectedValue(Object.assign(new Error("conexão"), { code: "P1001" }));
    await expect(obterEmpresa()).rejects.toThrow("conexão");
  });
});
