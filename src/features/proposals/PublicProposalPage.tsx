import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Check, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { CatalogService } from '@/features/catalog/useCatalog'
import {
  applyDiscount, buildSnapshot, calcTotals, formatMoney, type SelectionState,
} from './pricing'
import { cn } from '@/lib/utils'
import { brandThemeStyle } from '@/lib/color'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PublicHeader } from '@/components/Brand'

interface PublicProposal {
  id: string
  status: string
  intro_text: string | null
  payment_terms: string | null
  discount_pct: number
  valid_until: string | null
  signer_name: string | null
  signed_at: string | null
}
interface ProposalPayload {
  ok: boolean
  error?: string
  proposal?: PublicProposal
  brand?: { id: string; name: string; color: string | null; logo_url: string | null }
  contact?: { first_name: string; last_name: string }
}

function usePublicProposal(token: string) {
  return useQuery({
    queryKey: ['public-proposal', token],
    queryFn: async (): Promise<ProposalPayload> => {
      const { data, error } = await supabase.rpc('get_public_proposal', { p_token: token })
      if (error) throw error
      return data as unknown as ProposalPayload
    },
  })
}

function usePublicCatalog(brandId: string | undefined) {
  return useQuery({
    queryKey: ['public-catalog', brandId],
    enabled: !!brandId,
    queryFn: async (): Promise<CatalogService[]> => {
      let query = supabase
        .from('services')
        .select('*, packages(*, package_line_items(*), package_addons(*)), service_addons(*)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      if (brandId) query = query.eq('brand_id', brandId)
      const { data, error } = await query
      if (error) throw error
      const services = (data ?? []) as unknown as CatalogService[]
      for (const s of services) {
        s.packages.sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
        s.service_addons.sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
        for (const p of s.packages) p.package_line_items.sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
      }
      return services.filter((s) => s.packages.some((p) => p.is_active))
    },
  })
}

export default function PublicProposalPage() {
  const { token = '' } = useParams()
  const { data: payload, isLoading } = usePublicProposal(token)
  const { data: services } = usePublicCatalog(payload?.brand?.id)

  const [sel, setSel] = useState<SelectionState>({
    selectedPackages: {}, checkedColumnAddons: new Set(), checkedSharedAddons: new Set(),
  })
  const [signer, setSigner] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const proposal = payload?.proposal
  const discount = proposal?.discount_pct ?? 0

  const totals = useMemo(() => (services ? calcTotals(services, sel) : { monthly: 0, oneTime: 0 }), [services, sel])
  const discounted = applyDiscount(totals, discount)
  const hasSelection = Object.values(sel.selectedPackages).some(Boolean)

  if (isLoading) {
    return <Centered><Loader2 className="h-8 w-8 animate-spin text-primary" /></Centered>
  }
  if (!payload?.ok || !proposal) {
    return <Centered><p className="text-sm text-muted-foreground">This proposal is unavailable.</p></Centered>
  }

  const alreadySigned = !!proposal.signed_at || accepted

  function selectPackage(serviceId: string, packageId: string) {
    setSel((s) => ({
      ...s,
      selectedPackages: { ...s.selectedPackages, [serviceId]: s.selectedPackages[serviceId] === packageId ? undefined : packageId },
    }))
  }
  function toggle(set: 'checkedColumnAddons' | 'checkedSharedAddons', id: string) {
    setSel((s) => {
      const next = new Set(s[set])
      if (next.has(id)) next.delete(id); else next.add(id)
      return { ...s, [set]: next }
    })
  }

  async function accept() {
    if (!hasSelection) { setError('Select at least one package first.'); return }
    if (!signer.trim()) { setError('Type your name to accept.'); return }
    setError(null); setAccepting(true)
    const snapshot = buildSnapshot(services ?? [], sel)
    const { data, error: rpcErr } = await supabase.rpc('accept_proposal', {
      p_token: token, p_selections: snapshot as never, p_signer_name: signer.trim(),
    })
    setAccepting(false)
    const result = data as { ok?: boolean; error?: string } | null
    if (rpcErr || !result?.ok) { setError(result?.error || rpcErr?.message || 'Could not accept.'); return }
    setAccepted(true)
  }

  return (
    <div className="min-h-screen bg-muted/30" style={brandThemeStyle(payload.brand?.color)}>
      <PublicHeader brand={payload.brand} />
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 lg:grid-cols-[1fr_320px]">
        {/* Left: catalog */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Proposal for {payload.contact?.first_name} {payload.contact?.last_name}
          </h1>
          {proposal.intro_text && <p className="mt-3 rounded-lg border bg-background p-4 text-sm">{proposal.intro_text}</p>}

          <div className="mt-6 space-y-6">
            {(services ?? []).map((svc) => {
              const selectedPkgId = sel.selectedPackages[svc.id]
              return (
                <div key={svc.id}>
                  <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold"><span>{svc.emoji}</span> {svc.name}</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {svc.packages.filter((p) => p.is_active).map((pkg) => {
                      const isSel = selectedPkgId === pkg.id
                      return (
                        <button
                          key={pkg.id}
                          onClick={() => selectPackage(svc.id, pkg.id)}
                          disabled={alreadySigned}
                          className={cn(
                            'rounded-lg border bg-background p-4 text-left transition-all',
                            isSel ? 'border-primary ring-2 ring-primary' : 'hover:border-foreground/30',
                          )}
                        >
                          {pkg.tier && <div className="text-xs uppercase tracking-wide text-muted-foreground">{pkg.tier}</div>}
                          <div className="font-medium">{pkg.name}</div>
                          <div className="mt-1 text-lg font-semibold">
                            {formatMoney(Number(pkg.base_price ?? 0))}
                            <span className="text-xs font-normal text-muted-foreground">{pkg.price_type === 'monthly' ? '/mo' : ' one-time'}</span>
                          </div>
                          {pkg.tagline && <p className="mt-1 text-xs text-muted-foreground">{pkg.tagline}</p>}
                          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {pkg.package_line_items.map((li) => (
                              <li key={li.id} className="flex gap-1"><Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />{li.description}</li>
                            ))}
                          </ul>
                        </button>
                      )
                    })}
                  </div>

                  {/* Add-ons appear once a package in this service is selected */}
                  {selectedPkgId && (
                    <div className="mt-3 space-y-2 rounded-lg border bg-background p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Add-ons</div>
                      {svc.packages.find((p) => p.id === selectedPkgId)?.package_addons.map((a) => (
                        <AddonRow key={a.id} name={a.name} price={Number(a.price)} priceType={a.price_type}
                          checked={sel.checkedColumnAddons.has(a.id)} disabled={alreadySigned}
                          onToggle={() => toggle('checkedColumnAddons', a.id)} />
                      ))}
                      {svc.service_addons.map((a) => (
                        <AddonRow key={a.id} name={a.name} price={Number(a.price)} priceType={a.price_type}
                          desc={a.description} checked={sel.checkedSharedAddons.has(a.id)} disabled={alreadySigned}
                          onToggle={() => toggle('checkedSharedAddons', a.id)} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: summary + accept */}
        <div className="lg:sticky lg:top-10 lg:self-start">
          <div className="rounded-lg border bg-background p-5">
            <h3 className="font-semibold">Your selection</h3>
            <div className="mt-3 space-y-1 text-sm">
              {discounted.monthly > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Monthly</span><span className="font-semibold">{formatMoney(discounted.monthly)}/mo</span></div>
              )}
              {discount > 0 && totals.monthly > 0 && (
                <div className="flex justify-between text-xs text-emerald-600"><span>Discount ({discount}%)</span><span>−{formatMoney(totals.monthly - discounted.monthly)}/mo</span></div>
              )}
              {discounted.oneTime > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">One-time</span><span className="font-semibold">{formatMoney(discounted.oneTime)}</span></div>
              )}
              {!hasSelection && <p className="text-sm text-muted-foreground">Select packages to see pricing.</p>}
            </div>
            {proposal.payment_terms && <p className="mt-3 text-xs text-muted-foreground">Terms: {proposal.payment_terms}</p>}

            <div className="mt-4 border-t pt-4">
              {alreadySigned ? (
                <div className="text-center text-sm">
                  <div className="font-semibold text-emerald-600">Accepted ✓</div>
                  <p className="mt-1 text-muted-foreground">
                    Thanks{proposal.signer_name ? `, ${proposal.signer_name}` : ''}! We'll be in touch with next steps.
                  </p>
                </div>
              ) : (
                <>
                  <label className="text-xs font-medium text-muted-foreground">Type your name to accept</label>
                  <Input className="mt-1" value={signer} onChange={(e) => setSigner(e.target.value)} placeholder="Full name" />
                  {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
                  <Button className="mt-3 w-full" onClick={() => void accept()} disabled={accepting}>
                    {accepting ? 'Submitting…' : 'Accept proposal'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddonRow({
  name, price, priceType, desc, checked, disabled, onToggle,
}: {
  name: string; price: number; priceType: string; desc?: string | null
  checked: boolean; disabled: boolean; onToggle: () => void
}) {
  return (
    <label className={cn('flex items-start gap-2 text-sm', disabled && 'opacity-60')}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onToggle} className="mt-1" />
      <span className="flex-1">
        <span className="flex justify-between">
          <span>{name}</span>
          <span className="text-muted-foreground">+{formatMoney(price)}{priceType === 'monthly' ? '/mo' : ''}</span>
        </span>
        {desc && <span className="block text-xs text-muted-foreground">{desc}</span>}
      </span>
    </label>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">{children}</div>
}
