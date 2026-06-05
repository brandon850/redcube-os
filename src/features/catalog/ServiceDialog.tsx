import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useUpsertService } from './useCatalog'
import { useBrand } from '@/hooks/useBrand'
import type { Service } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

export default function ServiceDialog({
  service, open, onOpenChange,
}: {
  service: Service | null // null = create
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const upsert = useUpsertService()
  const { activeBrandId } = useBrand()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [sortOrder, setSortOrder] = useState('99')

  useEffect(() => {
    setName(service?.name ?? '')
    setEmoji(service?.emoji ?? '')
    setSortOrder(String(service?.sort_order ?? 99))
  }, [service, open])

  async function handleSave() {
    if (!name.trim()) { toast.error('Name is required'); return }
    try {
      await upsert.mutateAsync({
        ...(service?.id ? { id: service.id } : { brand_id: activeBrandId }),
        name: name.trim(),
        emoji: emoji.trim() || null,
        sort_order: Number(sortOrder) || 99,
      })
      toast.success(service ? 'Service updated' : 'Service added')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{service ? 'Edit service' : 'New service'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Web Design" />
            </div>
            <div className="space-y-1.5">
              <Label>Emoji</Label>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🌐" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Sort order</Label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={upsert.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
