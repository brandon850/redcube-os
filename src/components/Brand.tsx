import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** RedCube cube glyph — a small rounded red square with a subtle cube edge. */
export function CubeMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'grid place-items-center rounded-[6px] bg-primary font-black text-primary-foreground shadow-sm',
        className,
      )}
      aria-hidden
    >
      <span className="text-[0.7em] leading-none">R</span>
    </span>
  )
}

/**
 * RedCube wordmark. `tone` controls the text color so it reads on both the
 * light app chrome and the dark sidebar.
 */
export function Wordmark({
  sub = 'OS',
  size = 'md',
  tone = 'default',
  className,
}: {
  sub?: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'default' | 'light'
  className?: string
}) {
  const cube = size === 'lg' ? 'h-8 w-8' : size === 'sm' ? 'h-6 w-6' : 'h-7 w-7'
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg'
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <CubeMark className={cube} />
      <span className={cn('font-semibold tracking-tight', text, tone === 'light' ? 'text-white' : 'text-foreground')}>
        RedCube{sub && <span className={cn('ml-1 font-normal', tone === 'light' ? 'text-white/55' : 'text-muted-foreground')}>{sub}</span>}
      </span>
    </div>
  )
}

export interface PublicBrand {
  name: string
  color?: string | null
  logo_url?: string | null
}

/** Lockup for a specific brand on client-facing pages: logo if set, else a colored mark + name. */
export function BrandLockup({ brand }: { brand: PublicBrand }) {
  return (
    <div className="flex items-center gap-2">
      {brand.logo_url ? (
        <img src={brand.logo_url} alt={brand.name} className="h-7 w-auto" />
      ) : (
        <span
          className="grid h-7 w-7 place-items-center rounded-[6px] text-sm font-black text-white"
          style={{ background: brand.color ?? '#888' }}
        >
          {brand.name.charAt(0)}
        </span>
      )}
      <span className="text-lg font-semibold tracking-tight">{brand.name}</span>
    </div>
  )
}

/** Branded top bar for public pages. Pass `brand` to use a specific entity; defaults to RedCube. */
export function PublicHeader({ right, brand }: { right?: ReactNode; brand?: PublicBrand | null }) {
  return (
    <header className="border-b bg-background">
      <div className="flex items-center justify-between px-6 py-3">
        {brand ? <BrandLockup brand={brand} /> : <Wordmark sub="Creative" />}
        {right}
      </div>
    </header>
  )
}
