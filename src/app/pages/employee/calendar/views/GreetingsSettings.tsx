import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { GREETINGS_KEY } from '@constants/configurations-key'
import { fetchConfiguration, createNewConfiguration, updateConfigurationById } from '@services/company'
import { sendBirthdayCardTest } from '@services/employee'
import { safeJsonParse } from '@utils/safeJson'
import Loader from '@app/modules/common/utils/Loader'
import {
  GlassCard, SettingsSection, StatusBadge, TRIO, WtButton, WtField, WtSwitchField,
} from '@app/modules/common/components/ui'
import { AppIcon } from '@app/modules/common/components/ui/AppIcon'
import { errorConfirmation, successConfirmation } from '@utils/modal'

/**
 * Greetings — the automated birthday card, and who gets it.
 *
 * A sibling tab to Event Display rather than more controls on its cards, and the
 * distinction is not cosmetic. Those settings decide what is DRAWN on a calendar and can
 * be undone by unticking them. This one decides what is MAILED to people, and an email
 * cannot be recalled. Putting "show it in pink" and "write to two hundred people" in the
 * same card would be inviting one to be mistaken for the other.
 *
 * Everything here lives in a single feature-configuration row keyed `greetings`, because
 * it is a single form saved together.
 */

interface GreetingSettings {
  enabled: boolean
  /** `HH:mm`. Quarter hours only — see `TIME_OPTIONS`. */
  sendTime: string
  includeEmployees: boolean
  includeContacts: boolean
  /** The line printed on the card itself. */
  cardMessage: string
  /** Email subject. `{name}` is substituted. */
  emailSubject: string
  /** The line above the card in the email. `{name}` and `{organization}` are substituted. */
  emailIntro: string
}

/**
 * Matches the backend's own defaults, and the wording has to match exactly.
 *
 * These are shown as PLACEHOLDERS rather than pre-filled values, which is what makes an
 * empty box mean "use the default" on both sides. That is the whole undo story for this
 * form: clear the field and the original text comes back, so there is no reset button to
 * build and no way to send a card with an empty message.
 */
const DEFAULTS: GreetingSettings = {
  enabled: false,
  sendTime: '10:00',
  includeEmployees: true,
  includeContacts: false,
  cardMessage: 'Wishing you good health, happiness and a year full of success.',
  emailSubject: 'Happy Birthday, {name}!',
  emailIntro: 'Happy birthday, {name} — with warm wishes from everyone at {organization}.',
}

/**
 * Past this the card sets the message smaller to keep it inside the balloons.
 *
 * Not a hard limit, because the card handles overflow by shrinking rather than clipping.
 * It is the point where somebody should know that is happening.
 */
const CARD_MESSAGE_COMFORTABLE = 70

/**
 * Quarter-hour steps, and the reason is the job rather than taste: it wakes every fifteen
 * minutes and sends when the configured time has just passed. Offering minutes it can only
 * round would be offering a precision that does not exist.
 *
 * Labelled in 12-hour time because that is what this product shows dates and times in;
 * the value stored stays 24-hour `HH:mm`.
 */
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4)
  const m = (i % 4) * 15
  const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return { value, label: `${hour12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}` }
})

const timeLabel = (value: string) => TIME_OPTIONS.find((o) => o.value === value)?.label ?? value

function GreetingsSettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [configId, setConfigId] = useState<string | null>(null)
  const [saved, setSaved] = useState<GreetingSettings>(DEFAULTS)
  const [draft, setDraft] = useState<GreetingSettings>(DEFAULTS)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      // A module with no saved row yet makes the GET respond 400 — the same shape the
      // display tab handles. Absent means "never configured", which is the defaults.
      const res = await fetchConfiguration(GREETINGS_KEY).catch(() => null)
      const stored = safeJsonParse(res?.data?.configuration?.configuration || '{}')
      // Text fields keep whatever was stored, INCLUDING empty — an empty box is how the
      // form says "using the default", and the placeholder shows what that is. Coercing
      // to the default here would silently turn a cleared field into an edited one.
      const next: GreetingSettings = {
        enabled: stored.enabled === true,
        sendTime: typeof stored.sendTime === 'string' && stored.sendTime ? stored.sendTime : DEFAULTS.sendTime,
        includeEmployees: stored.includeEmployees !== false,
        includeContacts: stored.includeContacts === true,
        cardMessage: typeof stored.cardMessage === 'string' ? stored.cardMessage : '',
        emailSubject: typeof stored.emailSubject === 'string' ? stored.emailSubject : '',
        emailIntro: typeof stored.emailIntro === 'string' ? stored.emailIntro : '',
      }
      setConfigId(res?.data?.configuration?.id || null)
      setSaved(next)
      setDraft(next)
    } catch (error) {
      console.error('Error loading greeting settings:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const dirty = useMemo(
    () => (Object.keys(draft) as (keyof GreetingSettings)[]).some((k) => draft[k] !== saved[k]),
    [draft, saved],
  )

  /** Nobody chosen means nobody greeted — worth saying before it is saved, not after. */
  const noRecipients = draft.enabled && !draft.includeEmployees && !draft.includeContacts

  const set = <K extends keyof GreetingSettings>(key: K, value: GreetingSettings[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  const save = async () => {
    setSaving(true)
    try {
      const configuration = { ...draft }
      if (configId) {
        await updateConfigurationById(configId, { module: GREETINGS_KEY, configuration })
      } else {
        const created = await createNewConfiguration({ module: GREETINGS_KEY, configuration })
        setConfigId(created?.data?.configuration?.id || null)
      }
      setSaved(draft)
      successConfirmation(draft.enabled ? 'Birthday greetings are on' : 'Birthday greetings are off')
    } catch (error) {
      console.error('Error saving greeting settings:', error)
      errorConfirmation('Could not save these settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Sends the card to the person pressing the button, using their own record.
   *
   * It does not depend on the settings above, saved or not — the point is to see the mail
   * itself, and needing to switch the feature on first would mean the only way to check
   * the email is to risk sending it to everybody.
   */
  const sendTest = async () => {
    setTesting(true)
    try {
      const sentTo = await sendBirthdayCardTest()
      successConfirmation(`Test card sent to ${sentTo}`)
    } catch (error: any) {
      console.error('Error sending test card:', error)
      errorConfirmation(
        error?.response?.data?.message
        || 'Could not send the test card. Check that your account has an email address on file.',
      )
    } finally {
      setTesting(false)
    }
  }

  if (isLoading) return <Loader />

  /**
   * What the settings will actually do, in a sentence.
   *
   * The Event Display cards preview the chip they paint on the calendar. The equivalent
   * here is the consequence, stated plainly, because the consequence is mail to real
   * people and it is the one thing a row of switches does not make obvious.
   */
  const summary = !draft.enabled
    ? 'No greetings are sent. Birthdays still appear on the calendar.'
    : noRecipients
      ? 'Nobody will be greeted. Choose at least one group below.'
      : `Every day at ${timeLabel(draft.sendTime)}, anyone ${[
        draft.includeEmployees ? 'on the active roster' : null,
        draft.includeContacts ? 'in your contacts' : null,
      ].filter(Boolean).join(' or ')} whose birthday it is gets the card by email. Each person is greeted once a year.`

  return (
    <Box className="cfg-fade-in" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <SettingsSection
        tone={TRIO.amber}
        icon="gift"
        title="Birthday greetings"
        description="Email the birthday card automatically on the day."
        action={
          <StatusBadge
            trio={saved.enabled ? TRIO.green : TRIO.slate}
            label={saved.enabled ? `On · ${timeLabel(saved.sendTime)}` : 'Off'}
          />
        }
      >
        <GlassCard preset="tile" sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <WtSwitchField
            title="Send birthday cards automatically"
            description="The same card you can preview from the calendar, sent as an email."
            checked={draft.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
          />

          <Box sx={{ maxWidth: 260 }}>
            <WtField
              label="Send at"
              value={draft.sendTime}
              onChange={(v) => set('sendTime', v)}
              options={TIME_OPTIONS}
              disabled={!draft.enabled}
              hint="On the India (IST) clock."
            />
          </Box>

          <Stack spacing={1}>
            <WtSwitchField
              title="Current employees"
              description="Everyone on the active roster, at their company address where they have one."
              checked={draft.includeEmployees}
              disabled={!draft.enabled}
              onChange={(e) => set('includeEmployees', e.target.checked)}
            />
            <WtSwitchField
              title="External contacts"
              description="Client, vendor and partner contacts with a birthday and an email on file."
              checked={draft.includeContacts}
              disabled={!draft.enabled}
              onChange={(e) => set('includeContacts', e.target.checked)}
            />
          </Stack>

          <Stack spacing={1.75} sx={{ pt: 0.5 }}>
            <WtField
              label="Message on the card"
              value={draft.cardMessage}
              onChange={(v) => set('cardMessage', v)}
              placeholder={DEFAULTS.cardMessage}
              multiline
              minRows={2}
              fullWidth
              hint={
                draft.cardMessage.length > CARD_MESSAGE_COMFORTABLE
                  ? `${draft.cardMessage.length} characters. Longer messages are set smaller to stay inside the card.`
                  : 'Printed under the role ribbon. Leave empty to use the default.'
              }
            />
            <WtField
              label="Email subject"
              value={draft.emailSubject}
              onChange={(v) => set('emailSubject', v)}
              placeholder={DEFAULTS.emailSubject}
              fullWidth
              hint="Write {name} where the person's name should go."
            />
            <WtField
              label="Line above the card in the email"
              value={draft.emailIntro}
              onChange={(v) => set('emailIntro', v)}
              multiline
              minRows={2}
              placeholder={DEFAULTS.emailIntro}
              fullWidth
              hint="Write {name} or {organization} to fill those in. This is what shows in the inbox preview."
            />
          </Stack>

          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: noRecipients ? 'warning.main' : 'divider',
              bgcolor: noRecipients ? 'warning.light' : 'action.hover',
            }}
          >
            <Typography sx={{ fontSize: 13.5, lineHeight: 1.6, color: 'text.primary' }}>
              {summary}
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.25} justifyContent="flex-end">
            <WtButton
              ghost
              onClick={sendTest}
              disabled={testing}
              startIcon={<AppIcon name="bi-envelope" />}
            >
              {testing ? 'sending…' : 'send me a test'}
            </WtButton>
            <WtButton flat onClick={save} disabled={!dirty || saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </WtButton>
          </Stack>
        </GlassCard>
      </SettingsSection>

      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', px: 0.5 }}>
        Work and marriage anniversaries appear on the calendar but are not emailed yet.
      </Typography>
    </Box>
  )
}

export default GreetingsSettings
