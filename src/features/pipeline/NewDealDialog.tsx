import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useCreateDeal, usePipelineStages } from './usePipeline'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface ContactChoice {
  id: string
  name: string
  companyId: string | null
}

function useContactSearch(query: string) {
  return useQuery({
    queryKey: ['contacts', 'deal-search', query],
    queryFn: async (): Promise<ContactChoice[]> => {
      let q = supabase
        .from('contacts')
        .select('id, first_name, last_name, company_id')
        .order('created_at', { ascending: false })
        .limit(10)
      const term = query.trim()
      if (term) q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map((c) => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`,
        companyId: c.company_id,
      }))
    },
  })
}

export default function NewDealDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: stages } = usePipelineStages()
  const createDeal = useCreateDeal()

  const [contact, setContact] = useState<ContactChoice | null>(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactQuery, setContactQuery] = useState('')
  const debounced = useDebounce(contactQuery, 250)
  const { data: contactResults } = useContactSearch(debounced)

  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [stageId, setStageId] = useState('')

  const effectiveStageId = stageId || stages?.[0]?.id || ''

  function reset() {
    setContact(null); setContactQuery(''); setTitle(''); setValue(''); setStageId('')
  }

  async function handleCreate() {
    if (!contact) { toast.error('Pick a contact'); return }
    if (!title.trim()) { toast.error('Give the deal a title'); return }
    const stage = stages?.find((s) => s.id === effectiveStageId)
    try {
      await createDeal.mutateAsync({
        contactId: contact.id,
        companyId: contact.companyId,
        title,
        value: Number(value) || 0,
        stageId: effectiveStageId,
        probability: stage?.default_probability ?? null,
      })
      toast.success('Deal created')
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create deal')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New deal</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Contact *</Label>
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
                      {(contactResults ?? []).map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.name}
                          onSelect={() => { setContact(c); setContactOpen(false) }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', contact?.id === c.id ? 'opacity-100' : 'opacity-0')} />
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal_title">Title *</Label>
            <Input id="deal_title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Website rebuild" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="deal_value">Value ($)</Label>
              <Input id="deal_value" type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={effectiveStageId} onValueChange={setStageId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(stages ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void handleCreate()} disabled={createDeal.isPending}>
            {createDeal.isPending ? 'Creating…' : 'Create deal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
