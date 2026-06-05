import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useBrands, useUpdateBrand } from './useBrands'
import { useAuth } from '@/hooks/useAuth'
import type { Brand } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'

export default function BrandsPage() {
  const { isAdmin } = useAuth()
  const { data: brands, isLoading } = useBrands()
  const [editing, setEditing] = useState<Brand | null>(null)

  if (isLoading) return <Skeleton className="h-64 w-full max-w-xl" />

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold">Brands</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Each brand has its own catalog, proposals, invoices, reports, and client-facing look.
      </p>

      <div className="mt-4 space-y-3">
        {(brands ?? []).map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-lg border bg-background p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-base font-black text-white" style={{ background: b.brand_color ?? '#888' }}>
              {b.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{b.name} {b.is_default && <span className="ml-1 text-xs text-muted-foreground">(default)</span>}</div>
              <div className="truncate text-sm text-muted-foreground">{b.from_email || '—'} · {b.brand_color}</div>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setEditing(b)}><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
            )}
          </div>
        ))}
      </div>

      <BrandEditor brand={editing} open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} />
    </div>
  )
}

function BrandEditor({ brand, open, onOpenChange }: { brand: Brand | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const update = useUpdateBrand()
  const [form, setForm] = useState({
    name: '', brand_color: '#E8172B', logo_url: '', from_name: '', from_email: '',
    default_payment_terms: 'Net 30', default_proposal_validity_days: 30, proposal_footer: '', website: '',
    seo_enabled: true,
  })

  useEffect(() => {
    if (!brand) return
    setForm({
      name: brand.name,
      brand_color: brand.brand_color ?? '#E8172B',
      logo_url: brand.logo_url ?? '',
      from_name: brand.from_name ?? '',
      from_email: brand.from_email ?? '',
      default_payment_terms: brand.default_payment_terms ?? 'Net 30',
      default_proposal_validity_days: brand.default_proposal_validity_days ?? 30,
      proposal_footer: brand.proposal_footer ?? '',
      website: brand.website ?? '',
      seo_enabled: brand.seo_enabled,
    })
  }, [brand])

  if (!brand) return null

  async function handleSave() {
    if (!brand) return
    try {
      await update.mutateAsync({
        id: brand.id,
        patch: {
          name: form.name.trim(),
          brand_color: form.brand_color,
          logo_url: form.logo_url.trim() || null,
          from_name: form.from_name.trim() || null,
          from_email: form.from_email.trim() || null,
          default_payment_terms: form.default_payment_terms,
          default_proposal_validity_days: Number(form.default_proposal_validity_days) || 30,
          proposal_footer: form.proposal_footer.trim() || null,
          website: form.website.trim() || null,
          seo_enabled: form.seo_enabled,
        },
      })
      toast.success('Brand updated')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    }
  }

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit brand</SheetTitle>
          <SheetDescription>This brand's identity on proposals, reports, and public pages.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Brand color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.brand_color} onChange={(e) => set('brand_color', e.target.value)} className="h-9 w-12 rounded border" />
              <Input value={form.brand_color} onChange={(e) => set('brand_color', e.target.value)} className="w-32" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Logo URL</Label>
            <Input value={form.logo_url} onChange={(e) => set('logo_url', e.target.value)} placeholder="https://… (optional)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From name</Label>
              <Input value={form.from_name} onChange={(e) => set('from_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>From email</Label>
              <Input value={form.from_email} onChange={(e) => set('from_email', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input value={form.website} onChange={(e) => set('website', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Default payment terms</Label>
              <Input value={form.default_payment_terms} onChange={(e) => set('default_payment_terms', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Proposal validity (days)</Label>
              <Input type="number" value={form.default_proposal_validity_days} onChange={(e) => set('default_proposal_validity_days', Number(e.target.value) || 0)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Proposal footer</Label>
            <Textarea rows={2} value={form.proposal_footer} onChange={(e) => set('proposal_footer', e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="font-normal">SEO features</Label>
              <p className="text-xs text-muted-foreground">Audits, managed sites & client reports. Off = sell-only brand.</p>
            </div>
            <Switch checked={form.seo_enabled} onCheckedChange={(v) => set('seo_enabled', v)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save brand'}</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
