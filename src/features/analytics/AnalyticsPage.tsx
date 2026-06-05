import { useMemo, useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend,
} from 'chart.js'
import { format, startOfMonth, startOfWeek, startOfYear, subDays, subMonths, subWeeks } from 'date-fns'
import { useAnalytics, type AnalyticsData } from './useAnalytics'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const money = (n: number) => '$' + Math.round(n).toLocaleString()
const TABS = ['Overview', 'Pipeline', 'Leads'] as const
type Tab = (typeof TABS)[number]
const RANGES = [
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: '12mo', label: 'Last 12 months' },
  { key: 'ytd', label: 'This year' },
] as const
type RangeKey = (typeof RANGES)[number]['key']

function cutoffFor(range: RangeKey): Date {
  const now = new Date()
  if (range === '30d') return subDays(now, 30)
  if (range === '90d') return subDays(now, 90)
  if (range === '12mo') return subMonths(now, 12)
  return startOfYear(now)
}

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
}

export default function AnalyticsPage() {
  const { data, isLoading } = useAnalytics()
  const [tab, setTab] = useState<Tab>('Overview')
  const [range, setRange] = useState<RangeKey>('90d')

  if (isLoading || !data) {
    return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-72 w-full" /></div>
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as RangeKey)}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
      </div>

      <div className="mb-5 flex gap-1 border-b">
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

      {tab === 'Overview' && <Overview data={data} range={range} />}
      {tab === 'Pipeline' && <Pipeline data={data} />}
      {tab === 'Leads' && <Leads data={data} />}
    </div>
  )
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="mb-3 text-sm font-medium">{title}</div>
      <div className="h-64">{children}</div>
    </div>
  )
}

function Overview({ data, range }: { data: AnalyticsData; range: RangeKey }) {
  const m = useMemo(() => {
    const cutoff = cutoffFor(range)
    const open = data.deals.filter((d) => d.status === 'open')
    const openValue = open.reduce((s, d) => s + Number(d.value ?? 0), 0)
    const weighted = open.reduce((s, d) => s + Number(d.value ?? 0) * (d.probability ?? 0) / 100, 0)
    const closedInRange = data.deals.filter((d) => (d.status === 'won' || d.status === 'lost') && d.last_activity_at && new Date(d.last_activity_at) >= cutoff)
    const won = closedInRange.filter((d) => d.status === 'won').length
    const lost = closedInRange.filter((d) => d.status === 'lost').length
    const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null
    const newLeads = data.contacts.filter((c) => new Date(c.created_at) >= cutoff).length
    const activeClients = data.contacts.filter((c) => c.status === 'client').length
    const collected = data.invoices.filter((i) => i.status === 'paid' && i.paid_at && new Date(i.paid_at) >= cutoff).reduce((s, i) => s + Number(i.amount_paid ?? 0), 0)

    // Revenue by month (last 6 months) from paid invoices.
    const months: { key: string; label: string; total: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = startOfMonth(subMonths(new Date(), i))
      months.push({ key: format(d, 'yyyy-MM'), label: format(d, 'MMM'), total: 0 })
    }
    for (const inv of data.invoices) {
      if (inv.status !== 'paid' || !inv.paid_at) continue
      const k = format(startOfMonth(new Date(inv.paid_at)), 'yyyy-MM')
      const bucket = months.find((mm) => mm.key === k)
      if (bucket) bucket.total += Number(inv.amount_paid ?? 0)
    }
    return { openValue, weighted, winRate, newLeads, activeClients, collected, months }
  }, [data, range])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Card label="Open pipeline" value={money(m.openValue)} />
        <Card label="Weighted" value={money(m.weighted)} />
        <Card label="Win rate" value={m.winRate === null ? '—' : `${m.winRate}%`} />
        <Card label="Collected" value={money(m.collected)} />
        <Card label="New leads" value={String(m.newLeads)} />
        <Card label="Active clients" value={String(m.activeClients)} />
      </div>
      <ChartBox title="Revenue collected · last 6 months">
        <Bar
          options={CHART_OPTS}
          data={{
            labels: m.months.map((x) => x.label),
            datasets: [{ data: m.months.map((x) => x.total), backgroundColor: '#E8172B', borderRadius: 4 }],
          }}
        />
      </ChartBox>
    </div>
  )
}

function Pipeline({ data }: { data: AnalyticsData }) {
  const rows = useMemo(() => {
    const open = data.deals.filter((d) => d.status === 'open')
    return data.stages.map((st) => {
      const inStage = open.filter((d) => d.stage_id === st.id)
      return { id: st.id, name: st.name, color: st.color, count: inStage.length, value: inStage.reduce((s, d) => s + Number(d.value ?? 0), 0) }
    })
  }, [data])
  const won = data.deals.filter((d) => d.status === 'won')
  const lost = data.deals.filter((d) => d.status === 'lost')
  const maxCount = Math.max(1, ...rows.map((r) => r.count))

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-background p-4">
        <div className="mb-3 text-sm font-medium">Funnel by stage</div>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <div className="w-32 shrink-0 text-sm">{r.name}</div>
              <div className="h-6 flex-1 overflow-hidden rounded bg-muted">
                <div className="h-full rounded" style={{ width: `${(r.count / maxCount) * 100}%`, background: r.color ?? '#E8172B', minWidth: r.count ? 8 : 0 }} />
              </div>
              <div className="w-28 shrink-0 text-right text-sm tabular-nums text-muted-foreground">{r.count} · {money(r.value)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:max-w-md">
        <Card label="Won (all time)" value={`${won.length}`} sub={money(won.reduce((s, d) => s + Number(d.value ?? 0), 0))} />
        <Card label="Lost (all time)" value={`${lost.length}`} sub={money(lost.reduce((s, d) => s + Number(d.value ?? 0), 0))} />
      </div>
    </div>
  )
}

function Leads({ data }: { data: AnalyticsData }) {
  const weekly = useMemo(() => {
    const weeks: { key: string; label: string; count: number }[] = []
    for (let i = 9; i >= 0; i--) {
      const d = startOfWeek(subWeeks(new Date(), i))
      weeks.push({ key: format(d, 'yyyy-ww'), label: format(d, 'MMM d'), count: 0 })
    }
    for (const c of data.contacts) {
      const k = format(startOfWeek(new Date(c.created_at)), 'yyyy-ww')
      const b = weeks.find((w) => w.key === k)
      if (b) b.count += 1
    }
    return weeks
  }, [data])

  const sources = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of data.contacts) {
      const key = c.source || 'Unknown'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [data])

  const palette = ['#E8172B', '#2563EB', '#7F77DD', '#1D9E75', '#BA7517', '#378ADD', '#5dca8a', '#888780']

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartBox title="New contacts · last 10 weeks">
        <Bar
          options={CHART_OPTS}
          data={{ labels: weekly.map((w) => w.label), datasets: [{ data: weekly.map((w) => w.count), backgroundColor: '#E8172B', borderRadius: 4 }] }}
        />
      </ChartBox>
      <ChartBox title="Lead sources">
        {sources.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet.</div>
        ) : (
          <Doughnut
            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }}
            data={{ labels: sources.map((s) => s[0]), datasets: [{ data: sources.map((s) => s[1]), backgroundColor: palette }] }}
          />
        )}
      </ChartBox>
    </div>
  )
}
