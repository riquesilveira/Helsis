import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    tarefaOS: { findMany: vi.fn(), update: vi.fn((args) => args) },
    $transaction: vi.fn((ops: unknown[]) => Promise.resolve(ops)),
  },
}));

import { prisma } from "../../lib/prisma";
import { camposDePausa, pausarTarefasEmAndamento } from "./tarefaOS.service";

const mock = prisma as unknown as {
  tarefaOS: { findMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const agora = new Date("2026-11-12T12:00:00Z");
const haSegundos = (s: number) => new Date(agora.getTime() - s * 1000);

beforeEach(() => vi.clearAllMocks());

describe("camposDePausa", () => {
  it("soma o segmento atual ao acumulado e fecha o segmento", () => {
    expect(camposDePausa({ duracaoAcumuladaSegundos: 100, iniciadoEm: haSegundos(60) }, agora)).toEqual({
      status: "PAUSADO",
      duracaoAcumuladaSegundos: 160,
      iniciadoEm: null,
      finalizadoEm: null,
      duracaoSegundos: null,
    });
  });

  it("sem segmento aberto, mantém o acumulado", () => {
    expect(camposDePausa({ duracaoAcumuladaSegundos: null, iniciadoEm: null }, agora).duracaoAcumuladaSegundos).toBe(0);
  });
});

describe("pausarTarefasEmAndamento", () => {
  it("pausa só as tarefas EM_ANDAMENTO da OS, guardando o tempo corrido", async () => {
    mock.tarefaOS.findMany.mockResolvedValue([
      { id: "t1", duracaoAcumuladaSegundos: 0, iniciadoEm: haSegundos(30) },
      { id: "t2", duracaoAcumuladaSegundos: 50, iniciadoEm: haSegundos(10) },
    ]);
    const n = await pausarTarefasEmAndamento("os-1", agora);
    expect(n).toBe(2);
    expect(mock.tarefaOS.findMany.mock.calls[0][0].where).toEqual({ ordemServicoId: "os-1", status: "EM_ANDAMENTO" });
    const updates = mock.tarefaOS.update.mock.calls.map((c) => c[0]);
    expect(updates.map((u) => [u.where.id, u.data.status, u.data.duracaoAcumuladaSegundos])).toEqual([
      ["t1", "PAUSADO", 30],
      ["t2", "PAUSADO", 60],
    ]);
  });

  it("sem tarefa em andamento, não altera nada", async () => {
    mock.tarefaOS.findMany.mockResolvedValue([]);
    expect(await pausarTarefasEmAndamento("os-1", agora)).toBe(0);
    expect(mock.tarefaOS.update).not.toHaveBeenCalled();
  });
});
