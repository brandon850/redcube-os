import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Contact, Deal, Proposal, ProposalPackage } from '@/types/database.types'

export type ProposalRow = Proposal & {
  contact: Pick<Contact, 'id' | 'first_name' | 'last_name'> | null
}

export type ProposalDetail = Proposal & {
  contact: Pick<Contact, 'id' | 'first_name' | 'last_name' | 'email'> | null
  deal: Pick<Deal, 'id' | 'title'> | null
  proposal_packages: ProposalPackage[]
}

export function useProposals(brandId?: string | null) {
  return useQuery({
    queryKey: ['proposals', brandId],
    queryFn: async (): Promise<ProposalRow[]> => {
      let query = supabase
        .from('proposals')
        .select('*, contact:contacts(id, first_name, last_name)')
        .order('id', { ascending: false })
      if (brandId) query = query.eq('brand_id', brandId)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as ProposalRow[]
    },
  })
}

export function useProposal(id: string) {
  return useQuery({
    queryKey: ['proposal', id],
    queryFn: async (): Promise<ProposalDetail> => {
      const { data, error } = await supabase
        .from('proposals')
        // deals<->proposals has two FKs (circular); disambiguate via the proposals.deal_id constraint.
        .select('*, contact:contacts(id, first_name, last_name, email), deal:deals!proposals_deal_id_fkey(id, title), proposal_packages(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as unknown as ProposalDetail
    },
  })
}

export interface NewProposalInput {
  contactId: string
  dealId: string | null
  brandId: string | null
  introText: string
  paymentTerms: string
  discountPct: number
  validUntil: string | null
}

export function useCreateProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewProposalInput): Promise<Proposal> => {
      const { data: auth } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('proposals')
        .insert({
          contact_id: input.contactId,
          deal_id: input.dealId,
          brand_id: input.brandId,
          created_by: auth.user?.id ?? null,
          status: 'draft',
          intro_text: input.introText.trim() || null,
          payment_terms: input.paymentTerms,
          discount_pct: input.discountPct,
          valid_until: input.validUntil,
        })
        .select('*')
        .single()
      if (error) throw error

      // Back-link the deal to this proposal so the pipeline can surface it.
      if (input.dealId) {
        await supabase.from('deals').update({ proposal_id: data.id }).eq('id', input.dealId)
      }
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] })
      qc.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

/** Mark a draft proposal sent and advance the deal to "Proposal sent". */
export function useSendProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (proposal: ProposalDetail) => {
      const { error } = await supabase
        .from('proposals')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', proposal.id)
      if (error) throw error

      if (proposal.deal_id) {
        const { data: stage } = await supabase
          .from('pipeline_stages').select('id').eq('name', 'Proposal sent').maybeSingle()
        if (stage) {
          await supabase.from('deals')
            .update({ stage_id: stage.id, last_activity_at: new Date().toISOString() })
            .eq('id', proposal.deal_id)
        }
      }

      const { data: auth } = await supabase.auth.getUser()
      await supabase.from('activities').insert({
        contact_id: proposal.contact_id,
        user_id: auth.user?.id ?? null,
        type: 'proposal_sent',
        body: 'Proposal sent',
        metadata: { proposal_id: proposal.id },
      })
    },
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: ['proposal', p.id] })
      qc.invalidateQueries({ queryKey: ['proposals'] })
    },
  })
}

/** Fire the onboarding cascade for a deal (invoice + project + status transitions). */
export function useRunOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dealId: string) => {
      const { data, error } = await supabase.rpc('run_onboarding', { p_deal_id: dealId })
      if (error) throw new Error(error.message) // PostgrestError isn't an Error instance
      const r = data as { ok?: boolean; error?: string; amount?: number } | null
      if (!r?.ok) throw new Error(r?.error || 'Onboarding failed')
      return r
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deals'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['proposals'] })
    },
  })
}

/** Delete a proposal (cascades its proposal_packages; contracts are detached). */
export function useDeleteProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('proposals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposals'] }),
  })
}

/** Contact type-ahead for the proposal builder. */
export function useContactSearch(query: string) {
  return useQuery({
    queryKey: ['contacts', 'proposal-search', query],
    queryFn: async () => {
      let q = supabase
        .from('contacts')
        .select('id, first_name, last_name, company_id')
        .order('created_at', { ascending: false })
        .limit(10)
      const term = query.trim()
      if (term) q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map((c) => ({ id: c.id, name: `${c.first_name} ${c.last_name}`, companyId: c.company_id }))
    },
  })
}
