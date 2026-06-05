import { Resend } from 'resend'
import { buildEmail, type EmailBrand, type EmailProps } from '../../src/features/email/templates'
import { serverSupabase } from './supabase'

export interface SendArgs {
  to: string
  templateId: string
  brand: EmailBrand
  props?: EmailProps
  contactId?: string | null
  sequenceStepId?: string | null
}

/**
 * Render a template and send via Resend, logging to email_logs. If RESEND_API_KEY
 * is absent the send is SIMULATED (logged only) so nothing crashes pre-go-live.
 * Returns the message id.
 */
export async function sendEmail(args: SendArgs): Promise<string> {
  const { subject, html } = buildEmail(args.templateId, args.brand, args.props ?? {})
  const from = args.brand.from_email
    ? `${args.brand.name} <${args.brand.from_email}>`
    : 'RedCube <onboarding@resend.dev>'

  const apiKey = process.env.RESEND_API_KEY
  let messageId = `sim_${Date.now()}_${Math.round(Math.random() * 1e6)}`
  let status = 'simulated'

  if (apiKey) {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({ from, to: args.to, subject, html })
    if (error) {
      status = 'failed'
    } else {
      messageId = data?.id ?? messageId
      status = 'sent'
    }
  }

  try {
    const supabase = serverSupabase()
    await supabase.from('email_logs').insert({
      contact_id: args.contactId ?? null,
      sequence_step_id: args.sequenceStepId ?? null,
      message_id: messageId,
      template_id: args.templateId,
      subject,
      to_email: args.to,
      status,
      sent_at: new Date().toISOString(),
    })
  } catch {
    // logging failure shouldn't break the send
  }

  return messageId
}
