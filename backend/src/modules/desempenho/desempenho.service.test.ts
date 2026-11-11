import { describe, it, expect, vi } from "vitest";

vi.mock("../../lib/prisma", () => ({ prisma: {} }));

import {
  calcularMediaTentativasPorOrdem,
  calcularTempoMedioResolucaoHoras,
} from "./desempenho.service";

const h = (horas: number) => new Date(Date.UTC(2026, 0, 1) + horas * 3_600_000);

describe("calcularMediaTentativasPorOrdem", () => {
  it("conta a tentativa que resolveu (numeroTentativas guarda só as falhas)", () => {
    expect(calcularMediaTentativasPorOrdem([{ numeroTentativas: 0 }, { numeroTentativas: 0 }, { numeroTentativas: 0 }])).toBe(1);
    expect(calcularMediaTentativasPorOrdem([{ numeroTentativas: 0 }, { numeroTentativas: 2 }])).toBe(2);
  });

  it("devolve 0 sem OS concluídas", () => {
    expect(calcularMediaTentativasPorOrdem([])).toBe(0);
  });
});

describe("calcularTempoMedioResolucaoHoras", () => {
  it("faz a média de abertura até conclusão", () => {
    expect(
      calcularTempoMedioResolucaoHoras([
        { dataAbertura: h(0), dataConclusao: h(10) },
        { dataAbertura: h(0), dataConclusao: h(20) },
      ])
    ).toBe(15);
  });

  it("ignora conclusão anterior à abertura em vez de gerar tempo negativo", () => {
    expect(
      calcularTempoMedioResolucaoHoras([
        { dataAbertura: h(600), dataConclusao: h(0) },
        { dataAbertura: h(0), dataConclusao: h(8) },
      ])
    ).toBe(8);
  });

  it("devolve null quando nenhum registro é válido", () => {
    expect(calcularTempoMedioResolucaoHoras([{ dataAbertura: h(600), dataConclusao: h(0) }])).toBeNull();
    expect(calcularTempoMedioResolucaoHoras([{ dataAbertura: h(0), dataConclusao: null }])).toBeNull();
  });
});
