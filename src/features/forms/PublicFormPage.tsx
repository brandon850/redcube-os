import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Brand, Form } from '@/types/database.types'
import { brandThemeStyle } from '@/lib/color'
import { HONEYPOT_KEY, type FormField, type FormSettings } from './types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Wordmark, BrandLockup } from '@/components/Brand'

function usePublicForm(token: string) {
  return useQuery({
    queryKey: ['public-form', token],
    queryFn: async (): Promise<Form | null> => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('embed_token', token)
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

function usePublicBrand(brandId: string | null | undefined) {
  return useQuery({
    queryKey: ['public-brand', brandId],
    enabled: !!brandId,
    queryFn: async (): Promise<Brand | null> => {
      const { data, error } = await supabase.from('brands').select('*').eq('id', brandId!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

function collectUtm() {
  const params = new URLSearchParams(window.location.search)
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
  }
}

export default function PublicFormPage() {
  const { token = '' } = useParams()
  const { data: form, isLoading, isError } = usePublicForm(token)
  const { data: brand } = usePublicBrand(form?.brand_id)

  const fields = useMemo(() => (form?.fields as unknown as FormField[]) ?? [], [form])
  const settings = useMemo(
    () => (form?.settings as unknown as FormSettings) ?? null,
    [form],
  )

  const [values, setValues] = useState<Record<string, string>>({})
  const [hp, setHp] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (isLoading) {
    return <Centered><p className="text-sm text-muted-foreground">Loading…</p></Centered>
  }
  if (isError || !form) {
    return <Centered><p className="text-sm text-muted-foreground">This form is unavailable.</p></Centered>
  }

  function setValue(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    for (const f of fields) {
      if (f.required && !String(values[f.key] ?? '').trim()) {
        setError(`${f.label} is required`)
        return
      }
    }

    setSubmitting(true)
    const { data, error: rpcErr } = await supabase.rpc('submit_form', {
      p_token: token,
      p_data: { ...values, [HONEYPOT_KEY]: hp },
      p_utm: collectUtm(),
      p_page_url: window.location.href,
      p_referrer: document.referrer || null,
    })
    setSubmitting(false)

    const result = data as { ok?: boolean; message?: string; error?: string } | null
    if (rpcErr || !result?.ok) {
      setError(result?.error || rpcErr?.message || 'Something went wrong. Please try again.')
      return
    }

    if (settings?.after === 'redirect' && settings.redirect_url) {
      window.location.href = settings.redirect_url
      return
    }
    setDone(result.message || settings?.success_message || 'Thanks!')
  }

  if (done) {
    return <Centered><div className="text-center"><h2 className="text-lg font-semibold">Thank you</h2><p className="mt-2 text-sm text-muted-foreground">{done}</p></div></Centered>
  }

  return (
    <Centered>
      <form onSubmit={handleSubmit} className="w-full space-y-4" style={brandThemeStyle(brand?.brand_color)}>
        {brand ? (
          <BrandLockup brand={{ name: brand.name, color: brand.brand_color, logo_url: brand.logo_url }} />
        ) : (
          <Wordmark sub="Creative" />
        )}
        <h1 className="text-xl font-semibold">{form.name}</h1>

        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.id} className={f.width === 'half' ? 'col-span-1' : 'col-span-2'}>
              {f.type !== 'checkbox' && <Label className="mb-1.5 block">{f.label}{f.required && ' *'}</Label>}
              {f.type === 'long_text' ? (
                <Textarea value={values[f.key] ?? ''} onChange={(e) => setValue(f.key, e.target.value)} placeholder={f.placeholder} />
              ) : f.type === 'dropdown' ? (
                <Select value={values[f.key] ?? ''} onValueChange={(v) => setValue(f.key, v)}>
                  <SelectTrigger><SelectValue placeholder={f.placeholder || 'Select…'} /></SelectTrigger>
                  <SelectContent>
                    {(f.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : f.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={values[f.key] === 'true'}
                    onChange={(e) => setValue(f.key, e.target.checked ? 'true' : '')}
                  />
                  {f.label}{f.required && ' *'}
                </label>
              ) : (
                <Input
                  type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValue(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              )}
            </div>
          ))}
        </div>

        {/* Honeypot — hidden from humans */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          className="hidden"
          aria-hidden="true"
        />

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit'}
        </Button>
      </form>
    </Centered>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-sm">{children}</div>
    </div>
  )
}
