import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Check, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { useSites, useCreateSite, useDeleteSite } from './useSites'
import { useCompanySearch } from '@/features/crm/useContacts'
import { useBrand } from '@/hooks/useBrand'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function SitesListPage() {
  const navigate = useNavigate()
  const { activeBrandId } = useBrand()
  const { data: sites, isLoading } = useSites(activeBrandId)
  const deleteSite = useDeleteSite()
  const [addOpen, setAddOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SEO Sites</h1>
          <p className="text-sm text-muted-foreground">Ongoing client work — audits, keywords, content, and reporting.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add site</Button>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : (sites ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No managed sites yet. Add one to start tracking client SEO work.
                </TableCell>
              </TableRow>
            ) : (
              (sites ?? []).map((s) => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/sites/${s.id}`)}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.domain}</TableCell>
                  <TableCell className="text-muted-foreground">{s.company?.name ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setConfirmId(s.id) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddSiteDialog open={addOpen} onOpenChange={setAddOpen} />

      <AlertDialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this site?</AlertDialogTitle>
            <AlertDialogDescription>Removes the site and all its audits, keywords, content, and checklist items.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmId) deleteSite.mutate(confirmId, { onSuccess: () => toast.success('Site deleted') }); setConfirmId(null) }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AddSiteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateSite()
  const { activeBrandId } = useBrand()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [company, setCompany] = useState<{ id: string; name: string } | null>(null)
  const [companyOpen, setCompanyOpen] = useState(false)
  const [companyQuery, setCompanyQuery] = useState('')
  const debounced = useDebounce(companyQuery, 250)
  const { data: companies } = useCompanySearch(debounced)

  async function handleCreate() {
    if (!name.trim() || !url.trim()) { toast.error('Name and URL are required'); return }
    try {
      await create.mutateAsync({ name, url, companyId: company?.id ?? null, brandId: activeBrandId })
      toast.success('Site added')
      setName(''); setUrl(''); setCompany(null)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add site')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add managed site</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Site name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Roofing" />
          </div>
          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="acmeroofing.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Client company (optional)</Label>
            <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {company ? company.name : <span className="text-muted-foreground">Link to a company…</span>}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Search companies…" value={companyQuery} onValueChange={setCompanyQuery} />
                  <CommandList>
                    <CommandEmpty>No companies found.</CommandEmpty>
                    <CommandGroup>
                      {(companies ?? []).map((c) => (
                        <CommandItem key={c.id} value={c.name} onSelect={() => { setCompany({ id: c.id, name: c.name }); setCompanyOpen(false) }}>
                          <Check className={cn('mr-2 h-4 w-4', company?.id === c.id ? 'opacity-100' : 'opacity-0')} />
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void handleCreate()} disabled={create.isPending}>Add site</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
