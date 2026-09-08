import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";

// Mocks das camadas que tocam o Prisma — os testes NÃO acessam o banco (Neon é prod).
vi.mock("./ordemServico.service", () => ({
  buscarOrdemServicoPorId: vi.fn(),
  atualizarStatus: vi.fn(),
  listarOrdensServico: vi.fn(),
  buscarClientePorUsuarioId: vi.fn(),
}));
vi.mock("../funcionarios/funcionario.service", () => ({
  buscarFuncionarioPorUsuarioId: vi.fn(),
}));

import * as osService from "./ordemServico.service";
import { buscarFuncionarioPorUsuarioId } from "../funcionarios/funcionario.service";
import { atualizarStatus, listar } from "./ordemServico.controller";

const FUNC_TECNICO = { id: "func-tecnico-1" };

function reqMock(over: Partial<Request>): Request {
  return { params: {}, query: {}, body: {}, ...over } as Request;
}

function resMock() {
  const res = {} as Response;
  res.json = vi.fn().mockReturnValue(res);
  res.status = vi.fn().mockReturnValue(res);
  return res as Response & { json: ReturnType<typeof vi.fn> };
}

beforeEach(() => {
  vi.clearAllMocks();
  (buscarFuncionarioPorUsuarioId as ReturnType<typeof vi.fn>).mockResolvedValue(FUNC_TECNICO);
});

describe("atualizarStatus — fechamento parcial (N1) × total (N2)", () => {
  it("TÉCNICO não pode concluir (CONCLUIDO) a OS → 403", async () => {
    (osService.buscarOrdemServicoPorId as ReturnType<typeof vi.fn>).mockResolvedValue({
      funcionarioId: FUNC_TECNICO.id, // é a OS dele, mas ainda assim não pode concluir
    });
    const req = reqMock({
      params: { id: "os-1" },
      body: { status: "CONCLUIDO" },
      usuario: { id: "u-tec", papel: "TECNICO" },
    });

    await expect(atualizarStatus(req, resMock())).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(osService.atualizarStatus).not.toHaveBeenCalled();
  });

  it("TÉCNICO pode fazer o fechamento parcial (AGUARDANDO_VALIDACAO) na própria OS", async () => {
    (osService.buscarOrdemServicoPorId as ReturnType<typeof vi.fn>).mockResolvedValue({
      funcionarioId: FUNC_TECNICO.id,
    });
    (osService.atualizarStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "os-1" });
    const res = resMock();
    const req = reqMock({
      params: { id: "os-1" },
      body: { status: "AGUARDANDO_VALIDACAO" },
      usuario: { id: "u-tec", papel: "TECNICO" },
    });

    await atualizarStatus(req, res);
    expect(osService.atualizarStatus).toHaveBeenCalledWith("os-1", {
      status: "AGUARDANDO_VALIDACAO",
    });
    expect(res.json).toHaveBeenCalledWith({ id: "os-1" });
  });

  it("TÉCNICO não pode alterar OS que não é dele → 403", async () => {
    (osService.buscarOrdemServicoPorId as ReturnType<typeof vi.fn>).mockResolvedValue({
      funcionarioId: "outro-func",
    });
    const req = reqMock({
      params: { id: "os-9" },
      body: { status: "AGUARDANDO_VALIDACAO" },
      usuario: { id: "u-tec", papel: "TECNICO" },
    });

    await expect(atualizarStatus(req, resMock())).rejects.toBeInstanceOf(AppError);
    expect(osService.atualizarStatus).not.toHaveBeenCalled();
  });

  it("SUPORTE pode concluir (fechamento total) a OS", async () => {
    (osService.atualizarStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "os-1" });
    const res = resMock();
    const req = reqMock({
      params: { id: "os-1" },
      body: { status: "CONCLUIDO" },
      usuario: { id: "u-sup", papel: "SUPORTE" },
    });

    await atualizarStatus(req, res);
    expect(osService.atualizarStatus).toHaveBeenCalledWith("os-1", { status: "CONCLUIDO" });
    // Suporte não passa pela busca de funcionário do técnico
    expect(buscarFuncionarioPorUsuarioId).not.toHaveBeenCalled();
  });
});

describe("listar — isolamento de visibilidade do técnico", () => {
  it("TÉCNICO só vê as próprias OS (força funcionarioId do login, ignora o da query)", async () => {
    (osService.listarOrdensServico as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const req = reqMock({
      query: { funcionarioId: "tentativa-de-espiar-outro" },
      usuario: { id: "u-tec", papel: "TECNICO" },
    });

    await listar(req, resMock());
    expect(osService.listarOrdensServico).toHaveBeenCalledWith(
      expect.objectContaining({ funcionarioId: FUNC_TECNICO.id })
    );
  });

  it("SUPORTE vê todas as OS (respeita o filtro da query, sem forçar o próprio id)", async () => {
    (osService.listarOrdensServico as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const req = reqMock({
      query: { funcionarioId: "func-x" },
      usuario: { id: "u-sup", papel: "SUPORTE" },
    });

    await listar(req, resMock());
    expect(osService.listarOrdensServico).toHaveBeenCalledWith(
      expect.objectContaining({ funcionarioId: "func-x" })
    );
    expect(buscarFuncionarioPorUsuarioId).not.toHaveBeenCalled();
  });
});
