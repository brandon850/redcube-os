import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface AnalyticsData {
  deals: { id: string; value: number | null; probability: number | null; status: string; stage_id: string | null; created_at: string; last_activity_at: string | null }[]
  stages: { id: string; name: string; position: number; color: string | null }[]
  contacts: { id: string; source: string | null; status: string | null; created_at: string }[]
  invoices: { amount_due: number | null; amount_paid: number | null; status: string | null; paid_at: string | null; created_at: string }[]
}

/** Org-wide analytics source rows. CRM/pipeline are shared; invoices span all brands. */
export function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async (): Promise<AnalyticsData> => {
      const [deals, stages, contacts, invoices] = await Promise.all([
        supabase.from('deals').select('id, value, probability, status, stage_id, created_at, last_activity_at'),
        supabase.from('pipeline_stages').select('id, name, position, color').order('position'),
        supabase.from('contacts').select('id, source, status, created_at'),
        supabase.from('invoices').select('amount_due, amount_paid, status, paid_at, created_at'),
      ])
      if (deals.error) throw deals.error
      if (stages.error) throw stages.error
      if (contacts.error) throw contacts.error
      if (invoices.error) throw invoices.error
      return {
        deals: deals.data ?? [],
        stages: stages.data ?? [],
        contacts: contacts.data ?? [],
        invoices: invoices.data ?? [],
      }
    },
  })
}
