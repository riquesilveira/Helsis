import { describe, it, expect } from "vitest";
import { StatusOS } from "@prisma/client";
import { calcularSla, escolherContrato } from "./contrato.service";

const HORA = 3_600_000;

type Contrato = Parameters<typeof escolherContrato>[0][number];

function contrato(over: Partial<Contrato> = {}): Contrato {
  return {
    id: "c1",
    equipamentoId: null,
    slaHorasResposta: 24,
    vigenciaInicio: new Date("2026-01-01"),
    vigenciaFim: null,
    ativo: true,
    ...over,
  };
}

describe("escolherContrato — precedência e vigência", () => {
  const ref = new Date("2026-06-01");

  it("retorna null quando não há contratos", () => {
    expect(escolherContrato([], "eq1", ref)).toBeNull();
  });

  it("ignora contrato inativo", () => {
    const c = contrato({ ativo: false });
    expect(escolherContrato([c], "eq1", ref)).toBeNull();
  });

  it("ignora contrato fora da vigência (antes do início)", () => {
    const c = contrato({ vigenciaInicio: new Date("2026-12-01") });
    expect(escolherContrato([c], "eq1", ref)).toBeNull();
  });

  it("ignora contrato fora da vigência (após o fim)", () => {
    const c = contrato({ vigenciaFim: new Date("2026-03-01") });
    expect(escolherContrato([c], "eq1", ref)).toBeNull();
  });

  it("aceita contrato com vigenciaFim null (aberto)", () => {
    const c = contrato({ vigenciaFim: null });
    expect(escolherContrato([c], "eq1", ref)?.id).toBe("c1");
  });

  it("contrato específico do equipamento vence o geral do cliente", () => {
    const geral = contrato({ id: "geral", equipamentoId: null });
    const especifico = contrato({ id: "especifico", equipamentoId: "eq1" });
    expect(escolherContrato([geral, especifico], "eq1", ref)?.id).toBe("especifico");
  });

  it("cai no contrato geral quando não há específico do equipamento", () => {
    const geral = contrato({ id: "geral", equipamentoId: null });
    const outroEquip = contrato({ id: "outro", equipamentoId: "eq99" });
    expect(escolherContrato([geral, outroEquip], "eq1", ref)?.id).toBe("geral");
  });
});

describe("calcularSla — status do prazo de resposta", () => {
  const os = (over: Partial<Parameters<typeof calcularSla>[0]> = {}) => ({
    clienteId: "cli1",
    equipamentoId: "eq1",
    dataAbertura: new Date("2026-06-01T00:00:00Z"),
    statusHistoricos: [],
    ...over,
  });

  it("sem contrato → SEM_CONTRATO", () => {
    const sla = calcularSla(os(), null);
    expect(sla.status).toBe("SEM_CONTRATO");
    expect(sla.contratoId).toBeNull();
  });

  it("sem atendimento e dentro do prazo → NO_PRAZO com horasRestantes > 0", () => {
    // abertura agora, SLA 24h → prazo no futuro
    const sla = calcularSla(os({ dataAbertura: new Date() }), contrato({ slaHorasResposta: 24 }));
    expect(sla.status).toBe("NO_PRAZO");
    expect(sla.horasRestantes).toBeGreaterThan(0);
    expect(sla.respondidoEm).toBeNull();
  });

  it("sem atendimento e prazo estourado → ATRASADO", () => {
    // abertura 100h atrás, SLA 24h → prazo no passado
    const abertura = new Date(Date.now() - 100 * HORA);
    const sla = calcularSla(os({ dataAbertura: abertura }), contrato({ slaHorasResposta: 24 }));
    expect(sla.status).toBe("ATRASADO");
    expect(sla.horasRestantes).toBeNull();
  });

  it("primeiro atendimento dentro do prazo → CUMPRIDO", () => {
    const abertura = new Date("2026-06-01T00:00:00Z");
    const sla = calcularSla(
      os({
        dataAbertura: abertura,
        statusHistoricos: [
          { status: StatusOS.RECEBIDO, criadoEm: abertura },
          { status: StatusOS.DIAGNOSTICO, criadoEm: new Date(abertura.getTime() + 2 * HORA) },
        ],
      }),
      contrato({ slaHorasResposta: 24 })
    );
    expect(sla.status).toBe("CUMPRIDO");
    expect(sla.respondidoEm).toBe(new Date(abertura.getTime() + 2 * HORA).toISOString());
  });

  it("primeiro atendimento após o prazo → DESCUMPRIDO", () => {
    const abertura = new Date("2026-06-01T00:00:00Z");
    const sla = calcularSla(
      os({
        dataAbertura: abertura,
        statusHistoricos: [
          { status: StatusOS.DIAGNOSTICO, criadoEm: new Date(abertura.getTime() + 48 * HORA) },
        ],
      }),
      contrato({ slaHorasResposta: 24 })
    );
    expect(sla.status).toBe("DESCUMPRIDO");
  });

  it("mudança para RECEBIDO não conta como atendimento (fica NO_PRAZO/ATRASADO)", () => {
    const abertura = new Date();
    const sla = calcularSla(
      os({
        dataAbertura: abertura,
        statusHistoricos: [{ status: StatusOS.RECEBIDO, criadoEm: abertura }],
      }),
      contrato({ slaHorasResposta: 24 })
    );
    expect(sla.status).toBe("NO_PRAZO");
  });

  it("usa o primeiro atendimento (mais antigo) para decidir cumprimento", () => {
    const abertura = new Date("2026-06-01T00:00:00Z");
    const sla = calcularSla(
      os({
        dataAbertura: abertura,
        statusHistoricos: [
          // fora de ordem de propósito — o cálculo deve pegar o mais antigo (5h, dentro do prazo)
          { status: StatusOS.EM_REPARO, criadoEm: new Date(abertura.getTime() + 30 * HORA) },
          { status: StatusOS.DIAGNOSTICO, criadoEm: new Date(abertura.getTime() + 5 * HORA) },
        ],
      }),
      contrato({ slaHorasResposta: 24 })
    );
    expect(sla.status).toBe("CUMPRIDO");
  });
});
