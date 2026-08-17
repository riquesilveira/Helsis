/**
 * Abstração de armazenamento de anexos. Igual à ideia do provedor de
 * notificação: o resto do sistema não sabe se o binário foi pro disco local ou
 * pra um bucket S3/R2 — só pede pra salvar/remover e recebe/usa a `url`.
 *
 * Isso é o que permite trocar disco efêmero (padrão em dev / Render free) por
 * storage externo durável (Cloudflare R2, AWS S3, Backblaze B2, MinIO) mudando
 * só a variável STORAGE_DRIVER, sem mexer no controller nem no banco.
 */
export interface ArquivoParaSalvar {
  /** Conteúdo do arquivo (multer memoryStorage → req.file.buffer). */
  buffer: Buffer;
  /** Nome original enviado pelo usuário (usado pra extrair a extensão). */
  nomeOriginal: string;
  /** MIME type (ex: image/jpeg, application/pdf). */
  mimetype: string;
}

export interface ArmazenamentoAnexo {
  /**
   * Salva o binário de um anexo de uma OS e devolve a `url` que vai pro banco.
   * No driver local a url é relativa (/uploads/...); no S3 é absoluta.
   */
  salvar(osId: string, arquivo: ArquivoParaSalvar): Promise<{ url: string }>;
  /** Remove o binário. Nunca lança se o arquivo já não existir. */
  remover(url: string): Promise<void>;
}
