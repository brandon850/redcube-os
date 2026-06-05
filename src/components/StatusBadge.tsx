import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** Contact lifecycle statuses and their badge colors. */
export const CONTACT_STATUSES = ['lead', 'prospect', 'qualified', 'client', 'cold'] as const
export type ContactStatus = (typeof CONTACT_STATUSES)[number]

const STATUS_STYLES: Record<string, string> = {
  lead: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  prospect: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  qualified: 'bg-violet-100 text-violet-700 hover:bg-violet-100',
  client: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  cold: 'bg-zinc-100 text-zinc-500 hover:bg-zinc-100',
}

export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  if (!status) return <span className="text-muted-foreground">—</span>
  return (
    <Badge variant="secondary" className={cn('capitalize', STATUS_STYLES[status] ?? '', className)}>
      {status}
    </Badge>
  )
}
