import { useEffect, useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useSavePackage, type CatalogPackage } from './useCatalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface AddonDraft { name: string; price: number; price_type: string }

export default function PackageSheet({
  pkg, open, onOpenChange,
}: {
  pkg: CatalogPackage | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const save = useSavePackage()

  const [name, setName] = useState('')
  const [tier, setTier] = useState('')
  const [tagline, setTagline] = useState('')
  const [price, setPrice] = useState('0')
  const [priceType, setPriceType] = useState('monthly')
  const [featured, setFeatured] = useState(false)
  const [popular, setPopular] = useState(false)
  const [active, setActive] = useState(true)
  const [lineItems, setLineItems] = useState('')
  const [addons, setAddons] = useState<AddonDraft[]>([])

  useEffect(() => {
    if (!pkg) return
    setName(pkg.name)
    setTier(pkg.tier ?? '')
    setTagline(pkg.tagline ?? '')
    setPrice(String(pkg.base_price ?? 0))
    setPriceType(pkg.price_type)
    setFeatured(pkg.featured)
    setPopular(pkg.is_popular)
    setActive(pkg.is_active)
    setLineItems(pkg.package_line_items.map((li) => li.description).join('\n'))
    setAddons(pkg.package_addons.map((a) => ({ name: a.name, price: Number(a.price), price_type: a.price_type })))
  }, [pkg])

  if (!pkg) return null

  async function handleSave() {
    if (!pkg) return
    try {
      await save.mutateAsync({
        id: pkg.id,
        fields: {
          name: name.trim(), tier: tier.trim() || null, tagline: tagline.trim() || null,
          base_price: Number(price) || 0, price_type: priceType,
          featured, is_popular: popular, is_active: active,
        },
        lineItems: lineItems.split('\n').map((s) => s.trim()).filter(Boolean),
        addons: addons.filter((a) => a.name.trim()).map((a) => ({ ...a, name: a.name.trim(), price: Number(a.price) || 0 })),
      })
      toast.success('Package saved')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit package</SheetTitle>
          <SheetDescription>Tier details, deliverables, and per-package add-ons.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tier</Label>
              <Input value={tier} onChange={(e) => setTier(e.target.value)} placeholder="Option A / Good" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tagline</Label>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
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

          <div className="space-y-1.5">
            <Label>Deliverables (one per line)</Label>
            <Textarea rows={6} value={lineItems} onChange={(e) => setLineItems(e.target.value)} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Column add-ons</Label>
              <Button
                type="button" variant="ghost" size="sm"
                onClick={() => setAddons((a) => [...a, { name: '', price: 0, price_type: priceType }])}
              >
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {addons.length === 0 && <p className="text-sm text-muted-foreground">No add-ons.</p>}
              {addons.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="flex-1" placeholder="Add-on name"
                    value={a.name}
                    onChange={(e) => setAddons((arr) => arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  />
                  <Input
                    type="number" min={0} className="w-24" placeholder="Price"
                    value={a.price}
                    onChange={(e) => setAddons((arr) => arr.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) || 0 } : x)))}
                  />
                  <Select
                    value={a.price_type}
                    onValueChange={(v) => setAddons((arr) => arr.map((x, j) => (j === i ? { ...x, price_type: v } : x)))}
                  >
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">/mo</SelectItem>
                      <SelectItem value="one_time">one-time</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setAddons((arr) => arr.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <Toggle label="Featured" checked={featured} onChange={setFeatured} />
            <Toggle label="Popular badge" checked={popular} onChange={setPopular} />
            <Toggle label="Active" checked={active} onChange={setActive} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save package'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
