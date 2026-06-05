import { toast } from 'sonner'
import { format } from 'date-fns'
import { useUsers, useUpdateUser } from './useSettings'
import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/hooks/useAuth'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const ROLES: Role[] = ['admin', 'sales', 'viewer']

export default function UsersPage() {
  const { authUser } = useAuth()
  const { data: users, isLoading } = useUsers()
  const update = useUpdateUser()

  return (
    <div>
      <h2 className="text-lg font-semibold">Users</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage roles and access. New users currently sign in via Supabase Auth (email invites land in P14 once Resend is wired).
      </p>

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
                        disabled={isSelf}
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
                        disabled={isSelf}
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
    </div>
  )
}
