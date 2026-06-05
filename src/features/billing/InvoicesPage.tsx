import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useInvoices, type InvoiceRow } from './useInvoices'
import { useBrand } from '@/hooks/useBrand'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const money = (n: number | null | undefined) => '$' + Number(n ?? 0).toLocaleString()

const FILTERS = ['All', 'Draft', 'Open', 'Paid', 'Overdue'] as const
type Filter = (typeof FILTERS)[number]

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  open: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
}

function matches(inv: InvoiceRow, f: Filter): boolean {
  if (f === 'All') return true
  return (inv.status ?? 'draft').toLowerCase() === f.toLowerCase()
}

export default function InvoicesPage() {
  const { activeBrandId } = useBrand()
  const { data: invoices, isLoading } = useInvoices(activeBrandId)
  const [filter, setFilter] = useState<Filter>('All')

  const rows = useMemo(() => (invoices ?? []).filter((i) => matches(i, filter)), [invoices, filter])

  const collected = (invoices ?? []).reduce((s, i) => s + Number(i.amount_paid ?? 0), 0)
  const outstanding = (invoices ?? [])
    .filter((i) => i.status !== 'paid')
    .reduce((s, i) => s + Number(i.amount_due ?? 0), 0)

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
      <p className="text-sm text-muted-foreground">
        Created by the onboarding cascade. Live Stripe sync arrives when billing credentials are connected.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 md:max-w-md">
        <div className="rounded-lg border bg-background p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Collected</div>
          <div className="mt-1 text-xl font-semibold text-emerald-600">{money(collected)}</div>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding</div>
          <div className="mt-1 text-xl font-semibold">{money(outstanding)}</div>
        </div>
      </div>

      <div className="mt-4 flex gap-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-3 py-1 text-sm font-medium transition-colors',
              filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Amount due</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>QBO sync</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No invoices {filter !== 'All' ? `in "${filter}"` : 'yet'}. Run onboarding on a signed proposal to create one.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">
                    {inv.contact ? (
                      <Link to={`/contacts/${inv.contact.id}`} className="hover:underline">
                        {inv.contact.first_name} {inv.contact.last_name}
                      </Link>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(inv.amount_due)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(inv.amount_paid)}</TableCell>
                  <TableCell>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', STATUS_STYLES[inv.status ?? 'draft'])}>
                      {inv.status ?? 'draft'}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground capitalize">{inv.qbo_sync_status}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {inv.created_at ? format(new Date(inv.created_at), 'MMM d, yyyy') : '—'}
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
