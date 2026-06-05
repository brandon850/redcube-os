import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CompanySettings, Json, User } from '@/types/database.types'

// ─── Company settings (single row, id = 1) ───────────────────────────────────────
export function useCompanySettings() {
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: async (): Promise<CompanySettings | null> => {
      const { data, error } = await supabase.from('company_settings').select('*').eq('id', 1).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useSaveCompanySettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<CompanySettings>) => {
      const { error } = await supabase
        .from('company_settings')
        .upsert({ ...patch, id: 1, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company-settings'] }),
  })
}

// ─── Team / users ────────────────────────────────────────────────────────────────
export function useUsers() {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: async (): Promise<User[]> => {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<User> }) => {
      const { error } = await supabase.from('users').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

// ─── Own profile ───────────────────────────────────────────────────────────────
export function useUpdateProfile(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: { full_name?: string; calendar_url?: string | null; notification_prefs?: Json }) => {
      const { error } = await supabase.from('users').update(patch).eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
