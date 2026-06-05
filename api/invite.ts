import type { VercelRequest, VercelResponse } from '@vercel/node'
import { serverSupabase } from './_lib/supabase.js'

const ROLES = ['admin', 'sales', 'viewer']

// Admin-only: invite a teammate by email (Supabase Auth admin API) and pre-set their
// role in public.users so it's correct on first login. Requires the caller's access
// token (Bearer) — verified to be an admin before doing anything.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  const supabase = serverSupabase()

  // Verify the caller and that they're an admin.
  const { data: caller, error: callerErr } = await supabase.auth.getUser(token)
  if (callerErr || !caller.user) {
    res.status(401).json({ error: 'Invalid session' })
    return
  }
  const { data: profile } = await supabase.from('users').select('role').eq('id', caller.user.id).maybeSingle()
  if (profile?.role !== 'admin') {
    res.status(403).json({ error: 'Only admins can invite teammates.' })
    return
  }

  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const role = String(req.body?.role ?? 'sales')
  const fullName = req.body?.full_name ? String(req.body.full_name).trim() : null
  const appUrl = String(req.body?.appUrl ?? '')

  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'A valid email is required' })
    return
  }
  if (!ROLES.includes(role)) {
    res.status(400).json({ error: 'Invalid role' })
    return
  }

  const { data: invited, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: appUrl ? `${appUrl}/login` : undefined,
  })
  if (error) {
    res.status(400).json({ error: error.message })
    return
  }

  // Seed their app profile with the chosen role (id comes from the created auth user).
  if (invited.user) {
    await supabase.from('users').upsert({ id: invited.user.id, email, full_name: fullName, role })
  }

  res.status(200).json({ ok: true })
}
