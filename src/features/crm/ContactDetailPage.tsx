import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Pencil, Plus, X, ChevronDown, ArrowLeft, StickyNote, Phone, Mail, Trash2,
} from 'lucide-react'
import {
  useContact, useActivities, useActiveDeal, useContactTags,
  useAddTag, useRemoveTag, useLogActivity, useUpdateContact, useDeleteActivity,
  type ActivityRow,
} from './useContactDetail'
import { useDeleteContact } from './useContacts'
import { useContactSequences, useEnrollContact, useActiveSequences } from '@/features/automation/useSequences'
import EditContactSheet from './EditContactSheet'
import { CONTACT_STATUSES, StatusBadge } from '@/components/StatusBadge'
import { activityTimestamp } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { Json } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const TABS = ['All activity', 'Notes', 'Emails', 'Calls'] as const
type Tab = (typeof TABS)[number]

// The activity types a user can log manually from the composer.
const LOG_TYPES = [
  { type: 'note', label: 'Note', icon: StickyNote, placeholder: 'Add a note…' },
  { type: 'call', label: 'Call', icon: Phone, placeholder: 'What was discussed on the call?' },
  { type: 'email', label: 'Email', icon: Mail, placeholder: 'Summary of the email…' },
] as const
type LogType = (typeof LOG_TYPES)[number]['type']

function dotColor(type: string): string {
  if (type.startsWith('email')) return 'bg-blue-500'
  if (type === 'call') return 'bg-green-500'
  if (type === 'note' || type === 'contact_created') return 'bg-green-500'
  if (type === 'status_change' || type === 'stage_change') return 'bg-violet-500'
  if (type === 'system' || type === 'automation') return 'bg-amber-500'
  return 'bg-zinc-400'
}

function inTab(type: string, tab: Tab): boolean {
  switch (tab) {
    case 'Notes': return type === 'note' || type === 'contact_created'
    case 'Emails': return type.startsWith('email')
    case 'Calls': return type === 'call'
    default: return true
  }
}

function actorName(a: ActivityRow): string {
  if (a.actor?.full_name) return a.actor.full_name
  if (a.type === 'automation') return 'Automation'
  if (!a.user_id) return 'System'
  return 'User'
}

/** Sub-text under an activity body (call duration, email subject, etc.). */
function activitySubText(a: ActivityRow): string | null {
  const m = a.metadata
  if (!m || typeof m !== 'object' || Array.isArray(m)) return null
  const meta = m as Record<string, unknown>
  if (a.type === 'call' && meta.duration_min != null) return `Duration: ${String(meta.duration_min)} min`
  if (a.type.startsWith('email') && meta.subject) return `Subject: ${String(meta.subject)}`
  return null
}

function initials(first?: string, last?: string): string {
  return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || '?'
}

export default function ContactDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: contact, isLoading, isError } = useContact(id)
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>
  }
  if (isError || !contact) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/contacts')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to contacts
        </Button>
        <p className="mt-4 text-sm text-destructive">Contact not found.</p>
      </div>
    )
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate('/contacts')}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Contacts
      </Button>

      <div className="grid grid-cols-[260px_1fr_260px] gap-6">
        <LeftPanel contactId={id} onEdit={() => setEditOpen(true)} />
        <CenterPanel contactId={id} />
        <RightPanel contactId={id} />
      </div>

      <EditContactSheet contact={contact} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  )
}

// ─── LEFT: contact info ────────────────────────────────────────────────────────
function LeftPanel({ contactId, onEdit }: { contactId: string; onEdit: () => void }) {
  const navigate = useNavigate()
  const { data: contact } = useContact(contactId)
  const { data: tags } = useContactTags(contactId)
  const update = useUpdateContact(contactId)
  const addTag = useAddTag(contactId)
  const removeTag = useRemoveTag(contactId)
  const deleteContact = useDeleteContact()

  const [tagInput, setTagInput] = useState('')
  const [tagOpen, setTagOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!contact) return null

  async function changeStatus(status: string) {
    if (!contact) return
    await update.mutateAsync({ status, _logStatusFrom: contact.status })
  }

  return (
    <aside className="space-y-4">
      <div className="flex flex-col items-center rounded-lg border bg-background p-4 text-center">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg">{initials(contact.first_name, contact.last_name)}</AvatarFallback>
        </Avatar>
        <div className="mt-3 text-lg font-semibold">{contact.first_name} {contact.last_name}</div>

        {/* Inline status edit */}
        <DropdownMenu>
          <DropdownMenuTrigger className="mt-2 inline-flex items-center gap-1">
            <StatusBadge status={contact.status} />
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {CONTACT_STATUSES.map((s) => (
              <DropdownMenuItem key={s} className="capitalize" onClick={() => void changeStatus(s)}>
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-3 rounded-lg border bg-background p-4 text-sm">
        <Field label="Company">
          {contact.company ? (
            <Link to={`/companies?id=${contact.company.id}`} className="hover:underline">{contact.company.name}</Link>
          ) : '—'}
        </Field>
        <Field label="Email">
          <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a>
        </Field>
        <Field label="Phone">{contact.phone || '—'}</Field>
        <Field label="Source">{contact.source || '—'}</Field>
        <Field label="Assigned to">{contact.assignee?.full_name || '—'}</Field>
        <div>
          <div className="mb-1 text-xs text-muted-foreground">Lead score</div>
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, contact.lead_score)}%` }} />
            </div>
            <span className="tabular-nums text-xs">{contact.lead_score}</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="rounded-lg border bg-background p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</span>
          <Popover open={tagOpen} onOpenChange={setTagOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-1"><Plus className="h-4 w-4" /></Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (tagInput.trim()) { void addTag.mutateAsync(tagInput); setTagInput(''); setTagOpen(false) }
                }}
              >
                <Input
                  autoFocus placeholder="Tag name, Enter to add"
                  value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                />
              </form>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(tags ?? []).length === 0 && <span className="text-sm text-muted-foreground">No tags</span>}
          {(tags ?? []).map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs">
              {t.name}
              <button onClick={() => void removeTag.mutateAsync(t.id)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={onEdit}>
        <Pencil className="mr-2 h-4 w-4" /> Edit contact
      </Button>
      <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
        <Trash2 className="mr-2 h-4 w-4" /> Delete contact
      </Button>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {contact.first_name} {contact.last_name} and their activity history. Linked deals, proposals, and invoices are kept but unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteContact.mutate(contactId, {
                onSuccess: () => { toast.success('Contact deleted'); navigate('/contacts') },
              })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  )
}

// ─── CENTER: activity timeline + multi-type composer ─────────────────────────────
function CenterPanel({ contactId }: { contactId: string }) {
  const { data: activities, isLoading } = useActivities(contactId)
  const logActivity = useLogActivity(contactId)
  const deleteActivity = useDeleteActivity(contactId)
  const [tab, setTab] = useState<Tab>('All activity')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const [logType, setLogType] = useState<LogType>('note')
  const [body, setBody] = useState('')
  const [duration, setDuration] = useState('')
  const [subject, setSubject] = useState('')

  const active = LOG_TYPES.find((t) => t.type === logType)!

  async function submit() {
    if (!body.trim() && logType === 'note') return
    let metadata: Json | undefined
    if (logType === 'call') metadata = { duration_min: Number(duration) || 0 }
    if (logType === 'email') metadata = { subject: subject.trim() || null }
    await logActivity.mutateAsync({
      type: logType,
      body: body.trim() || `${active.label} logged`,
      metadata,
    })
    setBody(''); setDuration(''); setSubject('')
  }

  const filtered = (activities ?? []).filter((a) => inTab(a.type, tab))

  return (
    <section className="space-y-4">
      <div className="flex gap-1 border-b">
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

      {/* Composer with a type switcher */}
      <div className="rounded-lg border bg-background p-3">
        <div className="mb-2 inline-flex rounded-md border p-0.5">
          {LOG_TYPES.map((t) => (
            <button
              key={t.type}
              onClick={() => setLogType(t.type)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-medium transition-colors',
                logType === t.type ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {logType === 'email' && (
          <Input
            className="mb-2"
            placeholder="Email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        )}
        <Textarea placeholder={active.placeholder} value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
        <div className="mt-2 flex items-center justify-between">
          {logType === 'call' ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Duration</span>
              <Input
                type="number" min={0} className="h-8 w-20"
                value={duration} onChange={(e) => setDuration(e.target.value)}
              />
              <span>min</span>
            </div>
          ) : <span />}
          <Button size="sm" onClick={() => void submit()} disabled={logActivity.isPending}>
            Log {active.label.toLowerCase()}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ol className="space-y-4">
          {filtered.map((a) => {
            const sub = activitySubText(a)
            return (
              <li key={a.id} className="group flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={cn('mt-1.5 h-2.5 w-2.5 rounded-full', dotColor(a.type))} />
                  <span className="mt-1 w-px flex-1 bg-border" />
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium capitalize text-foreground">{a.type.replace('_', ' ')}</span>
                    <span>·</span>
                    <span>{actorName(a)}</span>
                    <span>·</span>
                    <span>{activityTimestamp(a.created_at)}</span>
                  </div>
                  <div className="text-sm">{a.body}</div>
                  {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
                </div>
                <button
                  onClick={() => setConfirmId(a.id)}
                  className="self-start p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  aria-label="Delete activity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            )
          })}
        </ol>
      )}

      <AlertDialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this activity?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the entry from the timeline. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmId) {
                  deleteActivity.mutate(confirmId, { onSuccess: () => toast.success('Activity deleted') })
                }
                setConfirmId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

// ─── RIGHT: linked data ──────────────────────────────────────────────────────────
function RightPanel({ contactId }: { contactId: string }) {
  const { data: contact } = useContact(contactId)
  const { data: deal } = useActiveDeal(contactId)
  const navigate = useNavigate()

  return (
    <aside className="space-y-4 text-sm">
      <div className="rounded-lg border bg-background p-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Active deal</div>
        {deal ? (
          <div className="space-y-2">
            {deal.stage && (
              <span
                className="inline-block rounded px-2 py-0.5 text-xs text-white"
                style={{ backgroundColor: deal.stage.color ?? '#888' }}
              >
                {deal.stage.name}
              </span>
            )}
            <div className="font-medium">{deal.title}</div>
            <div className="text-muted-foreground">
              ${Number(deal.value ?? 0).toLocaleString()}
              {deal.probability != null && (
                <> · weighted ${Math.round(Number(deal.value ?? 0) * deal.probability / 100).toLocaleString()}</>
              )}
            </div>
            {deal.proposal_id ? (
              <Button size="sm" className="w-full" onClick={() => navigate(`/proposals/${deal.proposal_id}`)}>View proposal</Button>
            ) : (
              <Button size="sm" className="w-full" onClick={() => navigate(`/proposals/new?contact=${contactId}&deal=${deal.id}`)}>Build proposal</Button>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No open deal.</p>
        )}
      </div>

      <SequenceCard contactId={contactId} />

      {contact?.company && (
        <div className="rounded-lg border bg-background p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Company</div>
          <Link to={`/companies?id=${contact.company.id}`} className="font-medium hover:underline">
            {contact.company.name}
          </Link>
          {contact.company.domain && <div className="text-muted-foreground">{contact.company.domain}</div>}
          {contact.company.industry && <div className="text-muted-foreground">{contact.company.industry}</div>}
        </div>
      )}
    </aside>
  )
}

function SequenceCard({ contactId }: { contactId: string }) {
  const { data: enrollments } = useContactSequences(contactId)
  const { data: active } = useActiveSequences()
  const enroll = useEnrollContact(contactId)

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sequences</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-1"><Plus className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(active ?? []).length === 0 ? (
              <DropdownMenuItem disabled>No active sequences</DropdownMenuItem>
            ) : (
              (active ?? []).map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => enroll.mutate(s.id, {
                    onSuccess: () => toast.success(`Enrolled in ${s.name}`),
                    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not enroll'),
                  })}
                >
                  {s.name}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {(enrollments ?? []).length === 0 ? (
        <p className="text-muted-foreground">Not enrolled.</p>
      ) : (
        <div className="space-y-2">
          {(enrollments ?? []).map((e) => {
            const done = e.steps.filter((s) => s.status === 'completed').length
            return (
              <div key={e.id} className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{e.sequence?.name ?? 'Sequence'}</span>
                  <span className="capitalize text-muted-foreground">{e.status}</span>
                </div>
                <div className="text-xs text-muted-foreground">{done}/{e.steps.length} steps done</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
