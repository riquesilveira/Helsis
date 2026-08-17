import multer from "multer";
import { AppError } from "../utils/AppError";

// Tipos aceitos: imagens (fotos da peça/equipamento) e PDF (laudos).
const MIME_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

const TAMANHO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB por arquivo

// memoryStorage: o binário chega em req.file.buffer e QUEM decide onde ele é
// gravado é a camada de storage (src/lib/storage) — disco local ou bucket S3,
// conforme STORAGE_DRIVER. 10 MB cabe folgado em memória.
export const uploadAnexo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAX_BYTES },
  fileFilter(_req, file, cb) {
    if (!MIME_PERMITIDOS.has(file.mimetype)) {
      return cb(new AppError("Tipo de arquivo não suportado. Envie imagem ou PDF.", 400));
    }
    cb(null, true);
  },
});
