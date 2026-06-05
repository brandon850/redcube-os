import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Audit } from '@/types/database.types'

/** Admin list of captured audit leads (joined to the contact). */
export type AuditLead = Audit & { contact: { id: string; first_name: string; last_name: string } | null }

export function useAudits() {
  return useQuery({
    queryKey: ['audits'],
    queryFn: async (): Promise<AuditLead[]> => {
      const { data, error } = await supabase
        .from('audits')
        .select('*, contact:contacts(id, first_name, last_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as AuditLead[]
    },
  })
}

/** Delete an audit. The linked contact/deal are kept (FK set null). */
export function useDeleteAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('audits').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audits'] }),
  })
}

/** Public single-report fetch (anon-readable by id). */
export function useAuditReport(id: string) {
  return useQuery({
    queryKey: ['audit', id],
    queryFn: async (): Promise<Audit | null> => {
      const { data, error } = await supabase.from('audits').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data
    },
  })
}
