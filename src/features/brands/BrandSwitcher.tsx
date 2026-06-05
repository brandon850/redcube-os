import { Check, ChevronsUpDown } from 'lucide-react'
import { useBrand } from '@/hooks/useBrand'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function Dot({ color }: { color?: string | null }) {
  return <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color ?? '#888' }} />
}

export default function BrandSwitcher() {
  const { brands, activeBrand, activeBrandId, setActiveBrandId } = useBrand()
  if (brands.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Dot color={activeBrand?.brand_color} />
          <span className="max-w-[160px] truncate">{activeBrand?.name ?? 'Select brand'}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Working in</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {brands.map((b) => (
          <DropdownMenuItem key={b.id} onClick={() => setActiveBrandId(b.id)} className="gap-2">
            <Dot color={b.brand_color} />
            <span className="flex-1 truncate">{b.name}</span>
            {b.id === activeBrandId && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
