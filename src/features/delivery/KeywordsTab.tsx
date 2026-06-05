import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useKeywords, useAddKeyword, useUpdateKeyword, useDeleteKeyword } from './useKeywords'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export default function KeywordsTab({ siteId }: { siteId: string }) {
  const { data: keywords, isLoading } = useKeywords(siteId)
  const add = useAddKeyword(siteId)
  const update = useUpdateKeyword(siteId)
  const del = useDeleteKeyword(siteId)

  const [keyword, setKeyword] = useState('')
  const [position, setPosition] = useState('')
  const [volume, setVolume] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!keyword.trim()) return
    add.mutate(
      { keyword, position: position ? Number(position) : null, search_volume: volume ? Number(volume) : null },
      { onSuccess: () => { setKeyword(''); setPosition(''); setVolume('') } },
    )
  }

  return (
    <div className="max-w-3xl">
      <h2 className="mb-3 font-semibold">Tracked keywords</h2>

      <form onSubmit={submit} className="mb-4 flex gap-2">
        <Input className="flex-1" placeholder="Keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <Input className="w-24" type="number" placeholder="Pos" value={position} onChange={(e) => setPosition(e.target.value)} />
        <Input className="w-28" type="number" placeholder="Volume" value={volume} onChange={(e) => setVolume(e.target.value)} />
        <Button type="submit" disabled={!keyword.trim() || add.isPending}><Plus className="h-4 w-4" /></Button>
      </form>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keyword</TableHead>
              <TableHead className="w-28 text-right">Position</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4}><Skeleton className="h-4 w-full" /></TableCell></TableRow>
            ) : (keywords ?? []).length === 0 ? (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No keywords tracked yet.</TableCell></TableRow>
            ) : (
              (keywords ?? []).map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.keyword}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      defaultValue={k.position ?? ''}
                      className="h-8 w-20 text-right"
                      onBlur={(e) => {
                        const v = e.target.value === '' ? null : Number(e.target.value)
                        if (v !== k.position) update.mutate({ id: k.id, patch: { position: v } })
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{k.search_volume ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <button onClick={() => del.mutate(k.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Positions are entered manually for now; automated rank tracking arrives with the data provider integration.</p>
    </div>
  )
}
