import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ArmazenamentoAnexo, ArquivoParaSalvar } from "./storage.types";

// Raiz onde os binários de anexo ficam salvos em disco. Servida estaticamente
// em /uploads (ver app.ts). Fica fora de src/ pra não ser varrida pelo
// ts-node-dev e disparar respawns a cada upload.
export const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
export const UPLOADS_ROUTE = "/uploads";

/**
 * Driver padrão: grava o binário no disco local do servidor. Simples e sem
 * dependência externa — bom pra desenvolvimento. ⚠️ Em hospedagem com disco
 * efêmero (Render free, serverless) os arquivos somem a cada deploy/restart;
 * pra produção real use o driver "s3" (STORAGE_DRIVER=s3).
 */
export class LocalStorage implements ArmazenamentoAnexo {
  async salvar(osId: string, arquivo: ArquivoParaSalvar): Promise<{ url: string }> {
    // Um subdiretório por OS mantém a pasta organizada e facilita a limpeza.
    const dir = path.join(UPLOADS_DIR, `os-${osId}`);
    await fs.promises.mkdir(dir, { recursive: true });

    const ext = path.extname(arquivo.nomeOriginal).toLowerCase();
    const filename = `${randomUUID()}${ext}`;
    await fs.promises.writeFile(path.join(dir, filename), arquivo.buffer);

    return { url: `${UPLOADS_ROUTE}/os-${osId}/${filename}` };
  }

  async remover(url: string): Promise<void> {
    // url é do tipo /uploads/os-<id>/<file>; resolve pro caminho absoluto.
    const relativo = url.replace(`${UPLOADS_ROUTE}/`, "");
    const absoluto = path.join(UPLOADS_DIR, relativo);
    await fs.promises.unlink(absoluto).catch(() => {
      /* arquivo já removido — nada a fazer */
    });
  }
}
