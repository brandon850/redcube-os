import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ExternalLink } from 'lucide-react'
import { useAudits } from './useAudits'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

function gradePill(grade: string | null): string {
  if (!grade) return 'bg-zinc-100 text-zinc-500'
  if (grade.startsWith('A')) return 'bg-emerald-100 text-emerald-700'
  if (grade.startsWith('B')) return 'bg-lime-100 text-lime-700'
  if (grade.startsWith('C')) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

export default function AuditsListPage() {
  const { data: audits, isLoading } = useAudits()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Audits</h1>
        <p className="text-sm text-muted-foreground">
          Leads captured by the public audit tool at <code>/audit</code>. Each one creates a contact + deal.
        </p>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Report</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (audits ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No audits yet. Share <code>/audit</code> to start capturing leads.
                </TableCell>
              </TableRow>
            ) : (
              (audits ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.domain || a.url}</TableCell>
                  <TableCell>
                    {a.contact ? (
                      <Link to={`/contacts/${a.contact.id}`} className="hover:underline">
                        {a.contact.first_name} {a.contact.last_name}
                      </Link>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.email}</TableCell>
                  <TableCell>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', gradePill(a.grade))}>
                      {a.grade ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{a.overall_score ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.created_at ? format(new Date(a.created_at), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/audit/report/${a.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                      View <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
