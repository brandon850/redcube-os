import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  PackageAddon, PackageLineItem, Service, ServiceAddon,
} from '@/types/database.types'
import type { Package } from '@/types/database.types'

export type CatalogPackage = Package & {
  package_line_items: PackageLineItem[]
  package_addons: PackageAddon[]
}
export type CatalogService = Service & {
  packages: CatalogPackage[]
  service_addons: ServiceAddon[]
}

const bySort = <T extends { sort_order?: number | null }>(a: T, b: T) =>
  (a.sort_order ?? 99) - (b.sort_order ?? 99)

export function useCatalog(brandId?: string | null) {
  return useQuery({
    queryKey: ['catalog', brandId],
    queryFn: async (): Promise<CatalogService[]> => {
      let query = supabase
        .from('services')
        .select('*, packages(*, package_line_items(*), package_addons(*)), service_addons(*)')
        .order('sort_order', { ascending: true })
      if (brandId) query = query.eq('brand_id', brandId)
      const { data, error } = await query
      if (error) throw error
      const services = (data ?? []) as unknown as CatalogService[]
      // Sort nested collections client-side.
      for (const s of services) {
        s.packages.sort(bySort)
        s.service_addons.sort(bySort)
        for (const p of s.packages) {
          p.package_line_items.sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
          p.package_addons.sort(bySort)
        }
      }
      return services
    },
  })
}

function useInvalidateCatalog() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['catalog'] })
}

// ─── Services ────────────────────────────────────────────────────────────────────
export function useUpsertService() {
  const inv = useInvalidateCatalog()
  return useMutation({
    mutationFn: async (s: Partial<Service> & { name: string }): Promise<Service> => {
      const { data, error } = await supabase.from('services').upsert(s).select('*').single()
      if (error) throw error
      return data
    },
    onSuccess: inv,
  })
}
export function useDeleteService() {
  const inv = useInvalidateCatalog()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: inv,
  })
}

// ─── Packages ──────────────────────────────────────────────────────────────────
export function useCreatePackage() {
  const inv = useInvalidateCatalog()
  return useMutation({
    mutationFn: async (serviceId: string): Promise<Package> => {
      const { data, error } = await supabase
        .from('packages')
        .insert({ service_id: serviceId, name: 'New package', price_type: 'monthly', base_price: 0 })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: inv,
  })
}

export interface PackageSave {
  id: string
  fields: Partial<Package>
  lineItems: string[]
  addons: { name: string; price: number; price_type: string }[]
}

/** Save package fields + replace its line items and column add-ons. */
export function useSavePackage() {
  const inv = useInvalidateCatalog()
  return useMutation({
    mutationFn: async ({ id, fields, lineItems, addons }: PackageSave) => {
      const { error: upErr } = await supabase.from('packages').update(fields).eq('id', id)
      if (upErr) throw upErr

      await supabase.from('package_line_items').delete().eq('package_id', id)
      if (lineItems.length) {
        const { error } = await supabase.from('package_line_items').insert(
          lineItems.map((description, i) => ({ package_id: id, description, sort_order: i })),
        )
        if (error) throw error
      }

      await supabase.from('package_addons').delete().eq('package_id', id)
      if (addons.length) {
        const { error } = await supabase.from('package_addons').insert(
          addons.map((a, i) => ({ package_id: id, name: a.name, price: a.price, price_type: a.price_type, sort_order: i })),
        )
        if (error) throw error
      }
    },
    onSuccess: inv,
  })
}

export function useDeletePackage() {
  const inv = useInvalidateCatalog()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('packages').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: inv,
  })
}

// ─── Service (shared) add-ons ────────────────────────────────────────────────────
export function useUpsertServiceAddon() {
  const inv = useInvalidateCatalog()
  return useMutation({
    mutationFn: async (a: Partial<ServiceAddon> & { service_id: string; name: string }) => {
      const { error } = await supabase.from('service_addons').upsert(a)
      if (error) throw error
    },
    onSuccess: inv,
  })
}
export function useDeleteServiceAddon() {
  const inv = useInvalidateCatalog()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('service_addons').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: inv,
  })
}
