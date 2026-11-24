import { describe, it, expect, vi } from "vitest";

vi.mock("../../lib/prisma", () => ({ prisma: {} }));

import { empresaSchema } from "./configuracao.controller";

const whatsapp = (v: string) => empresaSchema.safeParse({ whatsapp: v });

describe("empresaSchema.whatsapp", () => {
  it("sem DDI (DDD + celular), acrescenta o 55", () => {
    const r = whatsapp("(11) 99999-8888");
    expect(r.success && r.data.whatsapp).toBe("5511999998888");
  });

  it("sem DDI (DDD + fixo, 10 dígitos), acrescenta o 55", () => {
    const r = whatsapp("11 3333-4444");
    expect(r.success && r.data.whatsapp).toBe("551133334444");
  });

  it("com DDI, mantém", () => {
    const r = whatsapp("+55 (11) 99999-8888");
    expect(r.success && r.data.whatsapp).toBe("5511999998888");
  });

  it("vazio vira null", () => {
    const r = whatsapp("  ");
    expect(r.success && r.data.whatsapp).toBeNull();
  });

  it("número curto é recusado", () => {
    expect(whatsapp("123").success).toBe(false);
  });
});
