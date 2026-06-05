import { Check, AlertTriangle, X } from 'lucide-react'
import type { AuditResult, CategoryResult, FindingType } from '@/lib/seo/types'
import { cn } from '@/lib/utils'

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'bg-emerald-500'
  if (grade.startsWith('B')) return 'bg-lime-500'
  if (grade.startsWith('C')) return 'bg-amber-500'
  if (grade === 'D') return 'bg-orange-500'
  return 'bg-red-500'
}

function FindingIcon({ type }: { type: FindingType }) {
  if (type === 'pass') return <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
  if (type === 'warn') return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
  return <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
}

function CategoryCard({ c }: { c: CategoryResult }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium">
          <span>{c.icon}</span> {c.name}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{c.status}</span>
          <span className="tabular-nums text-sm font-semibold">{c.score}</span>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full', c.score >= 75 ? 'bg-emerald-500' : c.score >= 50 ? 'bg-amber-500' : 'bg-red-500')}
          style={{ width: `${c.score}%` }}
        />
      </div>
      <ul className="mt-3 space-y-2">
        {c.findings.map((f, i) => (
          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
            <FindingIcon type={f.type} />
            <span>{f.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function AuditReportView({ result, domain }: { result: AuditResult; domain: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-5 rounded-lg border bg-background p-6">
        <div className={cn('flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-3xl font-bold text-white', gradeColor(result.grade))}>
          {result.grade}
        </div>
        <div>
          <div className="text-sm text-muted-foreground">SEO report for</div>
          <div className="text-xl font-semibold">{domain}</div>
          <div className="mt-1 text-sm">
            Overall score <span className="font-semibold tabular-nums">{result.overallScore}/100</span>
            {' · '}{result.pagesScanned} pages scanned
          </div>
        </div>
      </div>

      <p className="rounded-lg border bg-muted/40 p-4 text-sm">{result.gradeSummary}</p>

      <div className="grid gap-4 md:grid-cols-2">
        {result.categories.map((c) => <CategoryCard key={c.name} c={c} />)}
      </div>
    </div>
  )
}
