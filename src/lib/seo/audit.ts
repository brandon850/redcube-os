// Orchestrator: crawl + aux-file checks + score. Server-side only.
import { crawlSite, checkAuxFiles } from './crawler'
import { scoreSite } from './scorer'
import type { AuditResult } from './types'

export type { AuditResult } from './types'

/** Normalize a user-entered URL and run a full audit. Throws on invalid URL. */
export async function runAudit(rawUrl: string): Promise<AuditResult> {
  let url = rawUrl.trim()
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  // Validate (throws if unparseable).
  new URL(url)

  const [pages, aux] = await Promise.all([crawlSite(url), checkAuxFiles(url)])
  if (pages.length === 0 || !pages.some((p) => p.ok)) {
    throw new Error('Could not reach that site. Check the URL and try again.')
  }
  return scoreSite(pages, aux, url)
}
