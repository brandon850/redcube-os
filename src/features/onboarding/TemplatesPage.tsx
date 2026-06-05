import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useActiveTemplate, useSaveTemplate, TASK_ROLES, TASK_PRIORITIES,
  type TemplatePhase, type TemplateTask,
} from './useTemplate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

function blankTask(): TemplateTask {
  return { name: 'New task', role: 'account_manager', due_day_offset: 0, priority: 3 }
}

export default function TemplatesPage() {
  const { data: template, isLoading } = useActiveTemplate()
  const save = useSaveTemplate()
  const [phases, setPhases] = useState<TemplatePhase[]>([])

  useEffect(() => {
    if (template) setPhases((template.phases as unknown as TemplatePhase[]) ?? [])
  }, [template])

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (!template) return <p className="text-sm text-muted-foreground">No active template.</p>

  function patchTask(pi: number, ti: number, patch: Partial<TemplateTask>) {
    setPhases((ph) => ph.map((p, i) => i !== pi ? p : { ...p, tasks: p.tasks.map((t, j) => (j === ti ? { ...t, ...patch } : t)) }))
  }
  function addTask(pi: number) {
    setPhases((ph) => ph.map((p, i) => (i === pi ? { ...p, tasks: [...p.tasks, blankTask()] } : p)))
  }
  function removeTask(pi: number, ti: number) {
    setPhases((ph) => ph.map((p, i) => (i === pi ? { ...p, tasks: p.tasks.filter((_, j) => j !== ti) } : p)))
  }
  function addPhase() { setPhases((ph) => [...ph, { name: 'New phase', tasks: [] }]) }
  function removePhase(pi: number) { setPhases((ph) => ph.filter((_, i) => i !== pi)) }
  function renamePhase(pi: number, name: string) { setPhases((ph) => ph.map((p, i) => (i === pi ? { ...p, name } : p))) }

  async function handleSave() {
    await save.mutateAsync({ id: template!.id, phases, version: template!.version })
    toast.success('Template saved')
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Onboarding template</h2>
          <p className="text-sm text-muted-foreground">
            Tasks created for every new client (due dates are offsets in days from the start date).
          </p>
        </div>
        <Button onClick={() => void handleSave()} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save template'}
        </Button>
      </div>

      <div className="space-y-4">
        {phases.map((phase, pi) => (
          <div key={pi} className="rounded-lg border bg-background">
            <div className="flex items-center justify-between gap-2 border-b p-3">
              <Input value={phase.name} onChange={(e) => renamePhase(pi, e.target.value)} className="max-w-xs font-medium" />
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => addTask(pi)}><Plus className="mr-1 h-4 w-4" /> Task</Button>
                <Button variant="ghost" size="icon" onClick={() => removePhase(pi)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="space-y-2 p-3">
              {phase.tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks.</p>}
              {phase.tasks.map((task, ti) => (
                <div key={ti} className="flex items-center gap-2">
                  <Input className="flex-1" value={task.name} onChange={(e) => patchTask(pi, ti, { name: e.target.value })} />
                  <Select value={task.role} onValueChange={(v) => patchTask(pi, ti, { role: v })}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs text-muted-foreground">Day</Label>
                    <Input
                      type="number" className="w-16"
                      value={task.due_day_offset}
                      onChange={(e) => patchTask(pi, ti, { due_day_offset: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <Select value={String(task.priority)} onValueChange={(v) => patchTask(pi, ti, { priority: Number(v) })}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map((p) => <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => removeTask(pi, ti)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" className="mt-4" onClick={addPhase}><Plus className="mr-2 h-4 w-4" /> Add phase</Button>
    </div>
  )
}
