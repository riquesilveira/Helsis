import { ProvedorNotificacao, ResultadoEnvio } from "../notificacao.types";

/**
 * Provedor padrão: não envia nada de verdade, só imprime no log do servidor.
 * Existe pra o sistema funcionar "out of the box" em desenvolvimento, sem
 * precisar de conta em nenhum serviço de SMS/WhatsApp. Em produção, troque
 * NOTIFICATION_PROVIDER=console por NOTIFICATION_PROVIDER=twilio no .env.
 */
export class ConsoleProvider implements ProvedorNotificacao {
  async enviar(destinatario: string, mensagem: string): Promise<ResultadoEnvio> {
    console.log("──────────────────────────────────────────");
    console.log(`📩 [SIMULADO] Notificação para ${destinatario}`);
    console.log(mensagem);
    console.log("──────────────────────────────────────────");
    return { sucesso: true };
  }
}
