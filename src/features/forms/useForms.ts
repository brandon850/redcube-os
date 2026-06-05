import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Form } from '@/types/database.types'
import { DEFAULT_SETTINGS, defaultFields, type FormField, type FormSettings } from './types'

export type FormRow = Form & { submissions: { count: number }[] }

/** URL-safe random token for embeds (no nanoid dependency). */
function makeToken(len = 21): string {
  const alphabet = 'useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict'
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}

export function useForms(brandId?: string | null) {
  return useQuery({
    queryKey: ['forms', brandId],
    queryFn: async (): Promise<FormRow[]> => {
      let query = supabase
        .from('forms')
        .select('*, submissions:form_submissions(count)')
        .order('created_at', { ascending: false })
      if (brandId) query = query.eq('brand_id', brandId)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as FormRow[]
    },
  })
}

export function useForm(id: string) {
  return useQuery({
    queryKey: ['form', id],
    queryFn: async (): Promise<Form> => {
      const { data, error } = await supabase.from('forms').select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
  })
}

export function useCreateForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, brandId }: { name: string; brandId: string | null }): Promise<Form> => {
      const { data, error } = await supabase
        .from('forms')
        .insert({
          name: name.trim() || 'Untitled form',
          brand_id: brandId,
          embed_token: makeToken(),
          fields: defaultFields() as unknown as FormField[] as never,
          settings: DEFAULT_SETTINGS as unknown as never,
          is_active: true,
        })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  })
}

export interface FormPatch {
  name?: string
  fields?: FormField[]
  settings?: FormSettings
  is_active?: boolean
}

export function useUpdateForm(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: FormPatch) => {
      const { error } = await supabase
        .from('forms')
        .update(patch as never)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['form', id] })
      qc.invalidateQueries({ queryKey: ['forms'] })
    },
  })
}

export function useToggleForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('forms').update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  })
}

export function useDeleteForm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('forms').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  })
}
