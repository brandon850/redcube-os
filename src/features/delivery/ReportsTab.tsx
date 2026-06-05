import { useState } from 'react'
import { format } from 'date-fns'
import { FileBarChart, Trash2, ExternalLink, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useReports, useGenerateReport, useDeleteReport, type ReportSnapshot } from './useReports'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

export default function ReportsTab({ siteId }: { siteId: string }) {
  const { data: reports, isLoading } = useReports(siteId)
  const generate = useGenerateReport(siteId)
  const del = useDeleteReport(siteId)
  const [title, setTitle] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const origin = window.location.origin

  async function copyLink(id: string) {
    await navigator.clipboard.writeText(`${origin}/reports/view/${id}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div className="max-w-3xl">
      <h2 className="mb-3 font-semibold">Client reports</h2>

      <form
        className="mb-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          generate.mutate(title, { onSuccess: () => { setTitle(''); toast.success('Report generated') } })
        }}
      >
        <Input className="flex-1" placeholder="Report title (e.g. June 2026 SEO summary)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button type="submit" disabled={generate.isPending}>
          <FileBarChart className="mr-2 h-4 w-4" /> {generate.isPending ? 'Generating…' : 'Generate'}
        </Button>
      </form>
      <p className="mb-4 text-xs text-muted-foreground">
        Generates a branded, shareable report (audit health, keywords, tasks, content) you can send to the client or print to PDF.
      </p>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (reports ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No reports yet.</p>
      ) : (
        <div className="space-y-3">
          {(reports ?? []).map((r) => {
            const snap = r.report_data as unknown as ReportSnapshot | null
            return (
              <div key={r.id} className="rounded-lg border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.created_at ? format(new Date(r.created_at), 'MMM d, yyyy') : '—'}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => void copyLink(r.id)}>
                      {copiedId === r.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      <span className="ml-1">Copy link</span>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/reports/view/${r.id}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-4 w-4" /> Open</a>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                {snap && (
                  <div className="mt-3 grid grid-cols-4 gap-3 text-sm">
                    <Metric label="Grade" value={snap.audit ? `${snap.audit.grade}` : '—'} />
                    <Metric label="Tasks" value={`${snap.checklist.done}/${snap.checklist.total}`} />
                    <Metric label="Keywords" value={String(snap.keywords?.length ?? 0)} />
                    <Metric label="Content" value={String(snap.content_published ?? 0)} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-semibold">{value}</div>
    </div>
  )
}
