import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ChecklistItem } from '@/types/database.types'

export function useChecklist(siteId: string) {
  return useQuery({
    queryKey: ['checklist', siteId],
    queryFn: async (): Promise<ChecklistItem[]> => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('site_id', siteId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAddChecklistItem(siteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (label: string) => {
      const { error } = await supabase.from('checklist_items').insert({ site_id: siteId, label: label.trim() })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', siteId] }),
  })
}

export function useToggleChecklistItem(siteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase.from('checklist_items').update({ is_completed }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', siteId] }),
  })
}

export function useDeleteChecklistItem(siteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('checklist_items').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', siteId] }),
  })
}
