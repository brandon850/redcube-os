import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Plus, Search, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useContacts, useActiveUsers, useContactSources, useDeleteContact, PAGE_SIZE, type ContactFilters,
} from './useContacts'
import { useDebounce } from '@/hooks/useDebounce'
import { CONTACT_STATUSES, StatusBadge } from '@/components/StatusBadge'
import NewContactSheet from './NewContactSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const ALL = '__all__'

export default function ContactsPage() {
  const [search, setSearch] = useState('')
  const [statuses, setStatuses] = useState<string[]>([])
  const [sources, setSources] = useState<string[]>([])
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const deleteContact = useDeleteContact()

  const debouncedSearch = useDebounce(search, 300)

  const filters: ContactFilters = useMemo(
    () => ({ search: debouncedSearch, statuses, sources, assignedTo, page }),
    [debouncedSearch, statuses, sources, assignedTo, page],
  )

  const { data, isLoading, isError, error } = useContacts(filters)
  const { data: users } = useActiveUsers()
  const { data: sourceOptions } = useContactSources()

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rows = data?.rows ?? []

  // Reset to page 1 whenever a filter changes.
  function onFilterChange<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  const hasActiveFilters =
    statuses.length > 0 || sources.length > 0 || !!assignedTo || search.trim().length > 0

  function clearFilters() {
    setSearch(''); setStatuses([]); setSources([]); setAssignedTo(null); setPage(1)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">{total} total</p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New contact
        </Button>
      </div>

      {/* Filter row */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => onFilterChange(setSearch)(e.target.value)}
            className="pl-8"
          />
        </div>

        <MultiSelectFilter
          label="Status"
          options={CONTACT_STATUSES.map((s) => ({ value: s, label: s }))}
          selected={statuses}
          onChange={onFilterChange(setStatuses)}
        />
        <MultiSelectFilter
          label="Source"
          options={(sourceOptions ?? []).map((s) => ({ value: s, label: s }))}
          selected={sources}
          onChange={onFilterChange(setSources)}
        />

        <Select
          value={assignedTo ?? ALL}
          onValueChange={(v) => onFilterChange(setAssignedTo)(v === ALL ? null : v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Assigned to" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All assignees</SelectItem>
            {(users ?? []).map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.full_name || u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Lead score</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-destructive">
                  {error instanceof Error ? error.message : 'Failed to load contacts'}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  No contacts {hasActiveFilters ? 'match these filters' : 'yet'}.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => (
                <TableRow key={c.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link to={`/contacts/${c.id}`} className="hover:underline">
                      {c.first_name} {c.last_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {c.company ? (
                      <Link to={`/companies?id=${c.company.id}`} className="hover:underline">
                        {c.company.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{c.source || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.lead_score}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.assignee?.full_name || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.created_at ? format(new Date(c.created_at), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" title="Delete contact" onClick={() => setConfirmId(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total > 0
            ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`
            : '0 results'}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span>Page {page} of {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <NewContactSheet open={sheetOpen} onOpenChange={setSheetOpen} />

      <AlertDialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the contact and its activity history. Linked deals, proposals, and invoices are kept but unlinked from the contact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmId) deleteContact.mutate(confirmId, { onSuccess: () => toast.success('Contact deleted') })
                setConfirmId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** A small multi-select dropdown built on Popover; shows a count badge when active. */
function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="font-normal">
          {label}
          {selected.length > 0 && (
            <span className="ml-2 rounded bg-primary px-1.5 text-xs text-primary-foreground">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        {options.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">None available</div>
        ) : (
          options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm capitalize hover:bg-accent',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded border',
                  selected.includes(opt.value) ? 'bg-primary text-primary-foreground' : 'border-input',
                )}
              >
                {selected.includes(opt.value) && '✓'}
              </span>
              {opt.label}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  )
}
