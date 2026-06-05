import type { CatalogService } from '@/features/catalog/useCatalog'

export const formatMoney = (n: number) => '$' + Math.round(n || 0).toLocaleString('en-US')

export interface SelectionState {
  // one selected package per service: { [serviceId]: packageId }
  selectedPackages: Record<string, string | undefined>
  checkedColumnAddons: Set<string> // package_addons ids
  checkedSharedAddons: Set<string> // service_addons ids
}

export interface Totals {
  monthly: number
  oneTime: number
}

function addByType(t: Totals, price: number, priceType: string) {
  if (priceType === 'monthly') t.monthly += price
  else t.oneTime += price
}

/** Live totals across the whole selection (pre-discount). */
export function calcTotals(services: CatalogService[], sel: SelectionState): Totals {
  const t: Totals = { monthly: 0, oneTime: 0 }
  for (const svc of services) {
    const pkgId = sel.selectedPackages[svc.id]
    if (!pkgId) continue
    const pkg = svc.packages.find((p) => p.id === pkgId)
    if (!pkg) continue
    addByType(t, Number(pkg.base_price ?? 0), pkg.price_type)
    for (const a of pkg.package_addons) {
      if (sel.checkedColumnAddons.has(a.id)) addByType(t, Number(a.price), a.price_type)
    }
    for (const a of svc.service_addons) {
      if (sel.checkedSharedAddons.has(a.id)) addByType(t, Number(a.price), a.price_type)
    }
  }
  return t
}

/** Discount applies to recurring (monthly) only — matches the original configurator. */
export function applyDiscount(t: Totals, discountPct: number): Totals {
  const d = Math.max(0, Math.min(100, discountPct || 0))
  return { monthly: t.monthly * (1 - d / 100), oneTime: t.oneTime }
}

export interface SelectionSnapshotAddon {
  name: string
  price: number
  price_type: string
  kind: 'column' | 'shared'
}
export interface SelectionSnapshot {
  package_id: string
  name_snapshot: string
  description_snapshot: string | null
  price_type_snapshot: string
  price_override: number | null
  addons_snapshot: SelectionSnapshotAddon[]
}

/** Build the persisted snapshot sent to accept_proposal(). */
export function buildSnapshot(services: CatalogService[], sel: SelectionState): SelectionSnapshot[] {
  const out: SelectionSnapshot[] = []
  for (const svc of services) {
    const pkgId = sel.selectedPackages[svc.id]
    if (!pkgId) continue
    const pkg = svc.packages.find((p) => p.id === pkgId)
    if (!pkg) continue
    const addons: SelectionSnapshotAddon[] = []
    for (const a of pkg.package_addons) {
      if (sel.checkedColumnAddons.has(a.id)) addons.push({ name: a.name, price: Number(a.price), price_type: a.price_type, kind: 'column' })
    }
    for (const a of svc.service_addons) {
      if (sel.checkedSharedAddons.has(a.id)) addons.push({ name: a.name, price: Number(a.price), price_type: a.price_type, kind: 'shared' })
    }
    out.push({
      package_id: pkg.id,
      name_snapshot: `${svc.name} — ${pkg.name}`,
      description_snapshot: pkg.tagline ?? null,
      price_type_snapshot: pkg.price_type,
      // Snapshot the actual selected price so the record is self-contained.
      price_override: Number(pkg.base_price ?? 0),
      addons_snapshot: addons,
    })
  }
  return out
}
