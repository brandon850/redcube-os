import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface SettingsNavItem {
  label: string
  to: string
  adminOnly?: boolean
}

const SETTINGS_NAV: SettingsNavItem[] = [
  { label: 'Profile', to: '/settings/profile' },
  { label: 'Company', to: '/settings/company', adminOnly: true },
  { label: 'Brands', to: '/settings/brands', adminOnly: true },
  { label: 'Branding', to: '/settings/branding', adminOnly: true },
  { label: 'Users', to: '/settings/users', adminOnly: true },
  { label: 'Roles', to: '/settings/roles', adminOnly: true },
  { label: 'Pipeline', to: '/settings/pipeline', adminOnly: true },
  { label: 'Packages', to: '/settings/packages', adminOnly: true },
  { label: 'Templates', to: '/settings/templates', adminOnly: true },
  { label: 'Integrations', to: '/settings/integrations', adminOnly: true },
  { label: 'Email', to: '/settings/email', adminOnly: true },
]

export default function SettingsLayout() {
  const { isAdmin } = useAuth()
  const items = SETTINGS_NAV.filter((i) => !i.adminOnly || isAdmin)

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <div className="mt-6 flex gap-8">
        <nav className="w-44 shrink-0 space-y-0.5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'block rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
