import { describe, it, expect, vi } from "vitest";

vi.mock("../../lib/prisma", () => ({ prisma: {} }));

import { paraDataAgendada, paraDiaLocal, semEtapasRepetidas } from "./ordemServico.service";

describe("semEtapasRepetidas (portal do cliente)", () => {
  it("junta etapas iguais seguidas, como a designação de técnico", () => {
    const h = [
      { status: "RECEBIDO", n: 1 },
      { status: "RECEBIDO", n: 2 }, // "Chamado designado a ..."
      { status: "EM_REPARO", n: 3 },
      { status: "CONCLUIDO", n: 4 },
    ] as const;
    expect(semEtapasRepetidas([...h]).map((x) => x.n)).toEqual([1, 3, 4]);
  });

  it("mantém a mesma etapa quando ela volta depois de outra (reabertura)", () => {
    const h = [{ status: "EM_REPARO" }, { status: "CONCLUIDO" }, { status: "EM_REPARO" }] as never[];
    expect(semEtapasRepetidas(h)).toHaveLength(3);
  });
});

describe("paraDataAgendada", () => {
  it("grava AAAA-MM-DD ao meio-dia local, dentro da janela do dia da rota", () => {
    const d = paraDataAgendada("2026-11-19");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 19, 12]);
    const inicio = paraDiaLocal("2026-11-19");
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 1);
    expect(d >= inicio && d < fim).toBe(true);
  });

  it("paraDiaLocal lê o dia da rota como meia-noite local, não UTC", () => {
    const d = paraDiaLocal("2026-11-19");
    expect([d.getDate(), d.getHours()]).toEqual([19, 0]);
  });

  it("aceita data e hora completas", () => {
    expect(paraDataAgendada("2026-11-19T15:00:00.000Z").toISOString()).toBe("2026-11-19T15:00:00.000Z");
  });
});
