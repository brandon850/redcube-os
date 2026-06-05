import type { VercelRequest, VercelResponse } from '@vercel/node'
import { serverSupabase } from '../_lib/supabase'
import { sendEmail } from '../_lib/email'
import type { EmailBrand } from '../../src/features/email/templates'

// Runs every 5 minutes (vercel.json). Processes due sequence steps:
//  - send_email → render+send via Resend, log it
//  - wait       → no-op; its delay is applied when scheduling the next step
// then schedules the next step (delayed by a wait's days), or completes the enrollment.
export const config = { maxDuration: 60 }

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Optional shared-secret guard (set CRON_SECRET in Vercel to enforce).
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const supabase = serverSupabase()
  const nowIso = new Date().toISOString()

  // Default brand identity for sequence emails (sequences are org-wide today).
  const { data: brandRow } = await supabase
    .from('brands').select('name, brand_color, from_email').eq('is_default', true).maybeSingle()
  const brand: EmailBrand = {
    name: brandRow?.name ?? 'RedCube Creative',
    color: brandRow?.brand_color ?? '#E8172B',
    from_email: brandRow?.from_email ?? null,
  }

  // Due, pending steps with their step config + enrollment + contact.
  const { data: due, error } = await supabase
    .from('contact_sequence_steps')
    .select('id, contact_sequence_id, sequence_step_id, step:sequence_steps(type, config, position, sequence_id), enrollment:contact_sequences(id, contact_id, sequence_id, contact:contacts(first_name, last_name, email))')
    .eq('status', 'pending')
    .lte('execute_at', nowIso)
    .limit(50)
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  let processed = 0
  for (const row of (due ?? []) as never[]) {
    const r = row as {
      id: string
      contact_sequence_id: string
      sequence_step_id: string
      step: { type: string; config: { template_id?: string; days?: number }; position: number; sequence_id: string } | null
      enrollment: { id: string; contact: { first_name: string; last_name: string; email: string } | null } | null
    }
    const step = r.step
    const contact = r.enrollment?.contact
    if (!step) continue

    try {
      if (step.type === 'send_email' && contact?.email && step.config?.template_id) {
        await sendEmail({
          to: contact.email,
          templateId: step.config.template_id,
          brand,
          props: { contactName: `${contact.first_name} ${contact.last_name}`.trim() },
          sequenceStepId: r.sequence_step_id,
        })
      }
      await supabase.from('contact_sequence_steps').update({ status: 'completed', executed_at: nowIso }).eq('id', r.id)

      // Schedule the next step (a wait step applies its delay to what follows).
      const delayDays = step.type === 'wait' ? Number(step.config?.days ?? 0) : 0
      const { data: next } = await supabase
        .from('sequence_steps')
        .select('id, position')
        .eq('sequence_id', step.sequence_id)
        .gt('position', step.position)
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (next) {
        await supabase.from('contact_sequence_steps').insert({
          contact_sequence_id: r.contact_sequence_id,
          sequence_step_id: next.id,
          status: 'pending',
          execute_at: delayDays > 0 ? addDays(delayDays) : nowIso,
        })
      } else {
        await supabase.from('contact_sequences')
          .update({ status: 'completed', completed_at: nowIso })
          .eq('id', r.contact_sequence_id)
      }
      processed++
    } catch (e) {
      await supabase.from('contact_sequence_steps')
        .update({ status: 'failed', result: { error: e instanceof Error ? e.message : 'failed' } })
        .eq('id', r.id)
    }
  }

  res.status(200).json({ processed })
}
