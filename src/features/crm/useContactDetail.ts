import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Activity, Company, Contact, Deal, Json, Tag, User } from '@/types/database.types'

export type ContactDetail = Contact & {
  company: Pick<Company, 'id' | 'name' | 'domain' | 'industry'> | null
  assignee: Pick<User, 'id' | 'full_name'> | null
}

export type ActivityRow = Activity & {
  actor: Pick<User, 'id' | 'full_name'> | null
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: async (): Promise<ContactDetail> => {
      const { data, error } = await supabase
        .from('contacts')
        .select(
          '*, company:companies(id, name, domain, industry), assignee:users(id, full_name)',
        )
        .eq('id', id)
        .single()
      if (error) throw error
      return data as unknown as ContactDetail
    },
  })
}

/** Activities for a contact, newest first, joined to the actor. Subscribes to realtime inserts. */
export function useActivities(contactId: string) {
  const qc = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`activities:${contactId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activities', filter: `contact_id=eq.${contactId}` },
        () => qc.invalidateQueries({ queryKey: ['activities', contactId] }),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [contactId, qc])

  return useQuery({
    queryKey: ['activities', contactId],
    queryFn: async (): Promise<ActivityRow[]> => {
      const { data, error } = await supabase
        .from('activities')
        .select('*, actor:users(id, full_name)')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as ActivityRow[]
    },
  })
}

/** The contact's active (open) deal, if any. */
export function useActiveDeal(contactId: string) {
  return useQuery({
    queryKey: ['active-deal', contactId],
    queryFn: async (): Promise<(Deal & { stage: { name: string; color: string | null } | null }) | null> => {
      const { data, error } = await supabase
        .from('deals')
        .select('*, stage:pipeline_stages(name, color)')
        .eq('contact_id', contactId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data ?? null) as unknown as (Deal & { stage: { name: string; color: string | null } | null }) | null
    },
  })
}

export function useContactTags(contactId: string) {
  return useQuery({
    queryKey: ['contact-tags', contactId],
    queryFn: async (): Promise<Tag[]> => {
      const { data, error } = await supabase
        .from('contact_tags')
        .select('tag:tags(*)')
        .eq('contact_id', contactId)
      if (error) throw error
      return (data ?? []).map((r) => (r as unknown as { tag: Tag }).tag).filter(Boolean)
    },
  })
}

export function useAddTag(contactId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const clean = name.trim()
      if (!clean) return
      // Find or create the tag by name.
      const { data: existing } = await supabase.from('tags').select('id').eq('name', clean).maybeSingle()
      let tagId = existing?.id
      if (!tagId) {
        const { data: created, error } = await supabase
          .from('tags').insert({ name: clean }).select('id').single()
        if (error) throw error
        tagId = created.id
      }
      // Attach (ignore if already attached).
      await supabase.from('contact_tags').upsert({ contact_id: contactId, tag_id: tagId })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-tags', contactId] }),
  })
}

export function useRemoveTag(contactId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tagId: string) => {
      await supabase.from('contact_tags').delete().eq('contact_id', contactId).eq('tag_id', tagId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-tags', contactId] }),
  })
}

/** Log an activity (note, call, etc.) against a contact. */
export function useLogActivity(contactId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { type: string; body: string; metadata?: Json }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('activities').insert({
        contact_id: contactId,
        user_id: auth.user?.id ?? null,
        type: input.type,
        body: input.body,
        metadata: input.metadata ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities', contactId] }),
  })
}

/** Delete a single activity from the timeline. */
export function useDeleteActivity(contactId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase.from('activities').delete().eq('id', activityId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities', contactId] }),
  })
}

export interface ContactEdit {
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  source?: string | null
  assigned_to?: string | null
  status?: string | null
}

export function useUpdateContact(contactId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<ContactEdit> & { _logStatusFrom?: string | null }) => {
      const { _logStatusFrom, ...fields } = patch
      const { error } = await supabase.from('contacts').update(fields).eq('id', contactId)
      if (error) throw error

      // If status changed, record it on the timeline.
      if (fields.status && fields.status !== _logStatusFrom) {
        const { data: auth } = await supabase.auth.getUser()
        await supabase.from('activities').insert({
          contact_id: contactId,
          user_id: auth.user?.id ?? null,
          type: 'status_change',
          body: `Status changed to ${fields.status}`,
          metadata: { from: _logStatusFrom ?? null, to: fields.status },
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact', contactId] })
      qc.invalidateQueries({ queryKey: ['activities', contactId] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
