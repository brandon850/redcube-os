import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Loader2, Plus, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useSite, useSiteAudits, useRunSiteAudit } from './useSites'
import {
  useChecklist, useAddChecklistItem, useToggleChecklistItem, useDeleteChecklistItem,
} from './useChecklist'
import AuditReportView from '@/features/audit/AuditReportView'
import KeywordsTab from './KeywordsTab'
import ContentTab from './ContentTab'
import ReportsTab from './ReportsTab'
import type { AuditResult } from '@/lib/seo/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

const TABS = ['Overview', 'Checklist', 'Keywords', 'Content', 'Reports'] as const
type Tab = (typeof TABS)[number]

export default function SiteDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: site, isLoading, isError } = useSite(id)
  const [tab, setTab] = useState<Tab>('Overview')

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (isError || !site) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/sites')}><ArrowLeft className="mr-1 h-4 w-4" /> Sites</Button>
        <p className="mt-4 text-sm text-destructive">Site not found.</p>
      </div>
    )
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="-ml-2 mb-4" onClick={() => navigate('/sites')}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Sites
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{site.name}</h1>
          <a href={site.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">{site.domain}</a>
          {site.company && <span className="text-sm text-muted-foreground"> · {site.company.name}</span>}
        </div>
      </div>

      <div className="mt-4 flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === 'Overview' && <OverviewTab siteId={site.id} url={site.url} />}
        {tab === 'Checklist' && <ChecklistTab siteId={site.id} />}
        {tab === 'Keywords' && <KeywordsTab siteId={site.id} />}
        {tab === 'Content' && <ContentTab siteId={site.id} />}
        {tab === 'Reports' && <ReportsTab siteId={site.id} />}
      </div>
    </div>
  )
}

function OverviewTab({ siteId, url }: { siteId: string; url: string }) {
  const { data: audits, isLoading } = useSiteAudits(siteId)
  const runAudit = useRunSiteAudit(siteId)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const latest = audits?.[0]
  const shown = audits?.find((a) => a.id === selectedId) ?? latest

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Audits</h2>
        <Button
          onClick={() => runAudit.mutate(url, {
            onSuccess: () => toast.success('Audit complete'),
            onError: (e) => toast.error(e instanceof Error ? e.message : 'Audit failed'),
          })}
          disabled={runAudit.isPending}
        >
          {runAudit.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning…</> : <><RefreshCw className="mr-2 h-4 w-4" /> Run audit</>}
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !shown ? (
        <p className="rounded-lg border bg-background py-10 text-center text-sm text-muted-foreground">
          No audits yet. Run one to score this site.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          {(() => {
            const result = shown.report_data as unknown as AuditResult
            return <AuditReportView result={result} domain={result.domain} />
          })()}
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">History</div>
            <div className="space-y-1">
              {(audits ?? []).map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm',
                    a.id === shown.id ? 'border-primary bg-accent' : 'hover:bg-accent/60',
                  )}
                >
                  <span>{a.created_at ? format(new Date(a.created_at), 'MMM d, h:mm a') : '—'}</span>
                  <span className="font-semibold">{a.grade} · {a.overall_score}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ChecklistTab({ siteId }: { siteId: string }) {
  const { data: items, isLoading } = useChecklist(siteId)
  const add = useAddChecklistItem(siteId)
  const toggle = useToggleChecklistItem(siteId)
  const del = useDeleteChecklistItem(siteId)
  const [label, setLabel] = useState('')

  const done = (items ?? []).filter((i) => i.is_completed).length

  return (
    <div className="max-w-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">SEO checklist</h2>
        {items && items.length > 0 && <span className="text-sm text-muted-foreground">{done}/{items.length} done</span>}
      </div>

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); if (label.trim()) { add.mutate(label); setLabel('') } }}
      >
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add a checklist item…" />
        <Button type="submit" disabled={!label.trim() || add.isPending}><Plus className="h-4 w-4" /></Button>
      </form>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (items ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No checklist items yet.</p>
      ) : (
        <ul className="divide-y rounded-md border bg-background">
          {(items ?? []).map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2">
              <input
                type="checkbox"
                checked={item.is_completed}
                onChange={(e) => toggle.mutate({ id: item.id, is_completed: e.target.checked })}
              />
              <span className={cn('flex-1 text-sm', item.is_completed && 'text-muted-foreground line-through')}>{item.label}</span>
              <button onClick={() => del.mutate(item.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
