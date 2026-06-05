import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Company, ManagedSite, SiteAudit } from '@/types/database.types'
import type { AuditResult } from '@/lib/seo/types'

export type SiteRow = ManagedSite & { company: Pick<Company, 'id' | 'name'> | null }

export function useSites(brandId?: string | null) {
  return useQuery({
    queryKey: ['sites', brandId],
    queryFn: async (): Promise<SiteRow[]> => {
      let query = supabase
        .from('managed_sites')
        .select('*, company:companies(id, name)')
        .order('created_at', { ascending: false })
      if (brandId) query = query.eq('brand_id', brandId)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as SiteRow[]
    },
  })
}

export function useSite(id: string) {
  return useQuery({
    queryKey: ['site', id],
    queryFn: async (): Promise<SiteRow> => {
      const { data, error } = await supabase
        .from('managed_sites')
        .select('*, company:companies(id, name)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as unknown as SiteRow
    },
  })
}

function domainOf(url: string): string {
  try { return new URL(/^https?:\/\//i.test(url) ? url : 'https://' + url).hostname.replace('www.', '') } catch { return url }
}

export function useCreateSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; url: string; companyId: string | null; brandId: string | null }): Promise<ManagedSite> => {
      let url = input.url.trim()
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url
      const { data, error } = await supabase
        .from('managed_sites')
        .insert({ name: input.name.trim(), url, domain: domainOf(url), company_id: input.companyId, brand_id: input.brandId })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  })
}

export function useDeleteSite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('managed_sites').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  })
}

export function useSiteAudits(siteId: string) {
  return useQuery({
    queryKey: ['site-audits', siteId],
    queryFn: async (): Promise<SiteAudit[]> => {
      const { data, error } = await supabase
        .from('site_audits')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

/** Run a fresh audit on a managed site (reuses the /api/audit engine) and store it. */
export function useRunSiteAudit(siteId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const result = (await res.json()) as AuditResult & { error?: string }
      if (!res.ok || result.error) throw new Error(result.error || 'Audit failed')

      const { error } = await supabase.from('site_audits').insert({
        site_id: siteId,
        overall_score: result.overallScore,
        grade: result.grade,
        report_data: result as never,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site-audits', siteId] }),
  })
}
