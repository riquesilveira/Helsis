import { randomUUID } from "node:crypto";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import { ArmazenamentoAnexo, ArquivoParaSalvar } from "./storage.types";

/**
 * Driver de storage compatível com S3 — funciona com Cloudflare R2 (recomendado:
 * sem taxa de egress), AWS S3, Backblaze B2 e MinIO. Usa `aws4fetch` (assinatura
 * SigV4 minúscula) sobre o fetch nativo, sem trazer o SDK inteiro da AWS.
 *
 * Variáveis de ambiente necessárias (STORAGE_DRIVER=s3):
 *   S3_ENDPOINT      URL base do serviço, SEM o bucket. Ex (R2):
 *                    https://<accountid>.r2.cloudflarestorage.com
 *   S3_BUCKET        nome do bucket
 *   S3_ACCESS_KEY_ID
 *   S3_SECRET_ACCESS_KEY
 *   S3_REGION        opcional (padrão "auto", que é o valor do R2)
 *   S3_PUBLIC_URL    URL pública de leitura dos objetos, SEM barra final. Ex:
 *                    https://<bucket>.<accountid>.r2.dev  ou um domínio custom.
 *                    É a base guardada no banco e servida ao frontend.
 */
export class S3Storage implements ArmazenamentoAnexo {
  private client: AwsClient;
  private endpoint: string;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT;
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const publicUrl = process.env.S3_PUBLIC_URL;

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !publicUrl) {
      throw new Error(
        "Storage S3 exige S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY e S3_PUBLIC_URL no .env."
      );
    }

    this.endpoint = endpoint.replace(/\/$/, "");
    this.bucket = bucket;
    this.publicUrl = publicUrl.replace(/\/$/, "");
    this.client = new AwsClient({
      accessKeyId,
      secretAccessKey,
      region: process.env.S3_REGION || "auto",
      service: "s3",
    });
  }

  private urlObjeto(chave: string): string {
    return `${this.endpoint}/${this.bucket}/${chave}`;
  }

  /** Deriva a chave do objeto a partir da url pública guardada no banco. */
  private chaveDaUrl(url: string): string | null {
    if (!url.startsWith(this.publicUrl)) return null;
    return url.slice(this.publicUrl.length).replace(/^\//, "");
  }

  async salvar(osId: string, arquivo: ArquivoParaSalvar): Promise<{ url: string }> {
    const ext = path.extname(arquivo.nomeOriginal).toLowerCase();
    const chave = `os-${osId}/${randomUUID()}${ext}`;

    const resposta = await this.client.fetch(this.urlObjeto(chave), {
      method: "PUT",
      body: arquivo.buffer,
      headers: { "content-type": arquivo.mimetype },
    });

    if (!resposta.ok) {
      const corpo = await resposta.text();
      throw new Error(`Falha ao enviar anexo pro storage (${resposta.status}): ${corpo}`);
    }

    return { url: `${this.publicUrl}/${chave}` };
  }

  async remover(url: string): Promise<void> {
    const chave = this.chaveDaUrl(url);
    if (!chave) return; // url de outro driver/base — nada a remover aqui

    await this.client
      .fetch(this.urlObjeto(chave), { method: "DELETE" })
      .catch(() => {
        /* melhor esforço — não quebra o fluxo se a remoção falhar */
      });
  }
}
