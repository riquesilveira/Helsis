import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/AppError";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ erro: err.message });
  }

  if (err instanceof ZodError) {
    const mensagem = err.errors.map((e) => e.message).join(", ");
    return res.status(400).json({ erro: mensagem });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
    return res.status(400).json({ erro: "Não é possível excluir: existem registros vinculados a este item." });
  }

  console.error(err);
  return res.status(500).json({ erro: "Erro interno no servidor." });
}
