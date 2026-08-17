import { ProvedorNotificacao, ResultadoEnvio } from "../notificacao.types";

/**
 * Provedor real usando a WhatsApp Cloud API oficial da Meta (Graph API).
 * Envia direto pela API da Meta, sem intermediário — usa o fetch nativo do
 * Node 18+, então não adiciona dependência nova.
 *
 * ⚠️ Fora da janela de 24h de atendimento, a Meta só permite enviar mensagens
 * de TEMPLATE pré-aprovado (não texto livre). Para notificações proativas de
 * mudança de status, cadastre um template com um único parâmetro de corpo e
 * informe o nome dele em WHATSAPP_CLOUD_TEMPLATE. Se o template não for
 * configurado, o provedor cai para texto livre (útil em teste/sandbox e dentro
 * da janela de 24h).
 *
 * Variáveis de ambiente necessárias:
 *   WHATSAPP_CLOUD_TOKEN           token de acesso permanente do app
 *   WHATSAPP_CLOUD_PHONE_ID        ID do número de telefone (phone_number_id)
 *   WHATSAPP_CLOUD_TEMPLATE        (opcional) nome do template aprovado
 *   WHATSAPP_CLOUD_TEMPLATE_LANG   (opcional) locale do template, ex: pt_BR
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export class WhatsAppCloudProvider implements ProvedorNotificacao {
  private token: string;
  private phoneId: string;
  private template?: string;
  private templateLang: string;

  constructor() {
    const token = process.env.WHATSAPP_CLOUD_TOKEN;
    const phoneId = process.env.WHATSAPP_CLOUD_PHONE_ID;

    if (!token || !phoneId) {
      throw new Error(
        "WHATSAPP_CLOUD_TOKEN e WHATSAPP_CLOUD_PHONE_ID precisam estar configurados no .env para usar o provedor WhatsApp Cloud."
      );
    }

    this.token = token;
    this.phoneId = phoneId;
    this.template = process.env.WHATSAPP_CLOUD_TEMPLATE || undefined;
    this.templateLang = process.env.WHATSAPP_CLOUD_TEMPLATE_LANG || "pt_BR";
  }

  private formatarNumero(numero: string): string {
    // Cloud API espera E.164 sem o "+" (só dígitos com código do país).
    const digitos = numero.replace(/\D/g, "");
    return digitos.startsWith("55") ? digitos : `55${digitos}`;
  }

  private montarCorpo(destinatario: string, mensagem: string) {
    const to = this.formatarNumero(destinatario);

    if (this.template) {
      // Mensagem de template — obrigatória fora da janela de 24h. O template
      // deve ter um único parâmetro no corpo, preenchido com a mensagem montada.
      return {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: this.template,
          language: { code: this.templateLang },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: mensagem }],
            },
          ],
        },
      };
    }

    // Texto livre — válido dentro da janela de 24h / em sandbox de teste.
    return {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: mensagem },
    };
  }

  async enviar(destinatario: string, mensagem: string): Promise<ResultadoEnvio> {
    try {
      const resposta = await fetch(
        `https://graph.facebook.com/v21.0/${this.phoneId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(this.montarCorpo(destinatario, mensagem)),
        }
      );

      if (!resposta.ok) {
        const corpo = await resposta.text();
        return {
          sucesso: false,
          erro: `WhatsApp Cloud respondeu ${resposta.status}: ${corpo}`,
        };
      }

      return { sucesso: true };
    } catch (err) {
      return { sucesso: false, erro: err instanceof Error ? err.message : "Erro desconhecido." };
    }
  }
}
