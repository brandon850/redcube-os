import { useState } from 'react'
import { useBrands } from '@/features/brands/useBrands'
import { TEMPLATE_LIST, buildEmail, SAMPLE_PROPS } from './templates'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export default function EmailSettingsPage() {
  const { data: brands } = useBrands()
  const [templateId, setTemplateId] = useState(TEMPLATE_LIST[0]?.id ?? 'welcome')
  const [brandId, setBrandId] = useState<string>('')

  const brand = (brands ?? []).find((b) => b.id === brandId) ?? (brands ?? [])[0] ?? null
  const emailBrand = brand ? { name: brand.name, color: brand.brand_color, from_email: brand.from_email } : null
  const { subject, html } = buildEmail(templateId, emailBrand, SAMPLE_PROPS)

  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-semibold">Email templates</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Preview the transactional + sequence emails. Sending goes live once Resend is connected (each brand sends from its own identity).
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="space-y-1.5">
          <Label>Template</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TEMPLATE_LIST.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Brand</Label>
          <Select value={brand?.id ?? ''} onValueChange={setBrandId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Brand" /></SelectTrigger>
            <SelectContent>
              {(brands ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-5 rounded-lg border bg-background">
        <div className="border-b px-4 py-2 text-sm">
          <span className="text-muted-foreground">Subject:</span> <span className="font-medium">{subject}</span>
        </div>
        <iframe title="Email preview" srcDoc={html} className="h-[520px] w-full rounded-b-lg" />
      </div>
    </div>
  )
}
