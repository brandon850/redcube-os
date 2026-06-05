import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useActiveUsers } from './useContacts'
import { useUpdateContact, type ContactDetail } from './useContactDetail'
import { CONTACT_STATUSES } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const UNASSIGNED = '__unassigned__'

export default function EditContactSheet({
  contact,
  open,
  onOpenChange,
}: {
  contact: ContactDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const update = useUpdateContact(contact.id)
  const { data: users } = useActiveUsers()

  const [firstName, setFirstName] = useState(contact.first_name)
  const [lastName, setLastName] = useState(contact.last_name)
  const [email, setEmail] = useState(contact.email)
  const [phone, setPhone] = useState(contact.phone ?? '')
  const [source, setSource] = useState(contact.source ?? '')
  const [status, setStatus] = useState(contact.status ?? 'lead')
  const [assignedTo, setAssignedTo] = useState(contact.assigned_to ?? UNASSIGNED)

  // Re-sync when a different contact is opened.
  useEffect(() => {
    setFirstName(contact.first_name)
    setLastName(contact.last_name)
    setEmail(contact.email)
    setPhone(contact.phone ?? '')
    setSource(contact.source ?? '')
    setStatus(contact.status ?? 'lead')
    setAssignedTo(contact.assigned_to ?? UNASSIGNED)
  }, [contact])

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error('First name, last name, and email are required')
      return
    }
    try {
      await update.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        source: source.trim() || null,
        status,
        assigned_to: assignedTo === UNASSIGNED ? null : assignedTo,
        _logStatusFrom: contact.status,
      })
      toast.success('Contact updated')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update contact')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit contact</SheetTitle>
          <SheetDescription>Update this contact's details.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="e_first">First name *</Label>
              <Input id="e_first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e_last">Last name *</Label>
              <Input id="e_last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e_email">Email *</Label>
            <Input id="e_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e_phone">Phone</Label>
            <Input id="e_phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e_source">Source</Label>
            <Input id="e_source" value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTACT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assigned to</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {(users ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
