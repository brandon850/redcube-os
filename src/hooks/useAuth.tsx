import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User as AuthUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types/database.types'

export type Role = 'admin' | 'sales' | 'viewer'

interface AuthContextValue {
  authUser: AuthUser | null
  session: Session | null
  profile: User | null
  role: Role
  isAdmin: boolean
  isSales: boolean
  isViewer: boolean
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Ensures a row exists in public.users for the signed-in auth user.
 * On first login we create one (default role 'sales'); afterwards we just read it.
 */
async function ensureProfile(authUser: AuthUser): Promise<User | null> {
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle()

  if (existing) return existing

  const { data: created } = await supabase
    .from('users')
    .insert({
      id: authUser.id,
      email: authUser.email ?? '',
      full_name: (authUser.user_metadata?.full_name as string | undefined) ?? null,
      role: 'sales',
    })
    .select('*')
    .single()

  return created ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function hydrate(nextSession: Session | null) {
      if (!active) return
      setSession(nextSession)
      if (nextSession?.user) {
        const p = await ensureProfile(nextSession.user)
        if (active) setProfile(p)
      } else {
        setProfile(null)
      }
      if (active) setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => hydrate(data.session))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      hydrate(nextSession)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const role = (profile?.role as Role) ?? 'viewer'

  const value: AuthContextValue = {
    authUser: session?.user ?? null,
    session,
    profile,
    role,
    isAdmin: role === 'admin',
    isSales: role === 'sales',
    isViewer: role === 'viewer',
    loading,
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
