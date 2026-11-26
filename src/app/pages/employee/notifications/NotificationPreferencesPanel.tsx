import { useCallback, useEffect, useState } from 'react'
import { Switch } from '@/ds/ui/switch'
import { Label } from '@/ds/ui/label'
import { Button } from '@/ds/ui/button'
import { NumberField } from '@/ds/ui/number-field'
import {
  fetchNotificationPreferences,
  resetNotificationPreferences,
  saveNotificationPreferences,
  type EmployeeNotificationPrefs,
  type ReminderCategoryKey,
  type ReminderChannel,
} from '@/services/notificationPreferences'

const CHANNELS: { key: ReminderChannel; label: string }[] = [
  { key: 'inApp', label: 'In-app bell' },
  { key: 'push', label: 'Browser / PWA push' },
  { key: 'sms', label: 'SMS (missing checkout)' },
  { key: 'whatsapp', label: 'WhatsApp (missing checkout)' },
]

const CATEGORIES: { key: ReminderCategoryKey; label: string }[] = [
  { key: 'earlyCheckin', label: 'Early check-in tip' },
  { key: 'checkinReminder', label: 'Shift-start check-in' },
  { key: 'lateWarning', label: 'Late-mark warning' },
  { key: 'checkoutReminder', label: 'Shift-end check-out' },
  { key: 'missingCheckout', label: 'Missing check-out alert' },
]

function emptyPrefs(): EmployeeNotificationPrefs {
  return { mutedUntil: null, quietHours: null, channels: {}, categories: {}, product: {} }
}

function minutesToHour(m: number | undefined): number {
  if (m === undefined || !Number.isFinite(m)) return 22
  return Math.floor((((m % 1440) + 1440) % 1440) / 60)
}

export function NotificationPreferencesPanel() {
  const [prefs, setPrefs] = useState<EmployeeNotificationPrefs>(emptyPrefs)
  const [quietEnabled, setQuietEnabled] = useState(false)
  const [quietStartHour, setQuietStartHour] = useState(22)
  const [quietEndHour, setQuietEndHour] = useState(7)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setMessage(null)
    try {
      const data = await fetchNotificationPreferences()
      setPrefs({
        mutedUntil: data.mutedUntil ?? null,
        quietHours: data.quietHours ?? null,
        channels: data.channels ?? {},
        categories: data.categories ?? {},
        product: data.product ?? {},
      })
      if (data.quietHours) {
        setQuietEnabled(true)
        setQuietStartHour(minutesToHour(data.quietHours.startMinutes))
        setQuietEndHour(minutesToHour(data.quietHours.endMinutes))
      } else {
        setQuietEnabled(false)
      }
    } catch {
      setMessage('Could not load preferences.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const channelOn = (key: ReminderChannel) => prefs.channels[key] !== false
  const categoryOn = (key: ReminderCategoryKey) => prefs.categories[key]?.enabled !== false
  const productOn = (key: 'managerLeaveDigest' | 'birthdayGreetings') =>
    prefs.product[key] !== false

  const setChannel = (key: ReminderChannel, on: boolean) => {
    setPrefs((p) => ({ ...p, channels: { ...p.channels, [key]: on } }))
  }

  const setCategory = (key: ReminderCategoryKey, on: boolean) => {
    setPrefs((p) => ({
      ...p,
      categories: {
        ...p.categories,
        [key]: { ...p.categories[key], enabled: on },
      },
    }))
  }

  const setProduct = (key: 'managerLeaveDigest' | 'birthdayGreetings', on: boolean) => {
    setPrefs((p) => ({ ...p, product: { ...p.product, [key]: on } }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const next: EmployeeNotificationPrefs = {
        ...prefs,
        quietHours: quietEnabled
          ? {
              startMinutes: quietStartHour * 60,
              endMinutes: quietEndHour * 60,
            }
          : null,
        product: prefs.product ?? {},
      }
      const saved = await saveNotificationPreferences(next)
      setPrefs({ ...emptyPrefs(), ...saved, product: saved.product ?? {} })
      setMessage('Preferences saved.')
    } catch {
      setMessage('Save failed. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const saved = await resetNotificationPreferences()
      setPrefs({ ...emptyPrefs(), ...saved, product: saved.product ?? {} })
      setQuietEnabled(false)
      setMessage('Preferences reset to company defaults.')
    } catch {
      setMessage('Reset failed. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading preferences…</p>
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Mute attendance reminders, digests, and greetings. Late-mark, salary deduction, pay, and
        security alerts are never muted. Browser / PWA push is the native mobile path — there is no
        separate App Store / Play Store push channel.
      </p>

      <section className="flex flex-col gap-3">
        <h3 className="heading-case text-xs font-semibold text-muted-foreground">Channels</h3>
        {CHANNELS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <Switch
              id={`ch-${key}`}
              checked={channelOn(key)}
              onCheckedChange={(v) => setChannel(key, !!v)}
            />
            <Label htmlFor={`ch-${key}`}>{label}</Label>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="heading-case text-xs font-semibold text-muted-foreground">Reminder types</h3>
        {CATEGORIES.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <Switch
              id={`cat-${key}`}
              checked={categoryOn(key)}
              onCheckedChange={(v) => setCategory(key, !!v)}
            />
            <Label htmlFor={`cat-${key}`}>{label}</Label>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="heading-case text-xs font-semibold text-muted-foreground">
          Digests and greetings
        </h3>
        <div className="flex items-center gap-3">
          <Switch
            id="prod-leave-digest"
            checked={productOn('managerLeaveDigest')}
            onCheckedChange={(v) => setProduct('managerLeaveDigest', !!v)}
          />
          <Label htmlFor="prod-leave-digest">Manager leave digest email</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="prod-birthday"
            checked={productOn('birthdayGreetings')}
            onCheckedChange={(v) => setProduct('birthdayGreetings', !!v)}
          />
          <Label htmlFor="prod-birthday">Birthday greeting emails</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Slack / Teams digest delivery is company-configured later (not a personal toggle).
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Switch id="quiet" checked={quietEnabled} onCheckedChange={(v) => setQuietEnabled(!!v)} />
          <Label htmlFor="quiet">Quiet hours (no attendance reminders)</Label>
        </div>
        {quietEnabled ? (
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Starts (hour 0–23)"
              value={quietStartHour}
              minValue={0}
              maxValue={23}
              onChange={(v) => setQuietStartHour(typeof v === 'number' ? v : 22)}
            />
            <NumberField
              label="Ends (hour 0–23)"
              value={quietEndHour}
              minValue={0}
              maxValue={23}
              onChange={(v) => setQuietEndHour(typeof v === 'number' ? v : 7)}
            />
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Saving…' : 'Save preferences'}
        </Button>
        <Button type="button" variant="outline" onClick={() => void handleReset()} disabled={saving}>
          Reset to defaults
        </Button>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  )
}
