import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Brand } from '@/types/database.types'

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async (): Promise<Brand[]> => {
      const { data, error } = await supabase.from('brands').select('*').order('sort_order', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useUpdateBrand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Brand> }) => {
      const { error } = await supabase.from('brands').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brands'] }),
  })
}
