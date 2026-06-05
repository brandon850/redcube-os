import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ContentDraft } from '@/types/database.types'

export const CONTENT_STATUSES = ['draft', 'review', 'published'] as const

export function useContentDrafts(siteId: string) {
  return useQuery({
    queryKey: ['content', siteId],
    queryFn: async (): Promise<ContentDraft[]> => {
      const { data, error } = await supabase
        .from('content_drafts')
        .select('*')
        .eq('site_id', siteId)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateDraft(siteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<ContentDraft> => {
      const { data, error } = await supabase
        .from('content_drafts')
        .insert({ site_id: siteId, title: 'Untitled draft', status: 'draft' })
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content', siteId] }),
  })
}

export function useSaveDraft(siteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ContentDraft> }) => {
      const { error } = await supabase.from('content_drafts').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content', siteId] }),
  })
}

export function useDeleteDraft(siteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('content_drafts').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content', siteId] }),
  })
}
