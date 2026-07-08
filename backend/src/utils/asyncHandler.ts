import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Envolve um controller assíncrono e encaminha qualquer erro para o
 * middleware de tratamento de erros, sem precisar repetir try/catch
 * em cada controller.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
