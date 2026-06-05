import { createClient } from '@supabase/supabase-js'

// Server-only Supabase client (service role — bypasses RLS). Never import from browser code.
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

export function serverSupabase() {
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}
