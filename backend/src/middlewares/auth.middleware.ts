import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError";

export interface UsuarioLogado {
  id: string;
  papel: "DONO" | "GESTOR" | "TECNICO" | "CLIENTE";
}

// Estende o Request do Express para carregar o usuário autenticado
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioLogado;
    }
  }
}

export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next(new AppError("Token não informado.", 401));
  }

  const token = header.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as UsuarioLogado;
    req.usuario = payload;
    next();
  } catch {
    return next(new AppError("Token inválido ou expirado.", 401));
  }
}

/**
 * Restringe uma rota a determinados papéis.
 * Uso: router.get("/", autenticar, autorizar("DONO", "GESTOR"), controller)
 */
export function autorizar(...papeisPermitidos: UsuarioLogado["papel"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario || !papeisPermitidos.includes(req.usuario.papel)) {
      return next(new AppError("Você não tem permissão para essa ação.", 403));
    }
    next();
  };
}
