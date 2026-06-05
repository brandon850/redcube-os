import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useUpsertServiceAddon } from './useCatalog'
import type { ServiceAddon } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export default function ServiceAddonDialog({
  serviceId, addon, open, onOpenChange,
}: {
  serviceId: string
  addon: ServiceAddon | null // null = create
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const upsert = useUpsertServiceAddon()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('0')
  const [priceType, setPriceType] = useState('monthly')

  useEffect(() => {
    setName(addon?.name ?? '')
    setDescription(addon?.description ?? '')
    setPrice(String(addon?.price ?? 0))
    setPriceType(addon?.price_type ?? 'monthly')
  }, [addon, open])

  async function handleSave() {
    if (!name.trim()) { toast.error('Name is required'); return }
    try {
      await upsert.mutateAsync({
        ...(addon?.id ? { id: addon.id } : {}),
        service_id: serviceId,
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price) || 0,
        price_type: priceType,
      })
      toast.success('Add-on saved')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{addon ? 'Edit shared add-on' : 'New shared add-on'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Price ($)</Label>
              <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Billing</Label>
              <Select value={priceType} onValueChange={setPriceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
