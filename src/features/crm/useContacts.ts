import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Company, Contact, User } from '@/types/database.types'

export const PAGE_SIZE = 25

export interface ContactFilters {
  search: string
  statuses: string[]
  sources: string[]
  assignedTo: string | null
  page: number
}

/** A contact row joined to its company and assignee for the list table. */
export type ContactRow = Contact & {
  company: Pick<Company, 'id' | 'name'> | null
  assignee: Pick<User, 'id' | 'full_name'> | null
}

interface ContactsResult {
  rows: ContactRow[]
  total: number
}

export function useContacts(filters: ContactFilters) {
  return useQuery({
    queryKey: ['contacts', filters],
    queryFn: async (): Promise<ContactsResult> => {
      const from = (filters.page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let query = supabase
        .from('contacts')
        .select(
          '*, company:companies(id, name), assignee:users(id, full_name)',
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(from, to)

      const q = filters.search.trim()
      if (q) {
        // Search contact fields. (Company-name search is a future enhancement —
        // it needs a join filter that would otherwise exclude company-less contacts.)
        query = query.or(
          `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`,
        )
      }
      if (filters.statuses.length) query = query.in('status', filters.statuses)
      if (filters.sources.length) query = query.in('source', filters.sources)
      if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo)

      const { data, error, count } = await query
      if (error) throw error
      return { rows: (data ?? []) as unknown as ContactRow[], total: count ?? 0 }
    },
    placeholderData: (prev) => prev, // keep previous page visible while fetching the next
  })
}

/** Active users — for the "Assigned to" filter and the create form. */
export function useActiveUsers() {
  return useQuery({
    queryKey: ['users', 'active'],
    queryFn: async (): Promise<Pick<User, 'id' | 'full_name' | 'email'>[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

/** Distinct non-null sources seen on existing contacts — populates the Source filter. */
export function useContactSources() {
  return useQuery({
    queryKey: ['contacts', 'sources'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('contacts')
        .select('source')
        .not('source', 'is', null)
        .limit(1000)
      if (error) throw error
      const set = new Set<string>()
      for (const row of data ?? []) if (row.source) set.add(row.source)
      return [...set].sort()
    },
  })
}

/** Type-ahead company search for the create form's company combobox. */
export function useCompanySearch(query: string) {
  return useQuery({
    queryKey: ['companies', 'search', query],
    queryFn: async (): Promise<Pick<Company, 'id' | 'name'>[]> => {
      let q = supabase.from('companies').select('id, name').order('name').limit(10)
      if (query.trim()) q = q.ilike('name', `%${query.trim()}%`)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}

export interface NewContactInput {
  first_name: string
  last_name: string
  email: string
  phone?: string
  companyId?: string | null
  newCompanyName?: string | null
  source?: string | null
  assigned_to?: string | null
  notes?: string
}

/** Delete a contact. Cascades activities/tags/sequence enrollments; deals/proposals/
 *  invoices/audits keep the record but null the contact reference. */
export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewContactInput): Promise<Contact> => {
      // Resolve company: use selected id, or create a new company from the typed name.
      let companyId = input.companyId ?? null
      if (!companyId && input.newCompanyName?.trim()) {
        const { data: company, error: companyErr } = await supabase
          .from('companies')
          .insert({ name: input.newCompanyName.trim() })
          .select('id')
          .single()
        if (companyErr) throw companyErr
        companyId = company.id
      }

      const { data: contact, error } = await supabase
        .from('contacts')
        .insert({
          first_name: input.first_name.trim(),
          last_name: input.last_name.trim(),
          email: input.email.trim(),
          phone: input.phone?.trim() || null,
          company_id: companyId,
          source: input.source?.trim() || null,
          assigned_to: input.assigned_to || null,
          status: 'lead',
        })
        .select('*')
        .single()
      if (error) throw error

      // Log the creation as an activity (and capture any opening note).
      await supabase.from('activities').insert({
        contact_id: contact.id,
        type: 'contact_created',
        body: input.notes?.trim() || 'Contact created manually',
      })

      return contact
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
