/**
 * Erro de negócio conhecido (ex: "cliente não encontrado", "sem permissão").
 * Diferente de um erro inesperado, este já vem com o status HTTP correto.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}
