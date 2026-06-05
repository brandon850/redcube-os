import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useContentDrafts, useCreateDraft, useSaveDraft, useDeleteDraft, CONTENT_STATUSES,
} from './useContent'
import type { ContentDraft } from '@/types/database.types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  review: 'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
}

export default function ContentTab({ siteId }: { siteId: string }) {
  const { data: drafts, isLoading } = useContentDrafts(siteId)
  const create = useCreateDraft(siteId)
  const del = useDeleteDraft(siteId)
  const [editing, setEditing] = useState<ContentDraft | null>(null)

  async function handleNew() {
    const draft = await create.mutateAsync()
    setEditing(draft)
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Content drafts</h2>
        <Button onClick={() => void handleNew()} disabled={create.isPending}><Plus className="mr-2 h-4 w-4" /> New draft</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (drafts ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No drafts yet.</p>
      ) : (
        <ul className="divide-y rounded-md border bg-background">
          {(drafts ?? []).map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
              <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(d)}>
                <div className="truncate font-medium hover:underline">{d.title}</div>
                <div className="text-xs text-muted-foreground">
                  {d.target_keyword && <>target: {d.target_keyword} · </>}
                  updated {d.updated_at ? format(new Date(d.updated_at), 'MMM d') : '—'}
                </div>
              </button>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', STATUS_STYLES[d.status])}>{d.status}</span>
              <button onClick={() => del.mutate(d.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <DraftEditor siteId={siteId} draft={editing} open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} />
    </div>
  )
}

function DraftEditor({
  siteId, draft, open, onOpenChange,
}: {
  siteId: string
  draft: ContentDraft | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const save = useSaveDraft(siteId)
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [status, setStatus] = useState('draft')
  const [body, setBody] = useState('')

  useEffect(() => {
    if (!draft) return
    setTitle(draft.title)
    setTarget(draft.target_keyword ?? '')
    setStatus(draft.status)
    setBody(draft.body ?? '')
  }, [draft])

  if (!draft) return null

  async function handleSave() {
    if (!draft) return
    await save.mutateAsync({ id: draft.id, patch: { title: title.trim() || 'Untitled draft', target_keyword: target.trim() || null, status, body } })
    toast.success('Draft saved')
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-2xl">
        <SheetHeader><SheetTitle>Edit draft</SheetTitle></SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Target keyword</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTENT_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Body</Label>
            <Textarea rows={16} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the content here…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={() => void handleSave()} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save draft'}</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
