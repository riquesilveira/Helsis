import { describe, it, expect, vi } from "vitest";

vi.mock("../../lib/prisma", () => ({ prisma: {} }));

import { calcularStatusPreventiva } from "./equipamento.service";

describe("calcularStatusPreventiva (dia do calendário no Brasil)", () => {
  // Preventiva para 18/09 gravada à meia-noite UTC = 17/09 21:00 em Brasília.
  const meiaNoiteUtc = new Date("2026-09-18T00:00:00Z");

  it("não fica atrasada às 21h da véspera (era o bug)", () => {
    // 17/09 22:00 em Brasília = 18/09 01:00Z: o instante já passou, o dia ainda não.
    expect(calcularStatusPreventiva(meiaNoiteUtc, new Date("2026-09-18T01:00:00Z"))).toBe("PROXIMA");
  });

  it("no próprio dia não está atrasada", () => {
    const noDia = new Date("2026-09-18T15:00:00Z"); // 18/09 12:00 em Brasília
    expect(calcularStatusPreventiva(new Date("2026-09-18T15:00:00Z"), noDia)).toBe("PROXIMA");
  });

  it("fica atrasada no dia seguinte, no horário de Brasília", () => {
    const diaSeguinte = new Date("2026-09-19T03:30:00Z"); // 19/09 00:30 em Brasília
    expect(calcularStatusPreventiva(new Date("2026-09-18T15:00:00Z"), diaSeguinte)).toBe("ATRASADA");
  });

  it("mais de 30 dias à frente fica em dia", () => {
    expect(calcularStatusPreventiva(new Date("2026-12-01T15:00:00Z"), new Date("2026-09-18T15:00:00Z"))).toBe("EM_DIA");
  });
});
