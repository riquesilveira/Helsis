import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { AppError } from "../utils/AppError";

// Raiz onde os binários de anexo ficam salvos em disco. Servida
// estaticamente em /uploads (ver app.ts). Fica fora de src/ pra não ser
// varrida pelo ts-node-dev e disparar respawns a cada upload.
export const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
export const UPLOADS_ROUTE = "/uploads";

// Tipos aceitos: imagens (fotos da peça/equipamento) e PDF (laudos).
const MIME_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

const TAMANHO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB por arquivo

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    // Um subdiretório por OS mantém a pasta organizada e facilita limpeza.
    const dir = path.join(UPLOADS_DIR, `os-${req.params.id}`);
    fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

export const uploadAnexo = multer({
  storage,
  limits: { fileSize: TAMANHO_MAX_BYTES },
  fileFilter(_req, file, cb) {
    if (!MIME_PERMITIDOS.has(file.mimetype)) {
      return cb(new AppError("Tipo de arquivo não suportado. Envie imagem ou PDF.", 400));
    }
    cb(null, true);
  },
});

/** Caminho relativo (servível pela web) de um arquivo salvo de uma OS. */
export function urlRelativaAnexo(osId: string, filename: string): string {
  return `${UPLOADS_ROUTE}/os-${osId}/${filename}`;
}

/** Remove o arquivo físico de um anexo, ignorando se já não existir. */
export function removerArquivoAnexo(url: string) {
  // url é do tipo /uploads/os-<id>/<file>; resolve pro caminho absoluto.
  const relativo = url.replace(`${UPLOADS_ROUTE}/`, "");
  const absoluto = path.join(UPLOADS_DIR, relativo);
  fs.promises.unlink(absoluto).catch(() => {
    /* arquivo já removido — nada a fazer */
  });
}
