import { ProvedorNotificacao, ResultadoEnvio } from "../notificacao.types";

/**
 * Provedor real usando a Zenvia (gateway brasileiro de SMS/WhatsApp).
 * Usa a API v2 de mensageria da Zenvia via HTTP — não precisa de SDK, então
 * não adiciona nenhuma dependência nova ao projeto (usa o fetch nativo do Node
 * 18+, o mesmo runtime do Render).
 *
 * Variáveis de ambiente necessárias:
 *   ZENVIA_API_TOKEN               token da conta (header X-API-TOKEN)
 *   NOTIFICATION_CHANNEL=WHATSAPP  (ou SMS)
 *   ZENVIA_WHATSAPP_FROM           identificador do remetente WhatsApp aprovado
 *   ZENVIA_SMS_FROM                identificador do remetente SMS
 *
 * Docs: https://zenvia.github.io/zenvia-openapi-spec/v2/
 */
export class ZenviaProvider implements ProvedorNotificacao {
  private token: string;
  private canal: "sms" | "whatsapp";
  private remetente: string;

  constructor() {
    const token = process.env.ZENVIA_API_TOKEN;
    if (!token) {
      throw new Error(
        "ZENVIA_API_TOKEN precisa estar configurado no .env para usar o provedor Zenvia."
      );
    }
    this.token = token;

    const canalEnv = (process.env.NOTIFICATION_CHANNEL || "WHATSAPP").toUpperCase();
    this.canal = canalEnv === "SMS" ? "sms" : "whatsapp";

    this.remetente =
      this.canal === "whatsapp"
        ? process.env.ZENVIA_WHATSAPP_FROM || ""
        : process.env.ZENVIA_SMS_FROM || "";

    if (!this.remetente) {
      throw new Error(
        `Configure ${
          this.canal === "whatsapp" ? "ZENVIA_WHATSAPP_FROM" : "ZENVIA_SMS_FROM"
        } no .env.`
      );
    }
  }

  private formatarNumero(numero: string): string {
    // Zenvia espera E.164 sem o "+" (só dígitos com código do país).
    const digitos = numero.replace(/\D/g, "");
    return digitos.startsWith("55") ? digitos : `55${digitos}`;
  }

  async enviar(destinatario: string, mensagem: string): Promise<ResultadoEnvio> {
    try {
      const resposta = await fetch(
        `https://api.zenvia.com/v2/channels/${this.canal}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-TOKEN": this.token,
          },
          body: JSON.stringify({
            from: this.remetente,
            to: this.formatarNumero(destinatario),
            contents: [{ type: "text", text: mensagem }],
          }),
        }
      );

      if (!resposta.ok) {
        const corpo = await resposta.text();
        return { sucesso: false, erro: `Zenvia respondeu ${resposta.status}: ${corpo}` };
      }

      return { sucesso: true };
    } catch (err) {
      return { sucesso: false, erro: err instanceof Error ? err.message : "Erro desconhecido." };
    }
  }
}
