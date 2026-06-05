import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateProfile } from './useSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const NOTIFICATION_EVENTS = [
  { key: 'new_lead', label: 'New lead submitted' },
  { key: 'proposal_viewed', label: 'Proposal viewed' },
  { key: 'contract_signed', label: 'Contract signed' },
  { key: 'payment_failed', label: 'Payment failed' },
  { key: 'stale_deals', label: 'Stale deal reminders' },
] as const

export default function ProfilePage() {
  const { profile, authUser } = useAuth()
  const update = useUpdateProfile(authUser?.id ?? '')

  const [fullName, setFullName] = useState('')
  const [calendarUrl, setCalendarUrl] = useState('')
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name ?? '')
    setCalendarUrl(profile.calendar_url ?? '')
    setPrefs((profile.notification_prefs as Record<string, boolean> | null) ?? {})
  }, [profile])

  if (!profile) return null

  async function handleSave() {
    try {
      await update.mutateAsync({
        full_name: fullName.trim(),
        calendar_url: calendarUrl.trim() || null,
        notification_prefs: prefs,
      })
      toast.success('Profile saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    }
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold">Profile</h2>

      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label>Full name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={profile.email} disabled />
        </div>
        <div className="space-y-1.5">
          <Label>Calendar URL</Label>
          <Input value={calendarUrl} onChange={(e) => setCalendarUrl(e.target.value)} placeholder="https://cal.com/you" />
        </div>

        <div>
          <Label>Email notifications</Label>
          <div className="mt-2 space-y-2 rounded-md border p-3">
            {NOTIFICATION_EVENTS.map((ev) => (
              <div key={ev.key} className="flex items-center justify-between">
                <span className="text-sm">{ev.label}</span>
                <Switch
                  checked={!!prefs[ev.key]}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, [ev.key]: v }))}
                />
              </div>
            ))}
          </div>
        </div>

        <Button onClick={() => void handleSave()} disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </div>
  )
}
