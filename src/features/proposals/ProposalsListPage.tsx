import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useProposals, useDeleteProposal } from './useProposals'
import { useBrand } from '@/hooks/useBrand'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-amber-100 text-amber-700',
  signed: 'bg-emerald-100 text-emerald-700',
}

export default function ProposalsListPage() {
  const navigate = useNavigate()
  const { activeBrandId } = useBrand()
  const { data: proposals, isLoading } = useProposals(activeBrandId)
  const deleteProposal = useDeleteProposal()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Proposals</h1>
        <Button onClick={() => navigate('/proposals/new')}><Plus className="mr-2 h-4 w-4" /> New proposal</Button>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead>Valid until</TableHead>
              <TableHead>Signed</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : (proposals ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No proposals yet.
                </TableCell>
              </TableRow>
            ) : (
              (proposals ?? []).map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/proposals/${p.id}`)}>
                  <TableCell className="font-medium">
                    {p.contact ? `${p.contact.first_name} ${p.contact.last_name}` : '—'}
                  </TableCell>
                  <TableCell>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', STATUS_STYLES[p.status ?? 'draft'])}>
                      {p.status ?? 'draft'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.view_count}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.valid_until ? format(new Date(p.valid_until), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.signed_at ? format(new Date(p.signed_at), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost" size="icon"
                      onClick={(e) => { e.stopPropagation(); setConfirmId(p.id) }}
                      title="Delete proposal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
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
              onClick={() => {
                if (confirmId) deleteProposal.mutate(confirmId, { onSuccess: () => toast.success('Proposal deleted') })
                setConfirmId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
