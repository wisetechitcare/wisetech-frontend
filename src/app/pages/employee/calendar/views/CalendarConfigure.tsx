import { useEffect, useState } from 'react'
import { Box, Typography, useTheme } from '@mui/material'
import { alpha } from '@mui/material/styles'
import RenameHoliday from './RenameHoliday'
import WeekendsAndWorkingDays from './WeekendsAndWorkingDays'
import {
  SHOW_BIRTHDAYS_INTERNAL,
  SHOW_BIRTHDAYS_INTERNAL_INACTIVE,
  SHOW_BIRTHDAYS_EXTERNAL,
  SHOW_ANNIVERSARIES_INTERNAL,
  SHOW_ANNIVERSARIES_INTERNAL_INACTIVE,
  SHOW_ANNIVERSARIES_EXTERNAL,
  SHOW_MARRIAGE_ANNIVERSARY_INTERNAL,
  SHOW_MARRIAGE_ANNIVERSARY_INTERNAL_INACTIVE,
  SHOW_MARRIAGE_ANNIVERSARY_EXTERNAL,
  SHOW_SATURDAY_ON_CALENDAR,
  SHOW_SUNDAY_ON_CALENDAR,
  SHOW_MEETINGS_ON_CALENDAR,
  SHOW_HOLIDAYS_ON_CALENDAR
} from '@constants/configurations-key'
import { fetchConfiguration } from '@services/company'
import { safeJsonParse } from '@utils/safeJson'
import Loader from '@app/modules/common/utils/Loader'
import CalendarConfigForm, { CalendarConfigItem } from './CalendarConfigForm'
import { KTIcon } from '@metronic/helpers'
import { ConfigPageLayout, C } from '@app/modules/configuration'
import type { ConfigTab } from '@app/modules/configuration'
import {
  AutoGrid, GlassCard, SettingsSection, StatusBadge, TRIO, type Trio,
} from '@app/modules/common/components/ui'

const TABS: ConfigTab[] = [
  { id: 'display', label: 'Event Display', icon: 'bi-palette' },
  { id: 'holidays', label: 'Public Holidays', icon: 'bi-calendar-heart' },
  { id: 'weekends', label: 'Weekends & Working Days', icon: 'bi-calendar-week' },
]

// ─── Catalogue ──────────────────────────────────────────────────────────────
// Every card on this tab is the same three decisions — show it, what colour,
// what icon — for a different slice of the calendar. Describing them as data
// keeps the copy, the defaults and the order in one readable place instead of
// thirteen hand-written blocks that drifted apart.

interface EventItem {
  /** Configuration module key — also the settings-map key. */
  key: string
  label: string
  desc: string
  /** The title this setting actually produces on the calendar (see CustomCalendar). */
  sample: string
  defaultColor: string
  /** Public holidays always showed historically, so they start on. */
  defaultEnabled?: boolean
}

interface EventSection {
  id: string
  tone: Trio
  icon: string
  title: string
  desc: string
  items: EventItem[]
}

const SECTIONS: EventSection[] = [
  {
    id: 'birthdays', tone: TRIO.amber, icon: 'gift',
    title: 'Birthdays', desc: 'Whose birthdays land on the calendar.',
    items: [
      { key: SHOW_BIRTHDAYS_INTERNAL, label: 'Current employees', desc: 'Everyone on the active roster.', sample: "[Name]'s Birthday", defaultColor: '#E91E63' },
      { key: SHOW_BIRTHDAYS_INTERNAL_INACTIVE, label: 'Former employees', desc: 'People who have since left the company.', sample: "[Name]'s Birthday (Inactive Employee)", defaultColor: '#E91E63' },
      { key: SHOW_BIRTHDAYS_EXTERNAL, label: 'External contacts', desc: 'Client, vendor and partner contacts.', sample: "[Name]'s Birthday", defaultColor: '#0288D1' },
    ],
  },
  {
    id: 'work', tone: TRIO.purple, icon: 'award',
    title: 'Work Anniversaries', desc: 'Whose joining date is marked each year.',
    items: [
      { key: SHOW_ANNIVERSARIES_INTERNAL, label: 'Current employees', desc: 'Everyone on the active roster.', sample: "[Name]'s Work Anniversary", defaultColor: '#9C27B0' },
      { key: SHOW_ANNIVERSARIES_INTERNAL_INACTIVE, label: 'Former employees', desc: 'People who have since left the company.', sample: "[Name]'s Work Anniversary (Inactive Employee)", defaultColor: '#9C27B0' },
      { key: SHOW_ANNIVERSARIES_EXTERNAL, label: 'External contacts', desc: 'Client, vendor and partner contacts.', sample: "[Name]'s Anniversary", defaultColor: '#F57C00' },
    ],
  },
  {
    id: 'marriage', tone: TRIO.rose, icon: 'heart',
    title: 'Marriage Anniversaries', desc: 'Whose wedding anniversary is marked each year.',
    items: [
      { key: SHOW_MARRIAGE_ANNIVERSARY_INTERNAL, label: 'Current employees', desc: 'Everyone on the active roster.', sample: "[Name]'s Marriage Anniversary", defaultColor: '#E64980' },
      { key: SHOW_MARRIAGE_ANNIVERSARY_INTERNAL_INACTIVE, label: 'Former employees', desc: 'People who have since left the company.', sample: "[Name]'s Marriage Anniversary (Inactive Employee)", defaultColor: '#E64980' },
      { key: SHOW_MARRIAGE_ANNIVERSARY_EXTERNAL, label: 'External contacts', desc: 'Client, vendor and partner contacts.', sample: "[Name]'s Marriage Anniversary", defaultColor: '#AE3EC9' },
    ],
  },
  {
    id: 'weekend', tone: TRIO.cyan, icon: 'calendar-8',
    title: 'Weekend Display', desc: 'How Saturdays and Sundays are highlighted.',
    items: [
      { key: SHOW_SATURDAY_ON_CALENDAR, label: 'Saturday', desc: 'Marks every Saturday on the month grid.', sample: 'Saturday', defaultColor: '#FFB300' },
      { key: SHOW_SUNDAY_ON_CALENDAR, label: 'Sunday', desc: 'Marks every Sunday on the month grid.', sample: 'Sunday', defaultColor: '#F44336' },
    ],
  },
  {
    id: 'meetings', tone: TRIO.blue, icon: 'people',
    title: 'Meetings', desc: 'Whether scheduled meetings show as calendar events.',
    items: [
      { key: SHOW_MEETINGS_ON_CALENDAR, label: 'Team meetings', desc: 'Meetings you organise or are invited to.', sample: '[Meeting title]', defaultColor: '#2196F3' },
    ],
  },
  {
    id: 'holidays', tone: TRIO.green, icon: 'flag',
    title: 'Public Holidays', desc: 'How public holidays appear on the workspace calendar.',
    items: [
      { key: SHOW_HOLIDAYS_ON_CALENDAR, label: 'Public holidays', desc: 'Holidays from the list on the Public Holidays tab.', sample: '[Holiday name]', defaultColor: '#1E3A8A', defaultEnabled: true },
    ],
  },
]

const ALL_ITEMS = SECTIONS.flatMap((s) => s.items)

const defaultSettings = (): Record<string, CalendarConfigItem> =>
  Object.fromEntries(ALL_ITEMS.map((i) => [i.key, {
    id: null, enabled: i.defaultEnabled ?? false, color: i.defaultColor, icon: '',
  }]))

/** Modal + toast title, e.g. "Birthdays — Former employees". */
const settingTitle = (section: EventSection, item: EventItem) =>
  section.title.toLowerCase() === item.label.toLowerCase()
    ? section.title
    : `${section.title} — ${item.label}`

// ─── Sub-components ─────────────────────────────────────────────────────────

/** The configured icon: a system keenicon (`kt:name`), an image URL, or a plain dot. */
function EventGlyph({ icon, color }: { icon?: string; color: string }) {
  if (!icon) return <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: color, flexShrink: 0 }} />
  if (icon.startsWith('kt:')) {
    return (
      <Box sx={{ color, display: 'inline-flex', flexShrink: 0 }}>
        <KTIcon iconName={icon.slice(3)} className="fs-5" />
      </Box>
    )
  }
  return <Box component="img" src={icon} alt="" sx={{ width: 15, height: 15, objectFit: 'contain', flexShrink: 0 }} />
}

/**
 * The point of the card: what this setting looks like on the calendar itself.
 * Colour and icon are the only things that differ between these settings, and
 * as a 20px swatch in a corner they were the least visible thing on the card —
 * here they ARE the card, rendered as the event chip they produce.
 */
function EventPreview({ setting, sample }: { setting: CalendarConfigItem; sample: string }) {
  const dark = useTheme().palette.mode === 'dark'
  const base = {
    display: 'flex', alignItems: 'center', gap: 0.875, px: 1.25, py: 0.875,
    borderRadius: '9px', minWidth: 0,
  }

  if (!setting.enabled) {
    return (
      <Box sx={{ ...base, border: '1px dashed', borderColor: 'divider', color: 'text.disabled' }}>
        <KTIcon iconName="eye-slash" className="fs-6" />
        <Typography component="span" noWrap sx={{ fontSize: 12, fontWeight: 600 }}>
          Not shown on the calendar
        </Typography>
      </Box>
    )
  }
  return (
    <Box sx={{
      ...base,
      bgcolor: alpha(setting.color, dark ? 0.26 : 0.11),
      borderLeft: `3px solid ${setting.color}`,
      borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px',
    }}>
      <EventGlyph icon={setting.icon} color={setting.color} />
      <Typography component="span" noWrap sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary' }}>
        {sample}
      </Typography>
    </Box>
  )
}

function EventSettingCard({ item, setting, tone, onOpen }: {
  item: EventItem; setting: CalendarConfigItem; tone: Trio; onOpen: () => void
}) {
  return (
    <GlassCard
      preset="tile"
      interactive
      component="button"
      onClick={onOpen}
      aria-label={`Configure ${item.label}`}
      sx={{
        p: 1.75, width: '100%', textAlign: 'left', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 1.25,
        '&:focus-visible': { outline: `2px solid ${tone.c}`, outlineOffset: 2 },
        '&:hover .cfg-go': { color: tone.c },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography component="span" sx={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
          {item.label}
        </Typography>
        <Typography component="span" sx={{ display: 'block', fontSize: 12.5, color: 'text.secondary', lineHeight: 1.45, mt: 0.25 }}>
          {item.desc}
        </Typography>
      </Box>

      <EventPreview setting={setting} sample={item.sample} />

      {/* mt:auto pins the affordance so cards in a row end level regardless of copy length. */}
      <Box className="cfg-go" sx={{
        mt: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5,
        color: 'text.secondary', transition: 'color .15s ease',
      }}>
        <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 700, color: 'inherit' }}>Configure</Typography>
        <KTIcon iconName="arrow-right" className="fs-7" />
      </Box>
    </GlassCard>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

function CalendarConfigure() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('display');
  const [settings, setSettings] = useState<Record<string, CalendarConfigItem>>(defaultSettings);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [editingModuleKey, setEditingModuleKey] = useState('');
  const [editingSetting, setEditingSetting] = useState<CalendarConfigItem | null>(null);

  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      // A module with no saved row yet makes the GET endpoint respond 400. With a bare
      // Promise.all, that single rejection discards EVERY result — so one un-configured
      // module would wipe all the already-saved settings back to their disabled defaults
      // on each reload. Catch per request so missing modules fall back to defaults while
      // the saved ones load correctly.
      const entries = await Promise.all(ALL_ITEMS.map(async (item) => {
        const res = await fetchConfiguration(item.key).catch(() => null);
        const config = safeJsonParse(res?.data?.configuration?.configuration || '{}');
        return [item.key, {
          id: res?.data?.configuration?.id || null,
          enabled: config.enabled ?? (item.defaultEnabled ?? false),
          color: config.color || item.defaultColor,
          icon: config.icon || '',
        }] as const;
      }));
      setSettings(Object.fromEntries(entries));
    } catch (error) {
      console.error("Error loading configurations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const openEditModal = (section: EventSection, item: EventItem) => {
    setEditingModuleKey(item.key);
    setModalTitle(settingTitle(section, item));
    setEditingSetting(settings[item.key]);
    setShowModal(true);
  };

  const handleSaveSuccess = (updatedSetting: CalendarConfigItem) => {
    setSettings((prev) => ({ ...prev, [editingModuleKey]: updatedSetting }));
    setShowModal(false);
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <Box className="cfg-fade-in" sx={{ py: 3, backgroundColor: C.bgPage }}>
        <ConfigPageLayout
          title="Calendar Configuration"
          subtitle="Manage event visibility, public holidays and weekend schedules"
          icon="bi-calendar3"
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB: Event Display */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === 'display' && (
            <Box key="display" className="cfg-fade-in" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {SECTIONS.map((section) => {
                const shown = section.items.filter((i) => settings[i.key]?.enabled).length;
                // The count is the section's own state, so it is worth the header slot:
                // "1 of 3 on calendar" answers the question the cards below are there to answer.
                const summary = section.items.length === 1
                  ? (shown ? 'On calendar' : 'Hidden')
                  : `${shown} of ${section.items.length} on calendar`;
                return (
                  <SettingsSection
                    key={section.id}
                    tone={section.tone}
                    icon={section.icon}
                    title={section.title}
                    description={section.desc}
                    action={<StatusBadge trio={shown ? TRIO.green : TRIO.slate} label={summary} />}
                  >
                    <AutoGrid min={264} gap={12}>
                      {section.items.map((item) => (
                        <EventSettingCard
                          key={item.key}
                          item={item}
                          tone={section.tone}
                          setting={settings[item.key]}
                          onOpen={() => openEditModal(section, item)}
                        />
                      ))}
                    </AutoGrid>
                  </SettingsSection>
                );
              })}
            </Box>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB: Public Holidays */}
          {/* ══════════════════════════════════════════════════════ */}
          {activeTab === 'holidays' && (
            <div key="holidays" className="cfg-fade-in">
              <RenameHoliday />
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* TAB: Weekends & Working Days */}
          {/* ══════════════════════════════════════════════════════ */}
          {/* A Work Calendar row used to sit under this tab. Removed: nothing in the app
              could create a WorkCalendar, so its modal could only ever say "Nothing to
              configure". The weekly pattern lives on the branch (Weekends & Working Days)
              and one-off off-days are rows on the Holidays screen. */}
          {activeTab === 'weekends' && (
            <div key="weekends" className="cfg-fade-in">
              <WeekendsAndWorkingDays />
            </div>
          )}
        </ConfigPageLayout>
      </Box>

      {/* Reusable Form Modal */}
      <CalendarConfigForm
        show={showModal}
        onClose={() => setShowModal(false)}
        initialData={editingSetting}
        moduleKey={editingModuleKey}
        title={modalTitle}
        onSuccess={handleSaveSuccess}
      />
    </>
  )
}

export default CalendarConfigure
