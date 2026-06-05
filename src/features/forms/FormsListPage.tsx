import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Code, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useForms, useCreateForm, useToggleForm, useDeleteForm, type FormRow } from './useForms'
import { useBrand } from '@/hooks/useBrand'
import EmbedSheet from './EmbedSheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

function subCount(f: FormRow): number {
  return f.submissions?.[0]?.count ?? 0
}

export default function FormsListPage() {
  const navigate = useNavigate()
  const { activeBrandId } = useBrand()
  const { data: forms, isLoading } = useForms(activeBrandId)
  const createForm = useCreateForm()
  const toggleForm = useToggleForm()
  const deleteForm = useDeleteForm()

  const [embedToken, setEmbedToken] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  async function handleCreate() {
    const form = await createForm.mutateAsync({ name: 'Untitled form', brandId: activeBrandId })
    navigate(`/forms/${form.id}/edit`)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Forms</h1>
        <Button onClick={() => void handleCreate()} disabled={createForm.isPending}>
          <Plus className="mr-2 h-4 w-4" /> New form
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Submissions</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (forms ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No forms yet. Create one to start capturing leads.
                </TableCell>
              </TableRow>
            ) : (
              (forms ?? []).map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">
                    <button className="hover:underline" onClick={() => navigate(`/forms/${f.id}/edit`)}>
                      {f.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{subCount(f)}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleForm.mutate({ id: f.id, is_active: !f.is_active })}
                      className={
                        f.is_active
                          ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'
                          : 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500'
                      }
                    >
                      {f.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Embed code" onClick={() => setEmbedToken(f.embed_token)}>
                        <Code className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => navigate(`/forms/${f.id}/edit`)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => setConfirmDelete(f.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EmbedSheet token={embedToken} open={embedToken !== null} onOpenChange={(o) => !o && setEmbedToken(null)} />

      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this form?</AlertDialogTitle>
            <AlertDialogDescription>
              The form and its embed will stop working. Submissions already captured are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) {
                  deleteForm.mutate(confirmDelete, { onSuccess: () => toast.success('Form deleted') })
                }
                setConfirmDelete(null)
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
