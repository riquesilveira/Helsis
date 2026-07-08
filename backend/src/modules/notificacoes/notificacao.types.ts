/**
 * Qualquer provedor de envio (console, Twilio, Zenvia, etc.) implementa essa
 * interface. Isso é o que permite o sistema funcionar em modo simulado
 * (sem nenhuma credencial configurada) e depois trocar para um provedor real
 * mudando só a variável de ambiente NOTIFICATION_PROVIDER — nenhum outro
 * arquivo do sistema precisa mudar.
 */
export interface ResultadoEnvio {
  sucesso: boolean;
  erro?: string;
}

export interface ProvedorNotificacao {
  enviar(destinatario: string, mensagem: string): Promise<ResultadoEnvio>;
}
