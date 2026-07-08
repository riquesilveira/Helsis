import { Request, Response } from "express";
import { z } from "zod";
import { login } from "./auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
});

export async function loginController(req: Request, res: Response) {
  const dados = loginSchema.parse(req.body);
  const resultado = await login(dados);
  res.json(resultado);
}
