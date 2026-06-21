/**
 * Serviço de notificações (placeholder).
 *
 * Quando o canal de notificação for definido (email, WhatsApp, push),
 * implementar as integrações aqui. Por enquanto, apenas loga no console
 * do Worker (visível via wrangler tail).
 */

export type TipoNotificacao =
  | 'agendamento_criado'
  | 'agendamento_confirmado'
  | 'agendamento_cancelado'
  | 'agendamento_concluido'
  | 'agendamento_reagendado'

interface DadosNotificacao {
  tipo: TipoNotificacao
  destinatarioId: string
  destinatarioNome: string
  agendamentoId: string
  dataHora: string
  barbeiroNome?: string
  servicoNome?: string
}

/**
 * Envia uma notificação.
 * TODO: Implementar integração com o canal escolhido (email, WhatsApp, push).
 */
export async function enviarNotificacao(dados: DadosNotificacao): Promise<void> {
  // Log interno — visível apenas via wrangler tail / Cloudflare Logs
  console.log('[NOTIFICAÇÃO]', {
    tipo: dados.tipo,
    destinatario: dados.destinatarioNome,
    agendamento: dados.agendamentoId,
    dataHora: dados.dataHora,
  })

  // Placeholder: quando o canal for definido, adicionar a implementação aqui
  // Exemplos:
  // - Email: integrar com Mailgun, Resend, SendGrid via fetch
  // - WhatsApp: integrar com Twilio, Z-API, Evolution API
  // - Push: integrar com Web Push ou Firebase Cloud Messaging
}
