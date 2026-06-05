import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useCompanySettings, useSaveCompanySettings } from './useSettings'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const PAYMENT_TERMS = ['Due on receipt', 'Net 15', 'Net 30', 'Net 60', '50% upfront, 50% on completion']

export default function CompanyPage() {
  const { isAdmin } = useAuth()
  const { data, isLoading } = useCompanySettings()
  const save = useSaveCompanySettings()

  const [form, setForm] = useState({
    company_name: '', website: '', from_name: '', from_email: '', reply_to: '',
    business_address: '', default_proposal_validity_days: 30,
    default_payment_terms: 'Net 30', require_approval: false,
  })

  useEffect(() => {
    if (!data) return
    setForm({
      company_name: data.company_name ?? '',
      website: data.website ?? '',
      from_name: data.from_name ?? '',
      from_email: data.from_email ?? '',
      reply_to: data.reply_to ?? '',
      business_address: data.business_address ?? '',
      default_proposal_validity_days: data.default_proposal_validity_days ?? 30,
      default_payment_terms: data.default_payment_terms ?? 'Net 30',
      require_approval: data.require_approval,
    })
  }, [data])

  if (isLoading) return <Skeleton className="h-80 w-full max-w-xl" />

  async function handleSave() {
    try {
      await save.mutateAsync(form)
      toast.success('Company settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    }
  }

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold">Company</h2>
      {!isAdmin && <p className="mt-1 text-sm text-muted-foreground">Read-only — admins can edit.</p>}

      <fieldset disabled={!isAdmin} className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label>Company name</Label>
          <Input value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Website</Label>
          <Input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://redcube.co" />
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
          <Label>Reply-to</Label>
          <Input value={form.reply_to} onChange={(e) => set('reply_to', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Business address</Label>
          <Textarea rows={2} value={form.business_address} onChange={(e) => set('business_address', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Default proposal validity (days)</Label>
            <Input
              type="number" min={1}
              value={form.default_proposal_validity_days}
              onChange={(e) => set('default_proposal_validity_days', Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Default payment terms</Label>
            <Select value={form.default_payment_terms} onValueChange={(v) => set('default_payment_terms', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label className="font-normal">Require approval on proposals</Label>
            <p className="text-xs text-muted-foreground">Proposals above threshold need admin sign-off.</p>
          </div>
          <Switch checked={form.require_approval} onCheckedChange={(v) => set('require_approval', v)} />
        </div>

        {isAdmin && (
          <Button onClick={() => void handleSave()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        )}
      </fieldset>
    </div>
  )
}
