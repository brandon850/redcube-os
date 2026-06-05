import { Check, Minus } from 'lucide-react'

// Mirrors the RLS model in migration 006.
const PERMISSIONS: { area: string; admin: boolean; sales: boolean; viewer: boolean }[] = [
  { area: 'View contacts, deals, proposals, invoices', admin: true, sales: true, viewer: true },
  { area: 'Edit contacts, deals, activities, proposals', admin: true, sales: true, viewer: false },
  { area: 'Build & send proposals / contracts', admin: true, sales: true, viewer: false },
  { area: 'Manage SEO sites & client delivery', admin: true, sales: true, viewer: false },
  { area: 'Edit catalog (services, packages, add-ons)', admin: true, sales: false, viewer: false },
  { area: 'Edit pipeline stages, forms, sequences', admin: true, sales: false, viewer: false },
  { area: 'Company settings & integrations', admin: true, sales: false, viewer: false },
  { area: 'Manage users & roles', admin: true, sales: false, viewer: false },
]

function Cell({ on }: { on: boolean }) {
  return (
    <td className="px-4 py-2 text-center">
      {on ? <Check className="mx-auto h-4 w-4 text-emerald-600" /> : <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />}
    </td>
  )
}

export default function RolesPage() {
  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold">Roles</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        What each role can do. Enforced in the database via row-level security — not just the UI.
      </p>

      <div className="mt-4 overflow-hidden rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Permission</th>
              <th className="px-4 py-2 text-center font-medium">Admin</th>
              <th className="px-4 py-2 text-center font-medium">Sales</th>
              <th className="px-4 py-2 text-center font-medium">Viewer</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {PERMISSIONS.map((p) => (
              <tr key={p.area}>
                <td className="px-4 py-2">{p.area}</td>
                <Cell on={p.admin} />
                <Cell on={p.sales} />
                <Cell on={p.viewer} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
