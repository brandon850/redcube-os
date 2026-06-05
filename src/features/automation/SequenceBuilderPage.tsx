import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUp, ArrowDown, Trash2, Mail, Clock, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useSequence, useSaveSequence, type StepDraft } from './useSequences'
import { TEMPLATE_LIST } from '@/features/email/templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function SequenceBuilderPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: seq, isLoading } = useSequence(id)
  const save = useSaveSequence(id)

  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState('manual')
  const [active, setActive] = useState(false)
  const [steps, setSteps] = useState<StepDraft[]>([])

  useEffect(() => {
    if (!seq) return
    setName(seq.name)
    setTrigger(seq.trigger_type ?? 'manual')
    setActive(seq.is_active)
    setSteps(seq.sequence_steps.map((s) => ({ type: s.type as StepDraft['type'], config: (s.config as StepDraft['config']) ?? {} })))
  }, [seq])

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (!seq) return <p className="text-sm text-destructive">Sequence not found.</p>

  function addStep(type: StepDraft['type']) {
    const config = type === 'wait' ? { days: 3 } : { template_id: TEMPLATE_LIST[0]?.id }
    setSteps((s) => [...s, { type, config }])
  }
  function patch(i: number, config: StepDraft['config']) {
    setSteps((s) => s.map((st, j) => (j === i ? { ...st, config: { ...st.config, ...config } } : st)))
  }
  function move(i: number, dir: -1 | 1) {
    setSteps((s) => {
      const j = i + dir
      if (j < 0 || j >= s.length) return s
      const next = [...s]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  function remove(i: number) { setSteps((s) => s.filter((_, j) => j !== i)) }

  async function handleSave() {
    await save.mutateAsync({ patch: { name: name.trim(), trigger_type: trigger, is_active: active }, steps })
    toast.success('Sequence saved')
  }

  return (
    <div className="max-w-2xl">
      <Button variant="ghost" size="sm" className="-ml-2 mb-4" onClick={() => navigate('/sequences')}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Sequences
      </Button>

      <div className="flex items-center justify-between gap-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm text-lg font-medium" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm"><Switch checked={active} onCheckedChange={setActive} id="seq-active" /><Label htmlFor="seq-active">Active</Label></div>
          <Button onClick={() => void handleSave()} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">Trigger</Label>
        <Select value={trigger} onValueChange={setTrigger}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual enrollment</SelectItem>
            <SelectItem value="form">Form submission</SelectItem>
            <SelectItem value="audit">SEO audit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 space-y-2">
        {steps.length === 0 && <p className="text-sm text-muted-foreground">No steps yet. Add an email or a wait below.</p>}
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border bg-background p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted">
              {step.type === 'send_email' ? <Mail className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            </span>
            <div className="flex-1">
              {step.type === 'send_email' ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm">Send</span>
                  <Select value={step.config.template_id} onValueChange={(v) => patch(i, { template_id: v })}>
                    <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Pick a template" /></SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_LIST.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <span>Wait</span>
                  <Input type="number" min={0} className="h-8 w-20" value={step.config.days ?? 0} onChange={(e) => patch(i, { days: Number(e.target.value) || 0 })} />
                  <span>days</span>
                </div>
              )}
            </div>
            <div className="flex shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === steps.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="mt-3"><Plus className="mr-2 h-4 w-4" /> Add step</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => addStep('send_email')}><Mail className="mr-2 h-4 w-4" /> Send email</DropdownMenuItem>
          <DropdownMenuItem onClick={() => addStep('wait')}><Clock className="mr-2 h-4 w-4" /> Wait</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <p className="mt-6 text-xs text-muted-foreground">
        Enrolled contacts move through these steps. The scheduler that sends emails on time goes live with Resend + cron.
      </p>
    </div>
  )
}
