import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { sendTransactional } from '@/lib/notify'
import type { AuditResult } from '@/lib/seo/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wordmark } from '@/components/Brand'

type Phase = 'form' | 'scanning'

export default function AuditPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [url, setUrl] = useState('')
  const [phase, setPhase] = useState<Phase>('form')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !url.trim()) {
      setError('Enter your email and a website URL.')
      return
    }
    setPhase('scanning')
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const payload = (await res.json()) as AuditResult & { error?: string }
      if (!res.ok || payload.error) throw new Error(payload.error || 'Could not scan that site.')

      const { data, error: rpcErr } = await supabase.rpc('ingest_audit', {
        p_email: email.trim(),
        p_name: name.trim() || null,
        p_url: url.trim(),
        p_result: payload as never,
      })
      const result = data as { ok?: boolean; audit_id?: string; error?: string } | null
      if (rpcErr || !result?.ok || !result.audit_id) {
        throw new Error(result?.error || rpcErr?.message || 'Could not save your report.')
      }
      void sendTransactional('audit_results', result.audit_id) // best-effort emails the report link
      navigate(`/audit/report/${result.audit_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setPhase('form')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background p-8 shadow-sm">
        <Wordmark sub="Creative" className="mb-4" />
        <h1 className="text-2xl font-semibold tracking-tight">Free instant SEO audit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your website and we'll scan it across 6 areas Google cares about — findability,
          speed, mobile, trust, content, and links. Takes about 20 seconds.
        </p>

        {phase === 'scanning' ? (
          <div className="mt-8 flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-sm font-medium">Scanning {url}…</div>
            <div className="text-xs text-muted-foreground">Crawling pages and grading your SEO. Hang tight.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="url">Website URL</Label>
              <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="yourcompany.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              <Search className="mr-2 h-4 w-4" /> Run my free audit
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
