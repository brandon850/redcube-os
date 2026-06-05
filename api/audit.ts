import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runAudit } from '../src/lib/seo/audit'

// Stateless SEO crawl + score. Persistence happens client-side via the
// `ingest_audit` Supabase RPC, so this function needs no DB credentials.
export const config = { maxDuration: 60 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const url = (req.body?.url ?? '').toString()
  if (!url) {
    res.status(400).json({ error: 'url is required' })
    return
  }
  try {
    const result = await runAudit(url)
    res.status(200).json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Audit failed' })
  }
}
