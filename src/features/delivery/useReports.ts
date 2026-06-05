import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ClientReport } from '@/types/database.types'
import type { AuditResult } from '@/lib/seo/types'

export interface ReportSnapshot {
  generated_at: string
  company_name: string
  site_name: string
  site_domain: string | null
  period_end: string
  audit: AuditResult | null
  checklist: { done: number; total: number }
  keywords: { keyword: string; position: number | null }[]
  content_published: number
}

export function useReports(siteId: string) {
  return useQuery({
    queryKey: ['reports', siteId],
    queryFn: async (): Promise<ClientReport[]> => {
      const { data, error } = await supabase
        .from('client_reports')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

/** Public fetch of a single report by id (anon-readable; self-contained snapshot). */
export function useClientReport(id: string) {
  return useQuery({
    queryKey: ['client-report', id],
    queryFn: async (): Promise<ClientReport | null> => {
      const { data, error } = await supabase.from('client_reports').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** Build a self-contained, client-ready snapshot and store it as a report. */
export function useGenerateReport(siteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (title: string) => {
      const [{ data: site }, { data: company }, { data: audit }, { data: checklist }, { data: keywords }, { count: published }] =
        await Promise.all([
          supabase.from('managed_sites').select('name, domain, brand_id').eq('id', siteId).maybeSingle(),
          supabase.from('company_settings').select('company_name').eq('id', 1).maybeSingle(),
          supabase.from('site_audits').select('report_data').eq('site_id', siteId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('checklist_items').select('is_completed').eq('site_id', siteId),
          supabase.from('site_keywords').select('keyword, position').eq('site_id', siteId).order('position', { ascending: true, nullsFirst: false }),
          supabase.from('content_drafts').select('id', { count: 'exact', head: true }).eq('site_id', siteId).eq('status', 'published'),
        ])

      const done = (checklist ?? []).filter((c) => c.is_completed).length
      const today = new Date().toISOString().slice(0, 10)
      const snapshot: ReportSnapshot = {
        generated_at: new Date().toISOString(),
        company_name: company?.company_name ?? 'RedCube Creative',
        site_name: site?.name ?? '',
        site_domain: site?.domain ?? null,
        period_end: today,
        audit: (audit?.report_data as unknown as AuditResult) ?? null,
        checklist: { done, total: (checklist ?? []).length },
        keywords: (keywords ?? []).map((k) => ({ keyword: k.keyword, position: k.position })),
        content_published: published ?? 0,
      }

      const { data, error } = await supabase
        .from('client_reports')
        .insert({ site_id: siteId, brand_id: site?.brand_id ?? null, title: title.trim() || `SEO Report — ${today}`, period_end: today, report_data: snapshot as never })
        .select('id')
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', siteId] }),
  })
}

export function useDeleteReport(siteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_reports').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', siteId] }),
  })
}
