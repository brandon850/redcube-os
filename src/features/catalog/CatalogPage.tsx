import { useState } from 'react'
import { Plus, Pencil, Trash2, Star } from 'lucide-react'
import { toast } from 'sonner'
import {
  useCatalog, useDeleteService, useCreatePackage, useDeletePackage, useDeleteServiceAddon,
  type CatalogPackage, type CatalogService,
} from './useCatalog'
import PackageSheet from './PackageSheet'
import ServiceDialog from './ServiceDialog'
import ServiceAddonDialog from './ServiceAddonDialog'
import type { Service, ServiceAddon } from '@/types/database.types'
import { useBrand } from '@/hooks/useBrand'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const money = (n: number | null | undefined) => '$' + Number(n ?? 0).toLocaleString()
const cadence = (t: string) => (t === 'monthly' ? '/mo' : ' one-time')

export default function CatalogPage() {
  const { activeBrand, activeBrandId } = useBrand()
  const { data: services, isLoading } = useCatalog(activeBrandId)
  const createPackage = useCreatePackage()
  const deleteService = useDeleteService()
  const deletePackage = useDeletePackage()
  const deleteServiceAddon = useDeleteServiceAddon()

  const [serviceDialog, setServiceDialog] = useState<{ open: boolean; service: Service | null }>({ open: false, service: null })
  const [packageSheet, setPackageSheet] = useState<{ open: boolean; pkg: CatalogPackage | null }>({ open: false, pkg: null })
  const [addonDialog, setAddonDialog] = useState<{ open: boolean; serviceId: string; addon: ServiceAddon | null }>({ open: false, serviceId: '', addon: null })
  const [confirm, setConfirm] = useState<{ kind: 'service' | 'package'; id: string; label: string } | null>(null)

  async function addPackage(serviceId: string) {
    const pkg = await createPackage.mutateAsync(serviceId)
    setPackageSheet({ open: true, pkg: { ...pkg, package_line_items: [], package_addons: [] } })
  }

  function runDelete() {
    if (!confirm) return
    const opts = { onSuccess: () => toast.success(`${confirm.kind === 'service' ? 'Service' : 'Package'} deleted`) }
    if (confirm.kind === 'service') deleteService.mutate(confirm.id, opts)
    else deletePackage.mutate(confirm.id, opts)
    setConfirm(null)
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Package catalog</h2>
          <p className="text-sm text-muted-foreground">
            {activeBrand ? <><span className="font-medium text-foreground">{activeBrand.name}</span> — services, packages, and add-ons used in its proposals.</> : 'Services, tiered packages, and add-ons.'}
          </p>
        </div>
        <Button onClick={() => setServiceDialog({ open: true, service: null })}>
          <Plus className="mr-2 h-4 w-4" /> Add service
        </Button>
      </div>

      <div className="space-y-6">
        {(services ?? []).map((service) => (
          <ServiceSection
            key={service.id}
            service={service}
            onEditService={() => setServiceDialog({ open: true, service })}
            onDeleteService={() => setConfirm({ kind: 'service', id: service.id, label: service.name })}
            onAddPackage={() => void addPackage(service.id)}
            onEditPackage={(pkg) => setPackageSheet({ open: true, pkg })}
            onDeletePackage={(pkg) => setConfirm({ kind: 'package', id: pkg.id, label: pkg.name })}
            onAddAddon={() => setAddonDialog({ open: true, serviceId: service.id, addon: null })}
            onEditAddon={(addon) => setAddonDialog({ open: true, serviceId: service.id, addon })}
            onDeleteAddon={(id) => deleteServiceAddon.mutate(id, { onSuccess: () => toast.success('Add-on deleted') })}
          />
        ))}
        {(services ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No services yet. Add one to start building your catalog.</p>
        )}
      </div>

      <ServiceDialog service={serviceDialog.service} open={serviceDialog.open} onOpenChange={(o) => setServiceDialog((s) => ({ ...s, open: o }))} />
      <PackageSheet pkg={packageSheet.pkg} open={packageSheet.open} onOpenChange={(o) => setPackageSheet((s) => ({ ...s, open: o }))} />
      <ServiceAddonDialog serviceId={addonDialog.serviceId} addon={addonDialog.addon} open={addonDialog.open} onOpenChange={(o) => setAddonDialog((s) => ({ ...s, open: o }))} />

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{confirm?.label}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'service'
                ? 'This deletes the service and all its packages and add-ons.'
                : 'This deletes the package, its deliverables, and add-ons.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ServiceSection({
  service, onEditService, onDeleteService, onAddPackage, onEditPackage, onDeletePackage,
  onAddAddon, onEditAddon, onDeleteAddon,
}: {
  service: CatalogService
  onEditService: () => void
  onDeleteService: () => void
  onAddPackage: () => void
  onEditPackage: (pkg: CatalogPackage) => void
  onDeletePackage: (pkg: CatalogPackage) => void
  onAddAddon: () => void
  onEditAddon: (addon: ServiceAddon) => void
  onDeleteAddon: (id: string) => void
}) {
  return (
    <div className="rounded-lg border bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 text-base font-semibold">
          <span>{service.emoji}</span> {service.name}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onAddPackage}><Plus className="mr-1 h-4 w-4" /> Package</Button>
          <Button variant="ghost" size="icon" onClick={onEditService}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onDeleteService}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-3">
        {service.packages.map((pkg) => (
          <div key={pkg.id} className={cn('rounded-md border p-3', !pkg.is_active && 'opacity-50')}>
            <div className="flex items-start justify-between">
              <div>
                {pkg.tier && <div className="text-xs uppercase tracking-wide text-muted-foreground">{pkg.tier}</div>}
                <div className="flex items-center gap-1 font-medium">
                  {pkg.name}
                  {pkg.featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                </div>
              </div>
              <div className="flex">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditPackage(pkg)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeletePackage(pkg)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {money(pkg.base_price)}<span className="text-xs font-normal text-muted-foreground">{cadence(pkg.price_type)}</span>
            </div>
            <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {pkg.package_line_items.slice(0, 4).map((li) => <li key={li.id}>• {li.description}</li>)}
              {pkg.package_line_items.length > 4 && <li>+{pkg.package_line_items.length - 4} more</li>}
            </ul>
            {pkg.package_addons.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">{pkg.package_addons.length} add-on(s)</div>
            )}
          </div>
        ))}
        {service.packages.length === 0 && <p className="text-sm text-muted-foreground">No packages yet.</p>}
      </div>

      <div className="border-t px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Shared add-ons</span>
          <Button variant="ghost" size="sm" onClick={onAddAddon}><Plus className="mr-1 h-4 w-4" /> Add-on</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {service.service_addons.length === 0 && <span className="text-sm text-muted-foreground">None</span>}
          {service.service_addons.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
              {a.name} · {money(a.price)}{cadence(a.price_type)}
              <button onClick={() => onEditAddon(a)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
              <button onClick={() => onDeleteAddon(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
