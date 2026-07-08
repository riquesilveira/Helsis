import twilio from "twilio";
import { ProvedorNotificacao, ResultadoEnvio } from "../notificacao.types";

/**
 * Provedor real usando Twilio. Funciona tanto para SMS quanto para WhatsApp
 * (a Twilio trata os dois de forma parecida — WhatsApp só exige o prefixo
 * "whatsapp:" no número de origem e destino, e que o número de origem esteja
 * habilitado para WhatsApp no console da Twilio).
 *
 * Variáveis de ambiente necessárias:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   NOTIFICATION_CHANNEL=WHATSAPP  (ou SMS)
 *   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   (se WHATSAPP)
 *   TWILIO_SMS_FROM=+14155551234                  (se SMS)
 */
export class TwilioProvider implements ProvedorNotificacao {
  private client: ReturnType<typeof twilio>;
  private numeroOrigem: string;
  private canal: "SMS" | "WHATSAPP";

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error(
        "TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN precisam estar configurados no .env para usar o provedor Twilio."
      );
    }

    this.canal = (process.env.NOTIFICATION_CHANNEL as "SMS" | "WHATSAPP") || "WHATSAPP";
    this.numeroOrigem =
      this.canal === "WHATSAPP"
        ? process.env.TWILIO_WHATSAPP_FROM || ""
        : process.env.TWILIO_SMS_FROM || "";

    if (!this.numeroOrigem) {
      throw new Error(
        `Configure ${
          this.canal === "WHATSAPP" ? "TWILIO_WHATSAPP_FROM" : "TWILIO_SMS_FROM"
        } no .env.`
      );
    }

    this.client = twilio(accountSid, authToken);
  }

  private formatarNumero(numero: string): string {
    // Normaliza pra E.164 básico (assume Brasil se vier sem código do país)
    const digitos = numero.replace(/\D/g, "");
    const comCodigoPais = digitos.startsWith("55") ? digitos : `55${digitos}`;
    const numeroFormatado = `+${comCodigoPais}`;
    return this.canal === "WHATSAPP" ? `whatsapp:${numeroFormatado}` : numeroFormatado;
  }

  async enviar(destinatario: string, mensagem: string): Promise<ResultadoEnvio> {
    try {
      await this.client.messages.create({
        from: this.numeroOrigem,
        to: this.formatarNumero(destinatario),
        body: mensagem,
      });
      return { sucesso: true };
    } catch (err) {
      return { sucesso: false, erro: err instanceof Error ? err.message : "Erro desconhecido." };
    }
  }
}
