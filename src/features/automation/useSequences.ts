import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Json, Sequence, SequenceStep } from '@/types/database.types'

export type StepType = 'send_email' | 'wait'
export interface StepConfig { template_id?: string; days?: number }
export interface StepDraft { type: StepType; config: StepConfig }

export type SequenceRow = Sequence & { enrollments: { count: number }[] }
export type SequenceDetail = Sequence & { sequence_steps: SequenceStep[] }

export function useSequences() {
  return useQuery({
    queryKey: ['sequences'],
    queryFn: async (): Promise<SequenceRow[]> => {
      const { data, error } = await supabase
        .from('sequences')
        .select('*, enrollments:contact_sequences(count)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as SequenceRow[]
    },
  })
}

export function useSequence(id: string) {
  return useQuery({
    queryKey: ['sequence', id],
    queryFn: async (): Promise<SequenceDetail> => {
      const { data, error } = await supabase
        .from('sequences')
        .select('*, sequence_steps(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      const seq = data as unknown as SequenceDetail
      seq.sequence_steps.sort((a, b) => a.position - b.position)
      return seq
    },
  })
}

export function useCreateSequence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string): Promise<Sequence> => {
      const { data, error } = await supabase
        .from('sequences')
        .insert({ name: name.trim() || 'New sequence', trigger_type: 'manual', is_active: false })
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sequences'] }),
  })
}

export function useSaveSequence(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ patch, steps }: { patch: Partial<Sequence>; steps: StepDraft[] }) => {
      const { error: upErr } = await supabase.from('sequences').update(patch).eq('id', id)
      if (upErr) throw new Error(upErr.message)
      await supabase.from('sequence_steps').delete().eq('sequence_id', id)
      if (steps.length) {
        const { error } = await supabase.from('sequence_steps').insert(
          steps.map((s, i) => ({ sequence_id: id, position: i, type: s.type, config: s.config as unknown as Json })),
        )
        if (error) throw new Error(error.message)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sequence', id] })
      qc.invalidateQueries({ queryKey: ['sequences'] })
    },
  })
}

export function useDeleteSequence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sequences').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sequences'] }),
  })
}

// ─── Enrollment ──────────────────────────────────────────────────────────────────
export type ContactSequenceRow = {
  id: string
  status: string | null
  enrolled_at: string | null
  exit_reason: string | null
  sequence: { id: string; name: string } | null
  steps: { status: string; execute_at: string | null }[]
}

export function useContactSequences(contactId: string) {
  return useQuery({
    queryKey: ['contact-sequences', contactId],
    queryFn: async (): Promise<ContactSequenceRow[]> => {
      const { data, error } = await supabase
        .from('contact_sequences')
        .select('id, status, enrolled_at, exit_reason, sequence:sequences(id, name), steps:contact_sequence_steps(status, execute_at)')
        .eq('contact_id', contactId)
        .order('enrolled_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as ContactSequenceRow[]
    },
  })
}

/** Enroll a contact into a sequence: create the enrollment + schedule the first step now. */
export function useEnrollContact(contactId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sequenceId: string) => {
      const { data: enrollment, error } = await supabase
        .from('contact_sequences')
        .insert({ contact_id: contactId, sequence_id: sequenceId, status: 'active', enrolled_at: new Date().toISOString() })
        .select('id')
        .single()
      if (error) throw new Error(error.message.includes('duplicate') ? 'Already enrolled in this sequence.' : error.message)

      const { data: firstStep } = await supabase
        .from('sequence_steps').select('id').eq('sequence_id', sequenceId).order('position').limit(1).maybeSingle()
      if (firstStep) {
        await supabase.from('contact_sequence_steps').insert({
          contact_sequence_id: enrollment.id,
          sequence_step_id: firstStep.id,
          status: 'pending',
          execute_at: new Date().toISOString(),
        })
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-sequences', contactId] }),
  })
}

export function useActiveSequences() {
  return useQuery({
    queryKey: ['sequences', 'active'],
    queryFn: async (): Promise<Pick<Sequence, 'id' | 'name'>[]> => {
      const { data, error } = await supabase.from('sequences').select('id, name').eq('is_active', true).order('name')
      if (error) throw error
      return data ?? []
    },
  })
}
