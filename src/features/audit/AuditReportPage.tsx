import { useParams } from 'react-router-dom'
import { useAuditReport } from './useAudits'
import AuditReportView from './AuditReportView'
import type { AuditResult } from '@/lib/seo/types'
import { Loader2 } from 'lucide-react'
import { PublicHeader } from '@/components/Brand'

export default function AuditReportPage() {
  const { id = '' } = useParams()
  const { data: audit, isLoading, isError } = useAuditReport(id)

  return (
    <div className="min-h-screen bg-muted/30">
      <PublicHeader />
      <div className="mx-auto max-w-3xl px-4 py-10">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : isError || !audit ? (
          <p className="py-20 text-center text-sm text-muted-foreground">This report is unavailable.</p>
        ) : (
          <>
            <AuditReportView result={audit.report_data as unknown as AuditResult} domain={audit.domain ?? audit.url} />
            <div className="mt-8 rounded-lg border bg-background p-6 text-center">
              <h2 className="text-lg font-semibold">Want RedCube to fix these?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We turn audits like this into a clear plan — and handle the work. Reply to your report
                email or reach us at <a className="text-primary hover:underline" href="mailto:hello@redcube.co">hello@redcube.co</a>.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
