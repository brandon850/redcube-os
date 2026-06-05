import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSequences, useCreateSequence, useDeleteSequence, type SequenceRow } from './useSequences'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const count = (s: SequenceRow) => s.enrollments?.[0]?.count ?? 0

export default function SequencesListPage() {
  const navigate = useNavigate()
  const { data: sequences, isLoading } = useSequences()
  const createSequence = useCreateSequence()
  const deleteSequence = useDeleteSequence()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function handleNew() {
    const seq = await createSequence.mutateAsync('New sequence')
    navigate(`/sequences/${seq.id}`)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sequences</h1>
          <p className="text-sm text-muted-foreground">Automated follow-up — emails and waits, triggered by enrollment.</p>
        </div>
        <Button onClick={() => void handleNew()} disabled={createSequence.isPending}><Plus className="mr-2 h-4 w-4" /> New sequence</Button>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead className="text-right">Enrollments</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              ))
            ) : (sequences ?? []).length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No sequences yet.</TableCell></TableRow>
            ) : (
              (sequences ?? []).map((s) => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/sequences/${s.id}`)}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{s.trigger_type ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{count(s)}</TableCell>
                  <TableCell>
                    <span className={s.is_active ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700' : 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500'}>
                      {s.is_active ? 'Active' : 'Draft'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setConfirmId(s.id) }}><Trash2 className="h-4 w-4" /></Button>
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
            <AlertDialogTitle>Delete this sequence?</AlertDialogTitle>
            <AlertDialogDescription>Active enrollments will be removed too.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmId) deleteSequence.mutate(confirmId, { onSuccess: () => toast.success('Sequence deleted') }); setConfirmId(null) }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
