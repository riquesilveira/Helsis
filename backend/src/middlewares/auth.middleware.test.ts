import { describe, it, expect, vi, beforeAll } from "vitest";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { autenticar, autorizar, type UsuarioLogado } from "./auth.middleware";
import { AppError } from "../utils/AppError";

const JWT_SECRET = "segredo-de-teste";

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

/** Monta um trio (req, res, next) mínimo para exercitar o middleware. */
function contexto(overrides: Partial<Request> = {}) {
  const req = { headers: {}, ...overrides } as Request;
  const res = {} as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next: next as ReturnType<typeof vi.fn> };
}

function comPapel(papel: UsuarioLogado["papel"]): Request {
  return { usuario: { id: "u1", papel } } as Request;
}

describe("autenticar", () => {
  it("rejeita quando não há header Authorization", () => {
    const { req, res, next } = contexto();
    autenticar(req, res, next);
    const erro = next.mock.calls[0][0];
    expect(erro).toBeInstanceOf(AppError);
    expect(erro.statusCode).toBe(401);
  });

  it("rejeita token inválido/expirado com 401", () => {
    const { req, res, next } = contexto({
      headers: { authorization: "Bearer token-invalido" } as Request["headers"],
    });
    autenticar(req, res, next);
    const erro = next.mock.calls[0][0];
    expect(erro).toBeInstanceOf(AppError);
    expect(erro.statusCode).toBe(401);
  });

  it("aceita token válido e injeta req.usuario com o papel do payload", () => {
    const token = jwt.sign({ id: "u1", papel: "GESTOR" }, JWT_SECRET);
    const { req, res, next } = contexto({
      headers: { authorization: `Bearer ${token}` } as Request["headers"],
    });
    autenticar(req, res, next);
    expect(next).toHaveBeenCalledWith(); // next() sem erro
    expect(req.usuario).toMatchObject({ id: "u1", papel: "GESTOR" });
  });
});

describe("autorizar — matriz de papéis", () => {
  const papeis: UsuarioLogado["papel"][] = ["DONO", "GESTOR", "SUPORTE", "TECNICO", "CLIENTE"];

  it("bloqueia (403) quando o papel não está na lista permitida", () => {
    const { res, next } = contexto();
    autorizar("DONO", "GESTOR")(comPapel("TECNICO"), res, next);
    const erro = next.mock.calls[0][0];
    expect(erro).toBeInstanceOf(AppError);
    expect(erro.statusCode).toBe(403);
  });

  it("libera (next sem erro) quando o papel está na lista", () => {
    const { res, next } = contexto();
    autorizar("DONO", "GESTOR", "SUPORTE")(comPapel("SUPORTE"), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("bloqueia requisição sem usuário autenticado", () => {
    const { res, next } = contexto();
    autorizar("DONO")({} as Request, res, next);
    const erro = next.mock.calls[0][0];
    expect(erro.statusCode).toBe(403);
  });

  // Espelha a spec do Jurandir: quem pode abrir chamado / cadastrar cliente
  // (Suporte N2 pra cima) versus quem só executa (Técnico N1).
  describe("abertura de OS / cadastro de cliente → SUPORTE pra cima", () => {
    const guarda = autorizar("DONO", "GESTOR", "SUPORTE");
    it.each(papeis)("papel %s", (papel) => {
      const { res, next } = contexto();
      guarda(comPapel(papel), res, next);
      const permitido = ["DONO", "GESTOR", "SUPORTE"].includes(papel);
      if (permitido) {
        expect(next).toHaveBeenCalledWith();
      } else {
        expect(next.mock.calls[0][0].statusCode).toBe(403);
      }
    });
  });

  // Fechamento financeiro é decisão de negócio: só Dono/Gestor.
  describe("fechamento financeiro → só DONO/GESTOR", () => {
    const guarda = autorizar("DONO", "GESTOR");
    it.each(papeis)("papel %s", (papel) => {
      const { res, next } = contexto();
      guarda(comPapel(papel), res, next);
      const permitido = ["DONO", "GESTOR"].includes(papel);
      if (permitido) {
        expect(next).toHaveBeenCalledWith();
      } else {
        expect(next.mock.calls[0][0].statusCode).toBe(403);
      }
    });
  });
});
