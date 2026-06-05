import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SiteKeyword } from '@/types/database.types'

export function useKeywords(siteId: string) {
  return useQuery({
    queryKey: ['keywords', siteId],
    queryFn: async (): Promise<SiteKeyword[]> => {
      const { data, error } = await supabase
        .from('site_keywords')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAddKeyword(siteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { keyword: string; position: number | null; search_volume: number | null }) => {
      const { error } = await supabase.from('site_keywords').insert({
        site_id: siteId,
        keyword: input.keyword.trim(),
        position: input.position,
        search_volume: input.search_volume,
        tracked_at: input.position != null ? new Date().toISOString() : null,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['keywords', siteId] }),
  })
}

export function useUpdateKeyword(siteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SiteKeyword> }) => {
      const { error } = await supabase
        .from('site_keywords')
        .update({ ...patch, tracked_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['keywords', siteId] }),
  })
}

export function useDeleteKeyword(siteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('site_keywords').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['keywords', siteId] }),
  })
}
