import { NavLink, Outlet } from 'react-router-dom'
import {
  Users, Building2, KanbanSquare, FileText, Search, Receipt,
  FormInput, Send, Globe, BarChart3, Package, Settings, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useBrand } from '@/hooks/useBrand'
import { cn } from '@/lib/utils'
import { Wordmark } from '@/components/Brand'
import BrandSwitcher from '@/features/brands/BrandSwitcher'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  adminOnly?: boolean
}
interface NavSection {
  heading: string
  items: NavItem[]
  seoOnly?: boolean // hidden for brands without SEO enabled
}

const SECTIONS: NavSection[] = [
  { heading: 'CRM', items: [
    { label: 'Contacts', to: '/contacts', icon: Users },
    { label: 'Companies', to: '/companies', icon: Building2 },
  ] },
  { heading: 'Sales', items: [
    { label: 'Pipeline', to: '/pipeline', icon: KanbanSquare },
    { label: 'Proposals', to: '/proposals', icon: FileText },
  ] },
  { heading: 'Attract', seoOnly: true, items: [
    { label: 'Audits', to: '/audits', icon: Search },
  ] },
  { heading: 'Billing', items: [
    { label: 'Invoices', to: '/invoices', icon: Receipt },
  ] },
  { heading: 'Marketing', items: [
    { label: 'Forms', to: '/forms', icon: FormInput },
    { label: 'Sequences', to: '/sequences', icon: Send },
  ] },
  { heading: 'Deliver', seoOnly: true, items: [
    { label: 'SEO Sites', to: '/sites', icon: Globe },
  ] },
  { heading: 'Reports', items: [
    { label: 'Analytics', to: '/analytics', icon: BarChart3 },
  ] },
  { heading: 'Admin', items: [
    { label: 'Catalog', to: '/settings/packages', icon: Package, adminOnly: true },
    { label: 'Settings', to: '/settings/company', icon: Settings, adminOnly: true },
  ] },
]

function initials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
  }
  return (email?.[0] ?? '?').toUpperCase()
}

export default function AppLayout() {
  const { profile, authUser, role, isAdmin, signOut } = useAuth()
  const { activeBrand } = useBrand()
  const seoEnabled = activeBrand?.seo_enabled !== false
  const displayName = profile?.full_name || authUser?.email || 'User'

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar — RedCube dark chrome */}
      <aside className="fixed inset-y-0 left-0 w-[220px] overflow-y-auto bg-zinc-950 text-zinc-300">
        <div className="flex h-14 items-center px-4">
          <Wordmark tone="light" />
        </div>
        <nav className="space-y-5 px-3 py-2">
          {SECTIONS.map((section) => {
            if (section.seoOnly && !seoEnabled) return null
            const items = section.items.filter((i) => !i.adminOnly || isAdmin)
            if (items.length === 0) return null
            return (
              <div key={section.heading}>
                <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {section.heading}
                </div>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          'relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/15 text-white'
                            : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary" />}
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col pl-[220px]">
        <header className="flex h-14 items-center justify-between border-b bg-background px-6">
          <BrandSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">
                    {initials(profile?.full_name, authUser?.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="flex flex-col">
                <span>{displayName}</span>
                <span className="text-xs font-normal capitalize text-muted-foreground">{role}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <NavLink to="/settings/profile">Profile</NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void signOut()}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
