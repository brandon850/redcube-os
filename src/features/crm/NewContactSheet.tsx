import { useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useCompanySearch, useActiveUsers, useCreateContact } from './useContacts'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface CompanyChoice {
  id: string | null // null = create new
  name: string
}

export default function NewContactSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createContact = useCreateContact()
  const { data: users } = useActiveUsers()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [source, setSource] = useState('')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [notes, setNotes] = useState('')

  const [company, setCompany] = useState<CompanyChoice | null>(null)
  const [companyOpen, setCompanyOpen] = useState(false)
  const [companyQuery, setCompanyQuery] = useState('')
  const debouncedCompanyQuery = useDebounce(companyQuery, 250)
  const { data: companyResults } = useCompanySearch(debouncedCompanyQuery)

  function reset() {
    setFirstName(''); setLastName(''); setEmail(''); setPhone('')
    setSource(''); setAssignedTo(''); setNotes(''); setCompany(null); setCompanyQuery('')
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error('First name, last name, and email are required')
      return
    }
    try {
      await createContact.mutateAsync({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        companyId: company?.id ?? null,
        newCompanyName: company && company.id === null ? company.name : null,
        source,
        assigned_to: assignedTo || null,
        notes,
      })
      toast.success('Contact created')
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create contact')
    }
  }

  const showCreateCompany =
    companyQuery.trim().length > 0 &&
    !(companyResults ?? []).some((c) => c.name.toLowerCase() === companyQuery.trim().toLowerCase())

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New contact</SheetTitle>
          <SheetDescription>Add a contact. They'll start as a lead.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">First name *</Label>
              <Input id="first_name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Last name *</Label>
              <Input id="last_name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          {/* Company combobox — search existing or create new */}
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {company ? company.name : <span className="text-muted-foreground">Select or create…</span>}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search companies…"
                    value={companyQuery}
                    onValueChange={setCompanyQuery}
                  />
                  <CommandList>
                    {!showCreateCompany && <CommandEmpty>No companies found.</CommandEmpty>}
                    <CommandGroup>
                      {(companyResults ?? []).map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.name}
                          onSelect={() => {
                            setCompany({ id: c.id, name: c.name })
                            setCompanyOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              company?.id === c.id ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {c.name}
                        </CommandItem>
                      ))}
                      {showCreateCompany && (
                        <CommandItem
                          value={`__create__${companyQuery}`}
                          onSelect={() => {
                            setCompany({ id: null, name: companyQuery.trim() })
                            setCompanyOpen(false)
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create “{companyQuery.trim()}”
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Referral, Google, Audit tool"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Assigned to</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {(users ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={createContact.isPending}>
            {createContact.isPending ? 'Saving…' : 'Create contact'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
