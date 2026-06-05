import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'

const TABS = ['Script tag', 'iFrame', 'React'] as const
type Tab = (typeof TABS)[number]

export default function EmbedSheet({
  token,
  open,
  onOpenChange,
}: {
  token: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [tab, setTab] = useState<Tab>('Script tag')
  const [copied, setCopied] = useState(false)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.redcube.co'

  if (!token) return null

  const snippets: Record<Tab, string> = {
    'Script tag':
      `<div data-redcube-form="${token}"></div>\n` +
      `<script src="${origin}/embed.js" async></script>`,
    iFrame:
      `<iframe src="${origin}/f/${token}"\n  width="100%" height="600" frameborder="0"\n  style="border:0"></iframe>`,
    React:
      `export function RedCubeForm() {\n` +
      `  return (\n` +
      `    <iframe\n` +
      `      src="${origin}/f/${token}"\n` +
      `      width="100%" height={600} frameBorder={0} style={{ border: 0 }}\n` +
      `    />\n` +
      `  )\n}`,
  }

  async function copy() {
    await navigator.clipboard.writeText(snippets[tab])
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Embed this form</SheetTitle>
          <SheetDescription>Paste this where you want the form to appear.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex gap-1 border-b">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative mt-4">
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
            {snippets[tab]}
          </pre>
          <Button size="sm" variant="outline" className="absolute right-2 top-2" onClick={() => void copy()}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          The script-tag version auto-captures UTM parameters from the host page URL.
          The public form lives at <code>{origin}/f/{token}</code>.
        </p>
      </SheetContent>
    </Sheet>
  )
}
