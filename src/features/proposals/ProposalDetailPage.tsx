import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Copy, Check, ExternalLink, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useProposal, useSendProposal, useDeleteProposal, useRunOnboarding } from './useProposals'
import { applyDiscount, formatMoney } from './pricing'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-amber-100 text-amber-700',
  signed: 'bg-emerald-100 text-emerald-700',
}

interface SnapshotAddon { name: string; price: number; price_type: string }

export default function ProposalDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: proposal, isLoading, isError, error } = useProposal(id)
  const send = useSendProposal()
  const deleteProposal = useDeleteProposal()
  const onboard = useRunOnboarding()
  const [copied, setCopied] = useState(false)

  if (isLoading) return <Skeleton className="h-80 w-full" />
  if (isError) return <p className="text-sm text-destructive">{error instanceof Error ? error.message : 'Failed to load proposal'}</p>
  if (!proposal) return <p className="text-sm text-destructive">Proposal not found.</p>

  const origin = window.location.origin
  const publicUrl = `${origin}/proposals/view/${proposal.view_token}`
  const status = proposal.status ?? 'draft'

  // Totals from the accepted snapshot.
  let monthly = 0, oneTime = 0
  for (const pp of proposal.proposal_packages) {
    const price = Number(pp.price_override ?? 0)
    if (pp.price_type_snapshot === 'monthly') monthly += price
    else oneTime += price
    const addons = (pp.addons_snapshot as unknown as SnapshotAddon[] | null) ?? []
    for (const a of addons) {
      if (a.price_type === 'monthly') monthly += Number(a.price)
      else oneTime += Number(a.price)
    }
  }
  const discountPct = proposal.discount_pct ?? 0
  const discounted = applyDiscount({ monthly, oneTime }, discountPct)

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="max-w-2xl">
      <Button variant="ghost" size="sm" className="-ml-2 mb-4" onClick={() => navigate('/proposals')}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Proposals
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Proposal</h1>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', STATUS_STYLES[status])}>{status}</span>
          </div>
          {proposal.contact && (
            <Link to={`/contacts/${proposal.contact.id}`} className="text-sm text-primary hover:underline">
              {proposal.contact.first_name} {proposal.contact.last_name}
            </Link>
          )}
          {proposal.deal && <span className="text-sm text-muted-foreground"> · {proposal.deal.title}</span>}
        </div>
        <div className="flex items-center gap-2">
          {status === 'draft' && (
            <Button onClick={() => send.mutate(proposal)} disabled={send.isPending}>
              <Send className="mr-2 h-4 w-4" /> Mark as sent
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" title="Delete proposal"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this proposal?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the proposal and its saved selection. The client link will stop working.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    deleteProposal.mutate(proposal.id, {
                      onSuccess: () => { toast.success('Proposal deleted'); navigate('/proposals') },
                    })
                  }
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Shareable link */}
      <div className="mt-6 rounded-lg border bg-background p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Client link</div>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs">{publicUrl}</code>
          <Button variant="outline" size="sm" onClick={() => void copyLink()}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Send this to the client. They select packages and accept right on the page.</p>
      </div>

      {/* Tracking */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <Stat label="Views" value={String(proposal.view_count)} />
        <Stat label="First viewed" value={proposal.viewed_at ? format(new Date(proposal.viewed_at), 'MMM d') : '—'} />
        <Stat label="Signed" value={proposal.signed_at ? format(new Date(proposal.signed_at), 'MMM d') : '—'} />
      </div>

      {/* Onboarding cascade (fires once the proposal is signed) */}
      {status === 'signed' && proposal.deal_id && (
        <div className="mt-4 flex items-center justify-between rounded-lg border bg-background p-4">
          <div>
            <div className="text-sm font-medium">Onboarding</div>
            <p className="text-xs text-muted-foreground">
              Draft the invoice, queue the ClickUp project, and mark the client active. (Stripe/QBO/ClickUp simulated until connected.)
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              onboard.mutate(proposal.deal_id!, {
                onSuccess: (r) => toast.success(`Onboarding ran — invoice drafted${r.amount ? ` for ${formatMoney(r.amount)}` : ''}`),
                onError: (e) => toast.error(e instanceof Error ? e.message : 'Onboarding failed'),
              })
            }
            disabled={onboard.isPending}
          >
            {onboard.isPending ? 'Running…' : 'Run onboarding'}
          </Button>
        </div>
      )}

      {/* Accepted selection */}
      {proposal.proposal_packages.length > 0 && (
        <div className="mt-4 rounded-lg border bg-background p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Accepted selection {proposal.signer_name && `· signed by ${proposal.signer_name}`}
          </div>
          <ul className="space-y-2">
            {proposal.proposal_packages.map((pp) => {
              const addons = (pp.addons_snapshot as unknown as SnapshotAddon[] | null) ?? []
              return (
                <li key={pp.id} className="text-sm">
                  <div className="flex justify-between font-medium">
                    <span>{pp.name_snapshot}</span>
                    <span>{formatMoney(Number(pp.price_override ?? 0))}{pp.price_type_snapshot === 'monthly' ? '/mo' : ''}</span>
                  </div>
                  {addons.map((a, i) => (
                    <div key={i} className="flex justify-between pl-4 text-muted-foreground">
                      <span>+ {a.name}</span>
                      <span>{formatMoney(a.price)}{a.price_type === 'monthly' ? '/mo' : ''}</span>
                    </div>
                  ))}
                </li>
              )
            })}
          </ul>
          <div className="mt-3 border-t pt-3 text-sm">
            {discountPct > 0 && monthly > 0 && (
              <div className="flex justify-between text-xs text-emerald-600">
                <span>Discount ({discountPct}%)</span>
                <span>−{formatMoney(monthly - discounted.monthly)}/mo</span>
              </div>
            )}
            {discounted.monthly > 0 && <div className="flex justify-between font-semibold"><span>Monthly</span><span>{formatMoney(discounted.monthly)}/mo</span></div>}
            {discounted.oneTime > 0 && <div className="flex justify-between font-semibold"><span>One-time</span><span>{formatMoney(discounted.oneTime)}</span></div>}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  )
}
