import { ArmazenamentoAnexo } from "./storage.types";
import { LocalStorage } from "./local.storage";

let armazenamentoCache: ArmazenamentoAnexo | null = null;

/**
 * Escolhe o driver de storage com base em STORAGE_DRIVER.
 * Padrão é "local" (disco) — funciona out of the box em dev. Para produção
 * durável, defina STORAGE_DRIVER=s3 e as credenciais do bucket no .env.
 *
 * O import do driver S3 é preguiçoso (só quando é o escolhido) pra o sistema
 * não exigir `aws4fetch`/credenciais quando roda em modo local.
 */
export function obterArmazenamento(): ArmazenamentoAnexo {
  if (armazenamentoCache) return armazenamentoCache;

  const driver = (process.env.STORAGE_DRIVER || "local").toLowerCase();

  if (driver === "s3") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { S3Storage } = require("./s3.storage");
    armazenamentoCache = new S3Storage();
  } else {
    armazenamentoCache = new LocalStorage();
  }

  return armazenamentoCache as ArmazenamentoAnexo;
}

export { UPLOADS_DIR, UPLOADS_ROUTE } from "./local.storage";
export type { ArmazenamentoAnexo, ArquivoParaSalvar } from "./storage.types";
