import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ClickupTemplate } from '@/types/database.types'

export interface TemplateTask {
  name: string
  role: string // account_manager | tech_lead | client
  due_day_offset: number
  priority: number // 1 urgent, 2 high, 3 normal
  description?: string
}
export interface TemplatePhase {
  name: string
  tasks: TemplateTask[]
}

export const TASK_ROLES = [
  { value: 'account_manager', label: 'Account manager' },
  { value: 'tech_lead', label: 'Tech lead' },
  { value: 'client', label: 'Client' },
]
export const TASK_PRIORITIES = [
  { value: 1, label: 'Urgent' },
  { value: 2, label: 'High' },
  { value: 3, label: 'Normal' },
]

export function useActiveTemplate() {
  return useQuery({
    queryKey: ['clickup-template'],
    queryFn: async (): Promise<ClickupTemplate | null> => {
      const { data, error } = await supabase
        .from('clickup_templates')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useSaveTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, phases, version }: { id: string; phases: TemplatePhase[]; version: number }) => {
      const { error } = await supabase
        .from('clickup_templates')
        .update({ phases: phases as never, version: version + 1 })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clickup-template'] }),
  })
}
