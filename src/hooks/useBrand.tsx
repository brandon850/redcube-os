import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useBrands } from '@/features/brands/useBrands'
import type { Brand } from '@/types/database.types'

const STORAGE_KEY = 'redcube.activeBrandId'

interface BrandContextValue {
  brands: Brand[]
  activeBrand: Brand | null
  activeBrandId: string | null
  setActiveBrandId: (id: string) => void
  loading: boolean
}

const BrandContext = createContext<BrandContextValue | undefined>(undefined)

export function BrandProvider({ children }: { children: ReactNode }) {
  const { data: brands, isLoading } = useBrands()
  const [activeBrandId, setActiveBrandIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  )

  // Once brands load, ensure the active id is valid; default to the default brand.
  useEffect(() => {
    if (!brands || brands.length === 0) return
    const valid = activeBrandId && brands.some((b) => b.id === activeBrandId)
    if (!valid) {
      const fallback = brands.find((b) => b.is_default) ?? brands[0]
      setActiveBrandIdState(fallback.id)
      localStorage.setItem(STORAGE_KEY, fallback.id)
    }
  }, [brands, activeBrandId])

  function setActiveBrandId(id: string) {
    setActiveBrandIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  const value = useMemo<BrandContextValue>(() => {
    const list = brands ?? []
    return {
      brands: list,
      activeBrandId,
      activeBrand: list.find((b) => b.id === activeBrandId) ?? null,
      setActiveBrandId,
      loading: isLoading,
    }
  }, [brands, activeBrandId, isLoading])

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
}

export function useBrand(): BrandContextValue {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useBrand must be used within a BrandProvider')
  return ctx
}
