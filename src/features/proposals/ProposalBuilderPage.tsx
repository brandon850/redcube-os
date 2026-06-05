import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { useContactSearch, useCreateProposal } from './useProposals'
import { useCompanySettings } from '@/features/settings/useSettings'
import { useBrand } from '@/hooks/useBrand'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'

const PAYMENT_TERMS = ['Due on receipt', 'Net 15', 'Net 30', 'Net 60', '50% upfront, 50% on completion']

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function ProposalBuilderPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const create = useCreateProposal()
  const { data: settings } = useCompanySettings()
  const { activeBrand, activeBrandId } = useBrand()

  const prefilledContact = params.get('contact')
  const prefilledDeal = params.get('deal')

  const [contact, setContact] = useState<{ id: string; name: string } | null>(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactQuery, setContactQuery] = useState('')
  const debounced = useDebounce(contactQuery, 250)
  const { data: results } = useContactSearch(debounced)

  const [intro, setIntro] = useState('')
  const [terms, setTerms] = useState('Net 30')
  const [discount, setDiscount] = useState('0')
  const [validUntil, setValidUntil] = useState(addDays(30))

  // Prefill from query (e.g. arriving from a deal) + company defaults.
  useEffect(() => {
    if (prefilledContact && !contact) {
      void (async () => {
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase.from('contacts').select('id, first_name, last_name').eq('id', prefilledContact).maybeSingle()
        if (data) setContact({ id: data.id, name: `${data.first_name} ${data.last_name}` })
      })()
    }
  }, [prefilledContact, contact])

  useEffect(() => {
    if (settings?.default_payment_terms) setTerms(settings.default_payment_terms)
    if (settings?.default_proposal_validity_days) setValidUntil(addDays(settings.default_proposal_validity_days))
  }, [settings])

  async function handleCreate() {
    if (!contact) { toast.error('Pick a contact'); return }
    try {
      const proposal = await create.mutateAsync({
        contactId: contact.id,
        dealId: prefilledDeal,
        brandId: activeBrandId,
        introText: intro,
        paymentTerms: terms,
        discountPct: Number(discount) || 0,
        validUntil,
      })
      navigate(`/proposals/${proposal.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create proposal')
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">New proposal</h1>
      <p className="text-sm text-muted-foreground">
        Brand: <span className="font-medium text-foreground">{activeBrand?.name ?? '—'}</span> · the client picks from {activeBrand?.name ?? 'this brand'}'s catalog on a shareable link.
      </p>

      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Contact *</Label>
          {prefilledContact && contact ? (
            <Input value={contact.name} disabled />
          ) : (
            <Popover open={contactOpen} onOpenChange={setContactOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {contact ? contact.name : <span className="text-muted-foreground">Search contacts…</span>}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Search contacts…" value={contactQuery} onValueChange={setContactQuery} />
                  <CommandList>
                    <CommandEmpty>No contacts found.</CommandEmpty>
                    <CommandGroup>
                      {(results ?? []).map((c) => (
                        <CommandItem key={c.id} value={c.name} onSelect={() => { setContact({ id: c.id, name: c.name }); setContactOpen(false) }}>
                          <Check className={cn('mr-2 h-4 w-4', contact?.id === c.id ? 'opacity-100' : 'opacity-0')} />
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Intro message</Label>
          <Textarea rows={3} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="A short note shown at the top of the proposal." />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Payment terms</Label>
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={terms} onChange={(e) => setTerms(e.target.value)}>
              {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Discount %</Label>
            <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Valid until</Label>
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </div>

        <Button onClick={() => void handleCreate()} disabled={create.isPending}>
          {create.isPending ? 'Creating…' : 'Create proposal'}
        </Button>
      </div>
    </div>
  )
}
