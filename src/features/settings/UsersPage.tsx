import { useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { UserPlus } from 'lucide-react'
import { useUsers, useUpdateUser, useInviteUser } from './useSettings'
import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const ROLES: Role[] = ['admin', 'sales', 'viewer']

export default function UsersPage() {
  const { authUser, isAdmin } = useAuth()
  const { data: users, isLoading } = useUsers()
  const update = useUpdateUser()
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage your team's roles and access.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Invite teammate</Button>
        )}
      </div>

      <div className="mt-4 rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              (users ?? []).map((u) => {
                const isSelf = u.id === authUser?.id
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.full_name || '—'}{isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        disabled={isSelf || !isAdmin}
                        onValueChange={(v) =>
                          update.mutate(
                            { id: u.id, patch: { role: v } },
                            { onSuccess: () => toast.success('Role updated') },
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={u.is_active}
                        disabled={isSelf || !isAdmin}
                        onCheckedChange={(v) =>
                          update.mutate(
                            { id: u.id, patch: { is_active: v } },
                            { onSuccess: () => toast.success(v ? 'User activated' : 'User deactivated') },
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">You can't change your own role or deactivate yourself.</p>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  )
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const invite = useInviteUser()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('sales')

  async function handleInvite() {
    if (!email.trim()) { toast.error('Enter an email'); return }
    try {
      await invite.mutateAsync({ email: email.trim(), role, full_name: name.trim() || undefined })
      toast.success(`Invite sent to ${email.trim()}`)
      setEmail(''); setName(''); setRole('sales')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send invite')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite teammate</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@redcube.co" />
          </div>
          <div className="space-y-1.5">
            <Label>Name (optional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">They'll get an email invite to set a password and join with this role.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void handleInvite()} disabled={invite.isPending}>
            {invite.isPending ? 'Sending…' : 'Send invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
