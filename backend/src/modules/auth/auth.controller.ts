import { Request, Response } from "express";
import { z } from "zod";
import { login } from "./auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
});

export async function loginController(req: Request, res: Response) {
  console.log("[login] JWT_SECRET defined:", !!process.env.JWT_SECRET);
  console.log("[login] DATABASE_URL defined:", !!process.env.DATABASE_URL);
  const dados = loginSchema.parse(req.body);
  const resultado = await login(dados);
  res.json(resultado);
}
