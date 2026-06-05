import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Contact, Invoice } from '@/types/database.types'

export type InvoiceRow = Invoice & {
  contact: Pick<Contact, 'id' | 'first_name' | 'last_name'> | null
}

export function useInvoices(brandId?: string | null) {
  return useQuery({
    queryKey: ['invoices', brandId],
    queryFn: async (): Promise<InvoiceRow[]> => {
      let query = supabase
        .from('invoices')
        .select('*, contact:contacts(id, first_name, last_name)')
        .order('created_at', { ascending: false })
      if (brandId) query = query.eq('brand_id', brandId)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as InvoiceRow[]
    },
  })
}
