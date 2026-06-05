import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DndContext, PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
  type DragEndEvent,
} from '@dnd-kit/core'
import { format } from 'date-fns'
import { Plus, X } from 'lucide-react'
import {
  usePipelineStages, useOpenDeals, useClosedDeals, useMoveDeal, useUpdateDeal,
  useCloseDeal, useDeleteDeal, type DealRow,
} from './usePipeline'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useActiveUsers } from '@/features/crm/useContacts'
import NewDealDialog from './NewDealDialog'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { PipelineStage } from '@/types/database.types'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const DAY = 86_400_000
const ALL = '__all__'
const money = (n: number) => '$' + Math.round(n).toLocaleString()

function daysSince(iso: string | null): number {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY)
}
function isStale(deal: DealRow, stage?: PipelineStage): boolean {
  if (!stage?.stale_after_days || !deal.last_activity_at) return false
  return daysSince(deal.last_activity_at) > stage.stale_after_days
}

export default function PipelinePage() {
  const { data: stages, isLoading: stagesLoading } = usePipelineStages()
  const { data: deals, isLoading: dealsLoading } = useOpenDeals()
  const { data: closed } = useClosedDeals()
  const { data: users } = useActiveUsers()
  const moveDeal = useMoveDeal()

  const [assignee, setAssignee] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [closedView, setClosedView] = useState<'won' | 'lost' | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const sourceOptions = useMemo(() => {
    const set = new Set<string>()
    for (const d of deals ?? []) if (d.contact?.source) set.add(d.contact.source)
    return [...set].sort()
  }, [deals])

  const filtered = useMemo(() => {
    return (deals ?? []).filter((d) => {
      if (assignee && d.contact?.assigned_to !== assignee) return false
      if (source && d.contact?.source !== source) return false
      return true
    })
  }, [deals, assignee, source])

  // Metrics
  const pipelineValue = filtered.reduce((s, d) => s + Number(d.value ?? 0), 0)
  const weighted = filtered.reduce((s, d) => s + Number(d.value ?? 0) * (d.probability ?? 0) / 100, 0)
  const recentClosed = (closed ?? []).filter((d) => daysSince(d.last_activity_at) <= 90)
  const won90 = recentClosed.filter((d) => d.status === 'won')
  const lost90 = recentClosed.filter((d) => d.status === 'lost')
  const winRate = won90.length + lost90.length > 0
    ? Math.round((won90.length / (won90.length + lost90.length)) * 100)
    : null

  const selected = filtered.find((d) => d.id === selectedId) ?? null

  function handleDragEnd(e: DragEndEvent) {
    const dealId = String(e.active.id)
    const toStageId = e.over ? String(e.over.id) : null
    if (!toStageId) return
    const deal = (deals ?? []).find((d) => d.id === dealId)
    if (!deal || deal.stage_id === toStageId) return
    const fromStage = stages?.find((s) => s.id === deal.stage_id)
    const toStage = stages?.find((s) => s.id === toStageId)
    moveDeal.mutate({
      dealId,
      toStageId,
      contactId: deal.contact_id,
      fromStageName: fromStage?.name ?? '—',
      toStageName: toStage?.name ?? '—',
      defaultProbability: toStage?.default_probability ?? null,
    })
  }

  if (stagesLoading || dealsLoading) {
    return <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-96 w-full" /></div>
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
        <Button onClick={() => setNewOpen(true)}><Plus className="mr-2 h-4 w-4" /> New deal</Button>
      </div>

      {/* Metric cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Pipeline value" value={money(pipelineValue)} />
        <Metric label="Weighted forecast" value={money(weighted)} />
        <Metric label="Win rate (90d)" value={winRate === null ? '—' : `${winRate}%`} />
        <Metric label="Active deals" value={String(filtered.length)} />
      </div>

      {/* Filter row */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={assignee ?? ALL} onValueChange={(v) => setAssignee(v === ALL ? null : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Assigned to" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All assignees</SelectItem>
            {(users ?? []).map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={source ?? ALL} onValueChange={(v) => setSource(v === ALL ? null : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sources</SelectItem>
            {sourceOptions.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(assignee || source) && (
          <Button variant="ghost" size="sm" onClick={() => { setAssignee(null); setSource(null) }}>
            <X className="mr-1 h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      {/* Board */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {(stages ?? []).map((stage) => {
            const stageDeals = filtered.filter((d) => d.stage_id === stage.id)
            const stageTotal = stageDeals.reduce((s, d) => s + Number(d.value ?? 0), 0)
            return (
              <StageColumn
                key={stage.id}
                stage={stage}
                count={stageDeals.length}
                total={stageTotal}
              >
                {stageDeals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    stale={isStale(deal, stage)}
                    selected={deal.id === selectedId}
                    onSelect={() => setSelectedId((id) => (id === deal.id ? null : deal.id))}
                  />
                ))}
              </StageColumn>
            )
          })}
        </div>
      </DndContext>

      {/* Deal detail panel */}
      {selected && (
        <DealDetailPanel
          key={selected.id}
          deal={selected}
          stages={stages ?? []}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Won / Lost strip — click to see the full list */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:max-w-md">
        <button
          onClick={() => setClosedView('won')}
          className="rounded-lg border bg-background p-4 text-left transition-colors hover:bg-accent"
        >
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Won · last 90d →</div>
          <div className="mt-1 text-lg font-semibold text-emerald-600">
            {won90.length} · {money(won90.reduce((s, d) => s + Number(d.value ?? 0), 0))}
          </div>
        </button>
        <button
          onClick={() => setClosedView('lost')}
          className="rounded-lg border bg-background p-4 text-left transition-colors hover:bg-accent"
        >
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Lost · last 90d →</div>
          <div className="mt-1 text-lg font-semibold text-muted-foreground">
            {lost90.length} · {money(lost90.reduce((s, d) => s + Number(d.value ?? 0), 0))}
          </div>
        </button>
      </div>

      <NewDealDialog open={newOpen} onOpenChange={setNewOpen} />
      <ClosedDealsDialog
        status={closedView}
        deals={(closed ?? []).filter((d) => d.status === closedView)}
        onClose={() => setClosedView(null)}
      />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function StageColumn({
  stage, count, total, children,
}: {
  stage: PipelineStage
  count: number
  total: number
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div
        className="mb-2 flex items-center justify-between rounded-md border-l-4 bg-background px-3 py-2"
        style={{ borderLeftColor: stage.color ?? '#888' }}
      >
        <span className="text-sm font-medium">{stage.name}</span>
        <span className="text-xs text-muted-foreground">{count} · {money(total)}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-32 flex-1 flex-col gap-2 rounded-md p-1 transition-colors',
          isOver ? 'bg-accent' : 'bg-muted/40',
        )}
      >
        {children}
      </div>
    </div>
  )
}

function DealCard({
  deal, stale, selected, onSelect,
}: {
  deal: DealRow
  stale: boolean
  selected: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onSelect}
      className={cn(
        'cursor-grab rounded-md border bg-background p-3 text-sm shadow-sm active:cursor-grabbing',
        selected && 'ring-2 ring-primary',
        isDragging && 'opacity-50',
      )}
    >
      <div className="font-medium">
        {deal.contact ? `${deal.contact.first_name} ${deal.contact.last_name}` : deal.title}
      </div>
      {deal.company && <div className="text-xs text-muted-foreground">{deal.company.name}</div>}
      <div className="mt-1 font-semibold tabular-nums">{money(Number(deal.value ?? 0))}</div>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{daysSince(deal.last_activity_at)}d in stage</span>
        {deal.contact?.source && <span className="rounded bg-muted px-1.5 py-0.5">{deal.contact.source}</span>}
        {stale && (
          <span className="flex items-center gap-1 text-destructive">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> Stale
          </span>
        )}
      </div>
    </div>
  )
}

function DealDetailPanel({
  deal, stages, onClose,
}: {
  deal: DealRow
  stages: PipelineStage[]
  onClose: () => void
}) {
  const navigate = useNavigate()
  const moveDeal = useMoveDeal()
  const updateDeal = useUpdateDeal()
  const closeDeal = useCloseDeal()
  const deleteDeal = useDeleteDeal()
  const [prob, setProb] = useState(String(deal.probability ?? ''))

  const value = Number(deal.value ?? 0)
  const weighted = Math.round(value * (deal.probability ?? 0) / 100)

  function moveToStage(stageId: string) {
    if (stageId === deal.stage_id) return
    const fromStage = stages.find((s) => s.id === deal.stage_id)
    const toStage = stages.find((s) => s.id === stageId)
    moveDeal.mutate({
      dealId: deal.id,
      toStageId: stageId,
      contactId: deal.contact_id,
      fromStageName: fromStage?.name ?? '—',
      toStageName: toStage?.name ?? '—',
      defaultProbability: toStage?.default_probability ?? null,
    })
  }

  function saveProb() {
    const n = Number(prob)
    if (!Number.isNaN(n) && n !== deal.probability) {
      updateDeal.mutate({ dealId: deal.id, patch: { probability: Math.max(0, Math.min(100, n)) } })
    }
  }

  return (
    <div className="mt-4 rounded-lg border bg-background p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold">{deal.title}</div>
          {deal.contact && (
            <Link to={`/contacts/${deal.contact.id}`} className="text-sm text-primary hover:underline">
              {deal.contact.first_name} {deal.contact.last_name}
            </Link>
          )}
          {deal.company && <span className="text-sm text-muted-foreground"> · {deal.company.name}</span>}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      <div className="mt-3 flex gap-6 text-sm">
        <div><span className="text-muted-foreground">Value </span><span className="font-semibold">{money(value)}</span></div>
        <div><span className="text-muted-foreground">Weighted </span><span className="font-semibold">{money(weighted)}</span></div>
      </div>

      {/* Stage selector pills */}
      <div className="mt-4">
        <div className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Stage</div>
        <div className="flex flex-wrap gap-1.5">
          {stages.map((s) => (
            <button
              key={s.id}
              onClick={() => moveToStage(s.id)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                s.id === deal.stage_id ? 'border-transparent text-white' : 'hover:bg-accent',
              )}
              style={s.id === deal.stage_id ? { backgroundColor: s.color ?? '#888' } : undefined}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Probability */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Probability</span>
        <Input
          type="number" min={0} max={100} className="h-8 w-20"
          value={prob}
          onChange={(e) => setProb(e.target.value)}
          onBlur={saveProb}
          onKeyDown={(e) => e.key === 'Enter' && saveProb()}
        />
        <span className="text-sm text-muted-foreground">%</span>
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => closeDeal.mutate({ deal, status: 'won' })}>
          Mark won
        </Button>
        <Button variant="outline" size="sm" onClick={() => closeDeal.mutate({ deal, status: 'lost' })}>
          Mark lost
        </Button>
        {deal.contact && (
          <Button variant="outline" size="sm" onClick={() => navigate(`/contacts/${deal.contact!.id}`)}>
            Open contact
          </Button>
        )}
        {deal.proposal_id ? (
          <Button size="sm" onClick={() => navigate(`/proposals/${deal.proposal_id}`)}>
            View proposal
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => navigate(`/proposals/new?deal=${deal.id}${deal.contact ? `&contact=${deal.contact.id}` : ''}`)}
          >
            Build proposal
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">Delete</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this deal?</AlertDialogTitle>
              <AlertDialogDescription>
                Removes “{deal.title}” from the pipeline. Linked proposals, invoices, and audits are kept but detached from the deal.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDeal.mutate(deal.id, {
                  onSuccess: () => { toast.success('Deal deleted'); onClose() },
                  onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not delete'),
                })}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

function ClosedDealsDialog({
  status, deals, onClose,
}: {
  status: 'won' | 'lost' | null
  deals: DealRow[]
  onClose: () => void
}) {
  const navigate = useNavigate()
  const updateDeal = useUpdateDeal()
  if (!status) return null

  const total = deals.reduce((s, d) => s + Number(d.value ?? 0), 0)

  return (
    <Dialog open={status !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {status} deals · {deals.length} · {money(total)}
          </DialogTitle>
        </DialogHeader>
        {deals.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No {status} deals yet.</p>
        ) : (
          <div className="max-h-[60vh] divide-y overflow-y-auto">
            {deals.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{d.title}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {d.contact ? (
                      <button
                        className="hover:underline"
                        onClick={() => { onClose(); navigate(`/contacts/${d.contact!.id}`) }}
                      >
                        {d.contact.first_name} {d.contact.last_name}
                      </button>
                    ) : '—'}
                    {d.company && ` · ${d.company.name}`}
                    {d.last_activity_at && ` · ${format(new Date(d.last_activity_at), 'MMM d, yyyy')}`}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-semibold tabular-nums">{money(Number(d.value ?? 0))}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateDeal.mutate({ dealId: d.id, patch: { status: 'open' } })}
                  >
                    Reopen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
