import { supabase } from '@/lib/supabase'

export type TransactionalKind = 'proposal_sent' | 'onboarding_welcome' | 'audit_results'

/**
 * Fire a transactional email via the serverless endpoint. Best-effort: never throws,
 * so a mail hiccup can't break the user action that triggered it. Returns true on success.
 */
export async function sendTransactional(kind: TransactionalKind, id: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ kind, id, appUrl: window.location.origin }),
    })
    return res.ok
  } catch {
    return false
  }
}
