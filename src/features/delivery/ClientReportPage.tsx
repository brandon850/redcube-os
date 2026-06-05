import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Loader2, Printer } from 'lucide-react'
import { useClientReport, type ReportSnapshot } from './useReports'
import AuditReportView from '@/features/audit/AuditReportView'
import { Button } from '@/components/ui/button'
import { PublicHeader } from '@/components/Brand'

export default function ClientReportPage() {
  const { id = '' } = useParams()
  const { data: report, isLoading, isError } = useClientReport(id)

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-muted/30"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }
  if (isError || !report) {
    return <div className="flex min-h-screen items-center justify-center bg-muted/30"><p className="text-sm text-muted-foreground">This report is unavailable.</p></div>
  }

  const snap = report.report_data as unknown as ReportSnapshot

  return (
    <div className="min-h-screen bg-muted/30">
      <PublicHeader
        right={
          <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
            <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
          </Button>
        }
      />
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{report.title}</h1>
          <p className="text-sm text-muted-foreground">
            {snap.site_name}{snap.site_domain ? ` · ${snap.site_domain}` : ''}
            {report.created_at ? ` · ${format(new Date(report.created_at), 'MMMM d, yyyy')}` : ''}
          </p>
        </div>

        {/* Summary metrics */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="SEO grade" value={snap.audit ? `${snap.audit.grade}` : '—'} sub={snap.audit ? `${snap.audit.overallScore}/100` : undefined} />
          <Metric label="Tasks completed" value={`${snap.checklist.done}/${snap.checklist.total}`} />
          <Metric label="Keywords tracked" value={String(snap.keywords.length)} />
          <Metric label="Content published" value={String(snap.content_published)} />
        </div>

        {/* Audit detail */}
        {snap.audit && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Site health</h2>
            <AuditReportView result={snap.audit} domain={snap.site_domain ?? snap.site_name} />
          </div>
        )}

        {/* Keyword performance */}
        {snap.keywords.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Keyword performance</h2>
            <div className="overflow-hidden rounded-lg border bg-background">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-4 py-2 text-left font-medium">Keyword</th><th className="px-4 py-2 text-right font-medium">Position</th></tr>
                </thead>
                <tbody className="divide-y">
                  {snap.keywords.map((k, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{k.keyword}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{k.position != null ? `#${k.position}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-10 border-t pt-6 text-center text-sm text-muted-foreground">
          Prepared by {snap.company_name}. Questions? Reply to the email this report came from.
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}
