import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Company, Contact, Deal, PipelineStage } from '@/types/database.types'

export type DealRow = Deal & {
  contact: Pick<Contact, 'id' | 'first_name' | 'last_name' | 'source' | 'assigned_to'> | null
  company: Pick<Company, 'id' | 'name'> | null
}

export function usePipelineStages() {
  return useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: async (): Promise<PipelineStage[]> => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('position', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

/** All open deals with contact + company, for the board. Filtering happens client-side. */
export function useOpenDeals() {
  return useQuery({
    queryKey: ['deals', 'open'],
    queryFn: async (): Promise<DealRow[]> => {
      const { data, error } = await supabase
        .from('deals')
        .select(
          '*, contact:contacts(id, first_name, last_name, source, assigned_to), company:companies(id, name)',
        )
        .eq('status', 'open')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as DealRow[]
    },
  })
}

/** Won/lost deals with contact + company (win-rate metric, won/lost strip, and the closed list). */
export function useClosedDeals() {
  return useQuery({
    queryKey: ['deals', 'closed'],
    queryFn: async (): Promise<DealRow[]> => {
      const { data, error } = await supabase
        .from('deals')
        .select(
          '*, contact:contacts(id, first_name, last_name, source, assigned_to), company:companies(id, name)',
        )
        .in('status', ['won', 'lost'])
        .order('last_activity_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as DealRow[]
    },
  })
}

interface MoveDealArgs {
  dealId: string
  toStageId: string
  contactId: string | null
  fromStageName: string
  toStageName: string
  defaultProbability: number | null
}

/** Move a deal to another stage: optimistic, then PATCH + log a stage_change activity. */
export function useMoveDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: MoveDealArgs) => {
      const patch: { stage_id: string; last_activity_at: string; probability?: number } = {
        stage_id: args.toStageId,
        last_activity_at: new Date().toISOString(),
      }
      if (args.defaultProbability != null) patch.probability = args.defaultProbability

      const { error } = await supabase.from('deals').update(patch).eq('id', args.dealId)
      if (error) throw error

      const { data: auth } = await supabase.auth.getUser()
      await supabase.from('activities').insert({
        contact_id: args.contactId,
        user_id: auth.user?.id ?? null,
        type: 'stage_change',
        body: `Moved from ${args.fromStageName} to ${args.toStageName}`,
        metadata: { from: args.fromStageName, to: args.toStageName, trigger: 'manual' },
      })
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: ['deals', 'open'] })
      const prev = qc.getQueryData<DealRow[]>(['deals', 'open'])
      qc.setQueryData<DealRow[]>(['deals', 'open'], (old) =>
        (old ?? []).map((d) =>
          d.id === args.dealId
            ? { ...d, stage_id: args.toStageId, probability: args.defaultProbability ?? d.probability }
            : d,
        ),
      )
      return { prev }
    },
    onError: (_err, _args, ctx) => {
      if (ctx?.prev) qc.setQueryData(['deals', 'open'], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['deals', 'open'] })
    },
  })
}

export function useUpdateDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ dealId, patch }: { dealId: string; patch: Partial<Deal> }) => {
      const { error } = await supabase.from('deals').update(patch).eq('id', dealId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

/** Mark a deal won or lost (removes it from the open board). */
export function useCloseDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ deal, status }: { deal: DealRow; status: 'won' | 'lost' }) => {
      const { error } = await supabase
        .from('deals')
        .update({ status, last_activity_at: new Date().toISOString() })
        .eq('id', deal.id)
      if (error) throw error

      const { data: auth } = await supabase.auth.getUser()
      await supabase.from('activities').insert({
        contact_id: deal.contact_id,
        user_id: auth.user?.id ?? null,
        type: status === 'won' ? 'deal_won' : 'deal_lost',
        body: `Deal "${deal.title}" marked ${status}`,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

/** Delete a deal. Proposals/invoices/audits/sites keep their records but detach (FK SET NULL). */
export function useDeleteDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase.from('deals').delete().eq('id', dealId)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deals'] }),
  })
}

export interface NewDealInput {
  contactId: string
  companyId: string | null
  title: string
  value: number
  stageId: string
  probability: number | null
}

export function useCreateDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewDealInput): Promise<Deal> => {
      const { data: deal, error } = await supabase
        .from('deals')
        .insert({
          contact_id: input.contactId,
          company_id: input.companyId,
          title: input.title.trim(),
          value: input.value,
          stage_id: input.stageId,
          probability: input.probability,
          status: 'open',
          last_activity_at: new Date().toISOString(),
        })
        .select('*')
        .single()
      if (error) throw error

      const { data: auth } = await supabase.auth.getUser()
      await supabase.from('activities').insert({
        contact_id: input.contactId,
        user_id: auth.user?.id ?? null,
        type: 'deal_created',
        body: `Deal "${input.title.trim()}" created`,
      })
      return deal
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}
