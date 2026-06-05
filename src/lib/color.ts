import type { CSSProperties } from 'react'

/** Convert a #RRGGBB hex to the "H S% L%" triplet shadcn CSS variables expect. */
export function hexToHslTriplet(hex?: string | null): string | null {
  if (!hex) return null
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!m) return null
  const r = parseInt(m[1], 16) / 255
  const g = parseInt(m[2], 16) / 255
  const b = parseInt(m[3], 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  const d = max - min
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r: h = ((g - b) / d) % 6; break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

/** Inline style that overrides --primary/--ring with a brand color for a page subtree. */
export function brandThemeStyle(hex?: string | null): CSSProperties {
  const triplet = hexToHslTriplet(hex)
  if (!triplet) return {}
  return { ['--primary' as string]: triplet, ['--ring' as string]: triplet } as CSSProperties
}
