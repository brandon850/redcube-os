import type { VercelRequest, VercelResponse } from '@vercel/node'
import { serverSupabase } from '../_lib/supabase.js'
import { sendEmail } from '../_lib/email.js'
import type { EmailBrand } from '../../src/features/email/templates.js'

// Transactional one-off emails. `proposal_sent` / `onboarding_welcome` require a
// staff Bearer token; `audit_results` is public (only ever emails the address already
// stored on that audit, so it can't be used to spam arbitrary people).
type Kind = 'proposal_sent' | 'onboarding_welcome' | 'audit_results'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const kind = String(req.body?.kind ?? '') as Kind
  const id = String(req.body?.id ?? '')
  const appUrl = String(req.body?.appUrl ?? '')
  if (!id) {
    res.status(400).json({ error: 'id required' })
    return
  }

  const supabase = serverSupabase()

  async function brandById(brandId: string | null | undefined): Promise<EmailBrand> {
    let b: { name: string; brand_color: string | null; from_email: string | null } | null = null
    if (brandId) {
      const { data } = await supabase.from('brands').select('name, brand_color, from_email').eq('id', brandId).maybeSingle()
      b = data
    }
    if (!b) {
      const { data } = await supabase.from('brands').select('name, brand_color, from_email').eq('is_default', true).maybeSingle()
      b = data
    }
    return { name: b?.name ?? 'RedCube Creative', color: b?.brand_color ?? '#E8172B', from_email: b?.from_email ?? null }
  }

  // Staff-auth for the internal kinds.
  if (kind === 'proposal_sent' || kind === 'onboarding_welcome') {
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
    const { data: caller } = token ? await supabase.auth.getUser(token) : { data: { user: null } }
    if (!caller.user) { res.status(401).json({ error: 'Not authenticated' }); return }
    const { data: profile } = await supabase.from('users').select('role').eq('id', caller.user.id).maybeSingle()
    if (!profile || !['admin', 'sales'].includes(profile.role)) {
      res.status(403).json({ error: 'Not allowed' }); return
    }
  }

  try {
    if (kind === 'proposal_sent') {
      const { data: p } = await supabase
        .from('proposals')
        .select('view_token, brand_id, contact:contacts(email, first_name, last_name)')
        .eq('id', id).maybeSingle()
      const contact = (p as { contact?: { email: string; first_name: string; last_name: string } } | null)?.contact
      if (!contact?.email) { res.status(400).json({ error: 'No contact email' }); return }
      await sendEmail({
        to: contact.email,
        templateId: 'proposal_sent',
        brand: await brandById((p as { brand_id?: string }).brand_id),
        props: { contactName: contact.first_name, proposalUrl: `${appUrl}/proposals/view/${(p as { view_token: string }).view_token}` },
      })
    } else if (kind === 'onboarding_welcome') {
      const { data: deal } = await supabase
        .from('deals').select('contact:contacts(email, first_name)').eq('id', id).maybeSingle()
      const contact = (deal as { contact?: { email: string; first_name: string } } | null)?.contact
      if (!contact?.email) { res.status(400).json({ error: 'No contact email' }); return }
      const { data: prop } = await supabase
        .from('proposals').select('brand_id').eq('deal_id', id).not('signed_at', 'is', null).limit(1).maybeSingle()
      await sendEmail({
        to: contact.email,
        templateId: 'onboarding_welcome',
        brand: await brandById((prop as { brand_id?: string } | null)?.brand_id),
        props: { contactName: contact.first_name },
      })
    } else if (kind === 'audit_results') {
      const { data: audit } = await supabase
        .from('audits').select('email, name, domain, grade, contact_id, brand_id').eq('id', id).maybeSingle()
      const a = audit as { email: string; name: string | null; domain: string | null; grade: string | null; contact_id: string | null; brand_id?: string } | null
      if (!a?.email) { res.status(400).json({ error: 'Audit not found' }); return }
      await sendEmail({
        to: a.email,
        templateId: 'audit_results',
        brand: await brandById(a.brand_id),
        props: { contactName: a.name ?? '', domain: a.domain ?? '', grade: a.grade ?? '', reportUrl: `${appUrl}/audit/report/${id}` },
        contactId: a.contact_id,
      })
    } else {
      res.status(400).json({ error: 'Unknown kind' }); return
    }
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Send failed' })
  }
}
