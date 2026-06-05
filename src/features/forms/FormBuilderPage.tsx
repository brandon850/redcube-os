import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowUp, ArrowDown, Trash2, Code, GripVertical, Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { useForm, useUpdateForm } from './useForms'
import EmbedSheet from './EmbedSheet'
import {
  DEFAULT_SETTINGS, FIELD_TYPE_LABELS, type FieldType, type FormField, type FormSettings,
} from './types'
import { usePipelineStages } from '@/features/pipeline/usePipeline'
import { useActiveUsers } from '@/features/crm/useContacts'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const FIELD_TYPES: FieldType[] = ['short_text', 'long_text', 'email', 'phone', 'dropdown', 'checkbox']
const NONE = '__none__'
const ROUND_ROBIN = 'round_robin'

function newField(type: FieldType): FormField {
  const rand = Math.random().toString(36).slice(2, 7)
  const key = type === 'email' ? 'email' : type === 'phone' ? 'phone' : `field_${rand}`
  return {
    id: `f_${rand}`,
    type,
    key,
    label: FIELD_TYPE_LABELS[type],
    required: false,
    width: 'full',
    options: type === 'dropdown' ? ['Option 1', 'Option 2'] : undefined,
  }
}

export default function FormBuilderPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: form, isLoading } = useForm(id)
  const updateForm = useUpdateForm(id)
  const { data: stages } = usePipelineStages()
  const { data: users } = useActiveUsers()

  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [fields, setFields] = useState<FormField[]>([])
  const [settings, setSettings] = useState<FormSettings>(DEFAULT_SETTINGS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [embedOpen, setEmbedOpen] = useState(false)

  useEffect(() => {
    if (!form) return
    setName(form.name)
    setIsActive(form.is_active)
    setFields((form.fields as unknown as FormField[]) ?? [])
    setSettings({ ...DEFAULT_SETTINGS, ...((form.settings as unknown as FormSettings) ?? {}) })
  }, [form])

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (!form) return <p className="text-sm text-destructive">Form not found.</p>

  const selected = fields.find((f) => f.id === selectedId) ?? null

  function addField(type: FieldType) {
    const f = newField(type)
    setFields((prev) => [...prev, f])
    setSelectedId(f.id)
  }
  function patchField(fieldId: string, patch: Partial<FormField>) {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)))
  }
  function removeField(fieldId: string) {
    setFields((prev) => prev.filter((f) => f.id !== fieldId))
    if (selectedId === fieldId) setSelectedId(null)
  }
  function move(fieldId: string, dir: -1 | 1) {
    setFields((prev) => {
      const i = prev.findIndex((f) => f.id === fieldId)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  async function save() {
    await updateForm.mutateAsync({ name, fields, settings, is_active: isActive })
    toast.success('Form saved')
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate('/forms')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Forms
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
            <Label htmlFor="active">Active</Label>
          </div>
          <Button variant="outline" onClick={() => setEmbedOpen(true)}>
            <Code className="mr-2 h-4 w-4" /> Embed
          </Button>
          <Button onClick={() => void save()} disabled={updateForm.isPending}>
            {updateForm.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-4 max-w-md text-lg font-medium"
        placeholder="Form name"
      />

      <div className="grid grid-cols-[160px_1fr_280px] gap-4">
        {/* Palette */}
        <div className="space-y-1.5">
          <div className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Add field</div>
          {FIELD_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => addField(t)}
              className="flex w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent"
            >
              <Plus className="h-3.5 w-3.5" /> {FIELD_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          {fields.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Add fields from the left to build your form.
            </p>
          )}
          {fields.map((f, i) => (
            <button
              key={f.id}
              onClick={() => setSelectedId(f.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md border bg-background p-3 text-left',
                selectedId === f.id && 'ring-2 ring-primary',
              )}
            >
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{f.label}</span>
                  {f.required && <span className="h-1.5 w-1.5 rounded-full bg-destructive" title="Required" />}
                </div>
                <span className="text-xs text-muted-foreground">{FIELD_TYPE_LABELS[f.type]}</span>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); move(f.id, -1) }}
                className={cn('rounded p-1 hover:bg-accent', i === 0 && 'pointer-events-none opacity-30')}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); move(f.id, 1) }}
                className={cn('rounded p-1 hover:bg-accent', i === fields.length - 1 && 'pointer-events-none opacity-30')}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); removeField(f.id) }}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>

        {/* Config / settings */}
        <div className="rounded-lg border bg-background p-4">
          {selected ? (
            <FieldConfig key={selected.id} field={selected} onChange={(p) => patchField(selected.id, p)} />
          ) : (
            <FormSettingsPanel
              settings={settings}
              onChange={(p) => setSettings((s) => ({ ...s, ...p }))}
              stages={(stages ?? []).map((s) => ({ id: s.id, name: s.name }))}
              users={(users ?? []).map((u) => ({ id: u.id, name: u.full_name || u.email }))}
            />
          )}
        </div>
      </div>

      <EmbedSheet token={form.embed_token} open={embedOpen} onOpenChange={setEmbedOpen} />
    </div>
  )
}

function FieldConfig({ field, onChange }: { field: FormField; onChange: (p: Partial<FormField>) => void }) {
  return (
    <div className="space-y-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {FIELD_TYPE_LABELS[field.type]} field
      </div>
      <div className="space-y-1.5">
        <Label>Label</Label>
        <Input value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
      </div>
      {field.type !== 'checkbox' && (
        <div className="space-y-1.5">
          <Label>Placeholder</Label>
          <Input value={field.placeholder ?? ''} onChange={(e) => onChange({ placeholder: e.target.value })} />
        </div>
      )}
      {field.type === 'dropdown' && (
        <div className="space-y-1.5">
          <Label>Options (one per line)</Label>
          <Textarea
            rows={4}
            value={(field.options ?? []).join('\n')}
            onChange={(e) => onChange({ options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
          />
        </div>
      )}
      <div className="flex items-center justify-between">
        <Label htmlFor="req">Required</Label>
        <Switch id="req" checked={!!field.required} onCheckedChange={(v) => onChange({ required: v })} />
      </div>
      <div className="space-y-1.5">
        <Label>Width</Label>
        <Select value={field.width ?? 'full'} onValueChange={(v) => onChange({ width: v as 'full' | 'half' })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Full width</SelectItem>
            <SelectItem value="half">Half width</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function FormSettingsPanel({
  settings, onChange, stages, users,
}: {
  settings: FormSettings
  onChange: (p: Partial<FormSettings>) => void
  stages: { id: string; name: string }[]
  users: { id: string; name: string }[]
}) {
  return (
    <div className="space-y-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Form settings</div>

      <div className="space-y-1.5">
        <Label>After submit</Label>
        <Select value={settings.after} onValueChange={(v) => onChange({ after: v as 'message' | 'redirect' })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="message">Show message</SelectItem>
            <SelectItem value="redirect">Redirect to URL</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {settings.after === 'message' ? (
        <div className="space-y-1.5">
          <Label>Success message</Label>
          <Textarea rows={2} value={settings.success_message} onChange={(e) => onChange({ success_message: e.target.value })} />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label>Redirect URL</Label>
          <Input value={settings.redirect_url ?? ''} onChange={(e) => onChange({ redirect_url: e.target.value })} placeholder="https://…" />
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Create deal in stage</Label>
        <Select
          value={settings.stage_id ?? NONE}
          onValueChange={(v) => onChange({ stage_id: v === NONE ? null : v })}
        >
          <SelectTrigger><SelectValue placeholder="First stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>First stage (default)</SelectItem>
            {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Assign to</Label>
        <Select
          value={settings.assign_to ?? NONE}
          onValueChange={(v) => onChange({ assign_to: v === NONE ? null : v })}
        >
          <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Unassigned</SelectItem>
            <SelectItem value={ROUND_ROBIN}>Round robin</SelectItem>
            {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Toggle label="Send confirmation email" checked={!!settings.send_confirmation} onChange={(v) => onChange({ send_confirmation: v })} />
      <Toggle label="Notify rep on submit" checked={!!settings.notify_rep} onChange={(v) => onChange({ notify_rep: v })} />
      <Toggle label="Honeypot spam protection" checked={!!settings.honeypot} onChange={(v) => onChange({ honeypot: v })} />
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
