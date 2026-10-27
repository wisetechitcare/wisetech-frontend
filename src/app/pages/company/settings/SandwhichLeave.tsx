import { useEffect, useState } from "react";
import {
  DialogContent,
  Tooltip,
  CircularProgress, Box, Stack, Typography,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
  createNewConfiguration,
  fetchConfiguration,
  updateConfigurationById,
} from "@services/company";
import {
  fetchSandwichRules,
  createSandwichRule,
  updateSandwichRule,
  deleteSandwichRule,
  reorderSandwichRules,
  fetchSandwichRuleAuditLog,
  SandwichRule,
  SandwichRulePattern,
  SandwichRuleAuditLogEntry,
} from "@services/sandwichRule";
import ReorderableGroup from "@app/modules/common/components/ReorderableGroup";
import { successConfirmation, errorConfirmation } from "@utils/modal";
import { DATE_SETTINGS_KEY } from "@constants/configurations-key";
import { getSocket } from "@utils/socketClient";
import { safeJsonParse } from "@utils/safeJson";
// Shared UI kit — FormSection / GlassDialogActions / SettingsSection / WtEmptyState
// are the public chrome; day-strip + RuleRow stay domain-local.
import {
  WtButton, WtSwitch, WtField, WtCheckboxField, WtControlLabel,
  GlassSurface, GlassDialog, GlassHeader, GlassDialogActions,
  FormSection, FORM_SPACE, SettingsSection, WtEmptyState,
  ActionIconButton, trioToActionTone,
  TRIO, EASE_200, SHADOW_HOVER, StatusBadge, StatTile, Eyebrow,
  type Trio,
} from "@app/modules/common/components/ui";

interface SandwichLeaveProps {
  /** Controls the (now self-contained) glass dialog's visibility. */
  open: boolean;
  showSandWhichLeaveModal: (visible: boolean) => void;
  readOnly?: boolean;  // When true, disables all inputs and hides mutating actions
}

// Tone palette, motion constants and the tile/badge primitives are imported from the shared
// kit (see the import above) — they used to be re-declared here, which is how this screen
// ended up hardcoding light-mode hex and going unreadable in dark mode.

// CTAs / row actions come from WtButton + ActionIconButton — do not re-declare them locally.

const DEFAULT_PATTERN: SandwichRulePattern = {
  runLength: 1,
  interiorDayType: 'any',
  leadingRequired: true,
  leadingPaidCondition: 'any',
  trailingRequired: true,
  trailingPaidCondition: 'any',
  excludeInteriorDaysFromSalary: false,
  excludeLeadingDayFromSalary: false,
  excludeTrailingDayFromSalary: false,
};


// ─── Visual pattern strip ───────────────────────────────────────────────────────────────────
// A sandwich rule IS a left-to-right sequence of days, so it renders as one. Every tile reads
// straight off `rule.pattern` (never a separate lookup), so what the admin sees cannot drift from
// what the payroll engine does (SANDWICH_RULES.md §13 v6.0). Scrolls horizontally on phones.

type TileStatus = 'counts' | 'excluded' | 'any';

const STATUS_TRIO: Record<TileStatus, { trio: Trio; label: string }> = {
  counts:   { trio: TRIO.green, label: 'Counts' },
  excluded: { trio: TRIO.rose,  label: 'Excluded' },
  any:      { trio: TRIO.slate, label: 'Any' },
};

// 'any' renders as "Any" — "Paid / Unpaid" truncated inside the tiles.
const condLabel = (c: 'paid' | 'unpaid' | 'any') => (c === 'paid' ? 'Paid' : c === 'unpaid' ? 'Unpaid' : 'Any');
// Interior off-day tiles always read "OFF-DAY" as the eyebrow with the specific type as the value
// line, so every tile in the strip carries the same three-line anatomy (eyebrow · value · status)
// and no tile renders hollow next to its neighbours in the 2-up mobile grid.
const interiorMeta = (t?: 'holiday' | 'weekend' | 'any') =>
  t === 'holiday' ? { icon: 'auto-brightness', typeLabel: 'Holiday' }
  : t === 'weekend' ? { icon: 'night-day', typeLabel: 'Weekend' }
  : { icon: 'calendar-2', typeLabel: 'Any day' };

// Icon-left tile (per user preference): a miniature of the salary meta-tile anatomy — glyph on
// the left, eyebrow-over-value text column on the right, status line beneath. Shorter and quicker
// to scan than the earlier center-stacked layout.
function DayTile({ role, icon, cond, status }: { role: string; icon: string; cond?: string; status: TileStatus }) {
  const { trio, label } = STATUS_TRIO[status];
  return (
    <Box sx={{
      // Below md: 2-up grid. ≥md: the strip owns the full card width, so tiles fatten (max 280
      // each) into a single generous row; wrap only remains as an extreme-narrow safety net.
      minWidth: { xs: 0, md: 126 }, flex: { xs: '1 1 calc(50% - 8px)', md: '1 0 126px' },
      maxWidth: { xs: 'none', md: 280 }, borderRadius: '10px', border: `1px solid ${trio.bd}`,
      bgcolor: trio.bg, overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <Box sx={{ height: 3, bgcolor: trio.c, flexShrink: 0 }} />
      {/* flex:1 keeps two-line tiles (no condition, e.g. interior days) vertically centered.
          On desktop the icon+text group centers horizontally and the type scales up a notch so
          the now-wide tiles read filled instead of hollow-left. */}
      <Stack direction="row" alignItems="center" sx={{
        px: { xs: 1.25, md: 2 }, py: { xs: 1.1, md: 1.25 }, gap: { xs: 1, md: 1.25 },
        minWidth: 0, flex: 1, justifyContent: { xs: 'flex-start', md: 'center' },
      }}>
        {/* Tile text stays FIXED dark — the chip bg is an opaque light pastel in both themes, so
            theme-aware (white-in-dark) text would be illegible here. */}
        <Box sx={{ color: trio.c, lineHeight: 0, flexShrink: 0 }}><KTIcon iconName={icon} className="fs-2" /></Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: { xs: 11, md: 11.5 }, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', lineHeight: 1.3 }}>{role}</Typography>
          {cond && (
            <Typography noWrap sx={{ fontSize: { xs: 13.5, md: 14 }, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{cond}</Typography>
          )}
          <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mt: 0.35 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: 999, bgcolor: trio.c, flexShrink: 0 }} />
            <Typography noWrap sx={{ fontSize: { xs: 11, md: 11.5 }, fontWeight: 700, color: trio.c, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>{label}</Typography>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

function Connector() {
  // Hidden below md — there the tiles wrap into a 2-up grid (no left-to-right flow to connect).
  return (
    <Box sx={{ alignSelf: 'center', flexShrink: 0, color: '#94a3b8', lineHeight: 0, display: { xs: 'none', md: 'flex' } }}>
      <KTIcon iconName="arrow-right" className="fs-4" />
    </Box>
  );
}

function SandwichPatternStrip({ pattern }: { pattern: SandwichRulePattern }) {
  const tiles: React.ReactNode[] = [];
  const push = (node: React.ReactNode) => {
    if (tiles.length) tiles.push(<Connector key={`c${tiles.length}`} />);
    tiles.push(node);
  };

  if (pattern.leadingRequired) {
    push(<DayTile key="lead" role="Leave" icon="profile-user" cond={condLabel(pattern.leadingPaidCondition)}
      status={pattern.excludeLeadingDayFromSalary ? 'excluded' : 'counts'} />);
  } else {
    push(<DayTile key="lead" role="Before" icon="minus-circle" cond="Any" status="any" />);
  }

  const isAny = pattern.runLength === 'any';
  const n = typeof pattern.runLength === 'number' ? Math.max(1, pattern.runLength) : 2;
  const shown = isAny ? 2 : Math.min(n, 3);
  const { icon, typeLabel } = interiorMeta(pattern.interiorDayType);
  for (let i = 0; i < shown; i++) {
    const isLast = i === shown - 1;
    // The last interior tile carries the run-length note ("any length" / "+N more"); the rest carry
    // the off-day type — so every interior tile still has a populated value line (no hollow tiles).
    const runNote = isAny ? (isLast ? 'any length' : undefined) : (isLast && n > shown ? `+${n - shown} more` : undefined);
    push(<DayTile key={`int${i}`} role="Off-day" icon={icon}
      cond={runNote ?? typeLabel}
      status={pattern.excludeInteriorDaysFromSalary ? 'excluded' : 'counts'} />);
  }

  if (pattern.trailingRequired) {
    push(<DayTile key="trail" role="Leave" icon="profile-user" cond={condLabel(pattern.trailingPaidCondition)}
      status={pattern.excludeTrailingDayFromSalary ? 'excluded' : 'counts'} />);
  } else {
    push(<DayTile key="trail" role="After" icon="minus-circle" cond="Any" status="any" />);
  }

  return (
    // Wraps at every width — tiles grow to fill the available line and drop to the next one when
    // tight. Nothing is ever clipped behind a scroll edge or a scrollbar ("completely visible").
    <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1, flexWrap: 'wrap' }}>
      {tiles}
    </Box>
  );
}

function PatternLegend() {
  return (
    <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ gap: 0.75 }}>
      <StatusBadge trio={TRIO.green} label="Counts toward salary" />
      <StatusBadge trio={TRIO.rose} label="Excluded from salary" />
      <StatusBadge trio={TRIO.slate} label="Matches either" />
    </Stack>
  );
}

// ─── Rule row ───────────────────────────────────────────────────────────────────────────────

function RuleRow({ rule, trio, index, readOnly, busy, draggable, onToggle, onEdit, onDelete, onAudit }: {
  rule: SandwichRule; trio: Trio; index: number; readOnly: boolean; busy: boolean;
  draggable: boolean;
  onToggle: () => void; onEdit: () => void; onDelete: () => void; onAudit: () => void;
}) {
  // When draggable, the whole card is the drag target (like the attendance Overview). We
  // stopPropagation of pointerdown on the interactive controls so grabbing a button/toggle acts on
  // it instead of starting a card drag — best of both: drag anywhere, buttons still work.
  const stopDrag = draggable ? { onPointerDown: (e: React.PointerEvent) => e.stopPropagation() } : {};
  return (
    <GlassSurface variant="thin" className="sw-fade-up" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }} sx={{
      borderRadius: '12px', p: 1.5, opacity: busy ? 0.5 : 1, borderColor: 'divider',
      borderLeft: `4px solid ${rule.isEnabled ? trio.c : '#e2e8f0'}`,
      transition: EASE_200,
      '&:hover': { transform: 'translateY(-2px)', boxShadow: SHADOW_HOVER, borderColor: trio.bd, borderLeftColor: rule.isEnabled ? trio.c : '#e2e8f0' },
    }}>
      {/* One anatomy at every width (per user sketch): title + description live in the left column
          so the text block hugs the name, while the action buttons float top-right — the taller
          button row no longer pushes the description down. Then the day-strip spans the full card. */}
      <Stack spacing={1}>
        <Stack direction="row" alignItems="flex-start" sx={{ gap: 1 }}>
          <Stack sx={{ minWidth: 0, flex: 1, rowGap: 0.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ rowGap: 0.5, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: 'text.primary', lineHeight: 1.25 }}>{rule.name}</Typography>
              {/* The status badge IS the enable toggle — click Active↔Inactive (drag-safe, keyboard-
                  accessible). Read-only views get a passive chip (no onClick). */}
              <StatusBadge
                trio={rule.isEnabled ? TRIO.green : TRIO.slate}
                label={rule.isEnabled ? 'Active' : 'Inactive'}
                pulse={rule.isEnabled}
                onClick={readOnly ? undefined : onToggle}
                disabled={busy}
                title={readOnly ? undefined : rule.isEnabled ? 'Click to disable this scenario' : 'Click to enable this scenario'}
              />
            </Stack>
            {rule.description && (
              <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.45 }}>{rule.description}</Typography>
            )}
          </Stack>
          {!readOnly && (
            <Stack direction="row" spacing={{ xs: 0.5, sm: 0.75 }} alignItems="center" sx={{ flexShrink: 0 }} {...stopDrag}>
              <ActionIconButton iconName="time" title="View audit history" tone={trioToActionTone(TRIO.slate)} size="sm" onClick={onAudit} />
              <ActionIconButton iconName="pencil" title="Edit rule" tone={trioToActionTone(TRIO.blue)} size="sm" onClick={onEdit} />
              <ActionIconButton iconName="trash" title="Delete rule" tone={trioToActionTone(TRIO.rose)} size="sm" onClick={onDelete} />
            </Stack>
          )}
        </Stack>

        <SandwichPatternStrip pattern={rule.pattern} />
      </Stack>
    </GlassSurface>
  );
}

// ─── Add/Edit rule dialog ───────────────────────────────────────────────────────────────────

interface RuleFormModalProps {
  show: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingRule: SandwichRule | null;
  defaultCategory?: 'holiday-bridge' | 'weekend-bridge' | 'custom';
}

function RuleFormModal({ show, onClose, onSaved, editingRule, defaultCategory = 'custom' }: RuleFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'holiday-bridge' | 'weekend-bridge' | 'custom'>('custom');
  const [pattern, setPattern] = useState<SandwichRulePattern>(DEFAULT_PATTERN);
  const [isEnabled, setIsEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!show) return;
    if (editingRule) {
      setName(editingRule.name);
      setDescription(editingRule.description ?? '');
      setCategory(editingRule.category);
      setPattern(editingRule.pattern);
      setIsEnabled(editingRule.isEnabled);
    } else {
      setName('');
      setDescription('');
      setCategory(defaultCategory);
      setPattern(DEFAULT_PATTERN);
      setIsEnabled(true);
    }
  }, [show, editingRule, defaultCategory]);

  const handleSave = async () => {
    if (!name.trim()) {
      errorConfirmation('Rule name is required');
      return;
    }
    setSubmitting(true);
    try {
      if (editingRule) {
        await updateSandwichRule(editingRule.id, { name, description, category, pattern, isEnabled });
        await successConfirmation('Rule updated.');
      } else {
        await createSandwichRule({ name, description, category, pattern, isEnabled });
        await successConfirmation('Rule created.');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Failed to save rule');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (patch: Partial<SandwichRulePattern>) => setPattern((p) => ({ ...p, ...patch }));

  return (
    <GlassDialog
      open={show}
      onClose={onClose}
      maxWidth="md"
      preset="form"
      header={
        <GlassHeader
          title={editingRule ? 'Edit Rule' : 'Add Rule'}
          subtitle={editingRule ? `Editing "${editingRule.name}"` : 'Define a new sandwich day-pattern'}
          icon="pencil"
          onClose={onClose}
        />
      }
    >
      <DialogContent
        sx={{
          p: FORM_SPACE.bodyPad,
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
      >
        <Stack spacing={FORM_SPACE.stackGap}>
          <GlassSurface variant="thin" sx={{ p: FORM_SPACE.cardPad, borderRadius: '12px', borderColor: 'divider' }}>
            <Box sx={{ mb: 1 }}><Eyebrow>Live Preview</Eyebrow></Box>
            <SandwichPatternStrip pattern={pattern} />
          </GlassSurface>

          <FormSection tone={TRIO.blue} icon="document" title="Rule Details">
              <WtField
                label="Rule Name"
                required
                value={name}
                onChange={setName}
                placeholder="e.g. Diwali Bridge"
              />
              <WtField
                label="Description (Optional)"
                value={description}
                onChange={setDescription}
                placeholder="What is this rule for?"
                multiline
                minRows={1}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: FORM_SPACE.rowGap, alignItems: 'flex-start' }}>
                <WtField
                  label="Category"
                  value={category}
                  onChange={(v) => setCategory(v as any)}
                  options={[
                    { value: 'custom', label: 'Custom' },
                    { value: 'holiday-bridge', label: 'Holiday-Bridge' },
                    { value: 'weekend-bridge', label: 'Weekend-Bridge' },
                  ]}
                />
                <Box sx={{ minWidth: 0, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                  <WtField
                    type="number"
                    label="Run Length (Interior off-days in the run)"
                    sx={{ flex: '1 1 140px', minWidth: 0 }}
                    value={pattern.runLength === 'any' ? '' : String(pattern.runLength)}
                    disabled={pattern.runLength === 'any'}
                    placeholder={pattern.runLength === 'any' ? 'Any length' : undefined}
                    min={1}
                    onChange={(v) => set({ runLength: Math.max(1, parseInt(String(v), 10) || 1) })}
                  />
                  <Tooltip title="Match a bridge of ANY length (e.g. long weekends, festival breaks)">
                    <Box component="span" sx={{ flexShrink: 0, pt: 0.5 }}>
                      <WtControlLabel
                        control={
                          <WtSwitch
                            size="sm"
                            checked={pattern.runLength === 'any'}
                            onChange={(e) => set({ runLength: e.target.checked ? 'any' : 2 })}
                          />
                        }
                        label="Any"
                      />
                    </Box>
                  </Tooltip>
                </Box>
              </Box>
              <WtField
                label="Interior Days Must Be"
                value={pattern.interiorDayType ?? 'any'}
                onChange={(v) => set({ interiorDayType: v as any })}
                options={[
                  { value: 'any', label: 'Holiday or Weekend (either)' },
                  { value: 'holiday', label: 'Holiday only (not a weekend)' },
                  { value: 'weekend', label: 'Weekend only (branch off-day)' },
                ]}
              />
          </FormSection>

          <FormSection tone={TRIO.green} icon="arrow-left" title="Leading Day" desc="Before the off-day run.">
              <WtControlLabel
                control={<WtSwitch size="sm" checked={pattern.leadingRequired} onChange={(e) => set({ leadingRequired: e.target.checked })} />}
                label="Leading leave day required?"
              />
              {pattern.leadingRequired && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: FORM_SPACE.rowGap, alignItems: 'center' }}>
                  <WtField
                    label="Leading Day Must Be"
                    value={pattern.leadingPaidCondition}
                    onChange={(v) => set({ leadingPaidCondition: v as any })}
                    options={[
                      { value: 'any', label: 'Paid or Unpaid' },
                      { value: 'paid', label: 'Paid only' },
                      { value: 'unpaid', label: 'Unpaid only' },
                    ]}
                  />
                  <WtCheckboxField
                    size="sm"
                    checked={pattern.excludeLeadingDayFromSalary}
                    onChange={(e) => set({ excludeLeadingDayFromSalary: e.target.checked })}
                    label="Exclude leading day from salary when paid"
                  />
                </Box>
              )}
          </FormSection>

          <FormSection tone={TRIO.purple} icon="arrow-right" title="Trailing Day" desc="After the off-day run.">
              <WtControlLabel
                control={<WtSwitch size="sm" checked={pattern.trailingRequired} onChange={(e) => set({ trailingRequired: e.target.checked })} />}
                label="Trailing leave day required?"
              />
              {pattern.trailingRequired && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: FORM_SPACE.rowGap, alignItems: 'center' }}>
                  <WtField
                    label="Trailing Day Must Be"
                    value={pattern.trailingPaidCondition}
                    onChange={(v) => set({ trailingPaidCondition: v as any })}
                    options={[
                      { value: 'any', label: 'Paid or Unpaid' },
                      { value: 'paid', label: 'Paid only' },
                      { value: 'unpaid', label: 'Unpaid only' },
                    ]}
                  />
                  <WtCheckboxField
                    size="sm"
                    checked={pattern.excludeTrailingDayFromSalary}
                    onChange={(e) => set({ excludeTrailingDayFromSalary: e.target.checked })}
                    label="Exclude trailing day from salary when paid"
                  />
                </Box>
              )}
          </FormSection>

          <FormSection tone={TRIO.amber} icon="dollar" title="Salary & Activation">
              <WtCheckboxField
                size="sm"
                checked={pattern.excludeInteriorDaysFromSalary}
                onChange={(e) => set({ excludeInteriorDaysFromSalary: e.target.checked })}
                label="Exclude the interior off-day(s) themselves from the salary count"
              />
              <WtControlLabel
                control={<WtSwitch size="sm" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />}
                label="Enabled"
              />
          </FormSection>
        </Stack>
      </DialogContent>
      <GlassDialogActions
        onCancel={onClose}
        cancelDisabled={submitting}
        onSubmit={handleSave}
        submitDisabled={submitting}
        submitLabel={editingRule ? 'Save Changes' : 'Create Rule'}
        submitting={submitting}
        submitStartIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <KTIcon iconName="check-circle" className="fs-5" />}
      />
    </GlassDialog>
  );
}

// ─── Audit trail dialog ─────────────────────────────────────────────────────────────────────

const AUDIT_TRIO: Record<string, Trio> = {
  CREATED: TRIO.green, ENABLED: TRIO.green, UPDATED: TRIO.blue, DISABLED: TRIO.amber, DELETED: TRIO.rose,
};

function AuditLogModal({ ruleId, ruleName, onClose }: { ruleId: string | null; ruleName: string; onClose: () => void }) {
  const [logs, setLogs] = useState<SandwichRuleAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ruleId) return;
    let alive = true;
    // Silent = background refresh (socket-triggered); no spinner flicker on live updates.
    const load = (silent = false) => {
      if (!silent) setLoading(true);
      fetchSandwichRuleAuditLog(ruleId)
        .then((res) => { if (alive) setLogs(res.logs); })
        .catch(() => { if (alive) setLogs([]); })
        .finally(() => { if (alive && !silent) setLoading(false); });
    };
    load();

    // Real-time: while this history is open, refetch when any action fires on the rules anywhere
    // (create/edit/enable/disable/delete/reorder) so a new audit entry appears without reopening.
    const socket = getSocket();
    const handler = () => load(true);
    socket.on('sandwichRules:updated', handler);
    return () => { alive = false; socket.off('sandwichRules:updated', handler); };
  }, [ruleId]);

  return (
    <GlassDialog open={!!ruleId} onClose={onClose} maxWidth="sm" preset="form" header={
      <GlassHeader title="Audit History" subtitle={ruleName} icon="time" onClose={onClose} />
    }>
      <DialogContent sx={{ maxHeight: '62vh', p: FORM_SPACE.bodyPad }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
        ) : logs.length === 0 ? (
          <WtEmptyState
            dense
            icon="time"
            tone={TRIO.slate}
            title="No audit history yet"
            hint="Every create, edit, enable/disable, and delete on this rule will be recorded here — who did it and when."
          />
        ) : (
          <Stack spacing={1.25}>
            {logs.map((log) => {
              const trio = AUDIT_TRIO[log.action] ?? TRIO.slate;
              return (
                // 3px status-tone left border — the Devices sync-history log-card pattern
                <GlassSurface key={log.id} variant="thin" sx={{ borderRadius: '10px', borderColor: 'divider', borderLeft: `3px solid ${trio.c}`, p: 1.5 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" sx={{ gap: 1 }}>
                    <StatusBadge trio={trio} label={log.action} />
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{new Date(log.createdAt).toLocaleString()}</Typography>
                  </Stack>
                  {/* Show the resolved human name; fall back to a friendly label, never the raw id. */}
                  <Typography sx={{ fontSize: 13, color: 'text.primary', mt: 0.75 }}>
                    By: {log.actorName || (log.actorId ? 'Unknown user' : 'System')}
                  </Typography>
                </GlassSurface>
              );
            })}
          </Stack>
        )}
      </DialogContent>
    </GlassDialog>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────────────────

function SandwichLeave({ open, showSandWhichLeaveModal, readOnly = false }: SandwichLeaveProps) {
  const [rules, setRules] = useState<SandwichRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SandwichRule | null>(null);
  const [newRuleCategory, setNewRuleCategory] = useState<'holiday-bridge' | 'weekend-bridge' | 'custom'>('custom');
  const [deletingRule, setDeletingRule] = useState<SandwichRule | null>(null);
  const [auditRuleId, setAuditRuleId] = useState<string | null>(null);
  const [auditRuleName, setAuditRuleName] = useState('');

  // Dormant date-settings toggle preserved from the pre-CRUD version — no visible UI renders it;
  // kept wired so it isn't lost if that control is ever re-enabled.
  const [dateConfigId, setDateConfigId] = useState<string | null>(null);
  const [isDateEnabled, setIsDateEnabled] = useState(false);

  async function loadRules() {
    try {
      const [{ rules: fetchedRules }, { data: { configuration: dateConfigData } }] = await Promise.all([
        fetchSandwichRules(),
        fetchConfiguration(DATE_SETTINGS_KEY),
      ]);
      setRules(fetchedRules);
      const dateConfig = dateConfigData?.configuration ? safeJsonParse(dateConfigData.configuration) : {};
      setDateConfigId(dateConfigData?.id ?? null);
      setIsDateEnabled(dateConfig.useDateSettings ?? false);
    } catch (err) {
      console.error("Error fetching sandwich rules", err);
    } finally {
      setIsLoading(false);
    }
  }

  // The component now stays mounted (GlassDialog owns show/hide + exit animation), so only fetch
  // when the dialog actually opens — not eagerly when the host page mounts.
  useEffect(() => { if (open) loadRules(); }, [open]);

  // Real-time auto-update: while open, refetch when a rule is created/updated/deleted anywhere
  // (another admin/tab). Backend broadcasts this on every mutation.
  useEffect(() => {
    if (!open) return;
    const socket = getSocket();
    const handler = () => loadRules();
    socket.on('sandwichRules:updated', handler);
    return () => { socket.off('sandwichRules:updated', handler); };
  }, [open]);

  const handleToggle = async (rule: SandwichRule) => {
    if (readOnly) return;
    setTogglingId(rule.id);
    const nextEnabled = !rule.isEnabled;
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isEnabled: nextEnabled } : r)));
    try {
      await updateSandwichRule(rule.id, { isEnabled: nextEnabled });
    } catch (err: any) {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isEnabled: rule.isEnabled } : r)));
      errorConfirmation(err?.response?.data?.message || 'Failed to update rule');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingRule) return;
    try {
      await deleteSandwichRule(deletingRule.id);
      setRules((prev) => prev.filter((r) => r.id !== deletingRule.id));
      await successConfirmation('Rule deleted.');
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Failed to delete rule');
    } finally {
      setDeletingRule(null);
    }
  };

  // Dormant: preserved so a future re-enabled "Date Settings" toggle keeps working unchanged.
  const handleDateToggle = async (checked: boolean) => {
    setIsDateEnabled(checked);
    try {
      if (dateConfigId) {
        await updateConfigurationById(dateConfigId, { module: DATE_SETTINGS_KEY, configuration: { useDateSettings: checked } });
      } else {
        await createNewConfiguration({ module: DATE_SETTINGS_KEY, configuration: { useDateSettings: checked } });
      }
    } catch {
      setIsDateEnabled(!checked);
    }
  };
  void handleDateToggle; void isDateEnabled;

  const openAddRule = (category: 'holiday-bridge' | 'weekend-bridge' | 'custom') => {
    setEditingRule(null);
    setNewRuleCategory(category);
    setFormModalOpen(true);
  };

  // Grouped by the actual `category` field, not by provenance — every rule is equally
  // editable/deletable (SANDWICH_RULES.md §13 v6.0). Safe with rules=[] while loading.
  const holidayBridgeRules = rules.filter((r) => r.category === 'holiday-bridge');
  const weekendBridgeRules = rules.filter((r) => r.category === 'weekend-bridge');
  const customCategoryRules = rules.filter((r) => r.category === 'custom');
  const holidayBridgeEnabledCount = holidayBridgeRules.filter((r) => r.isEnabled).length;
  const weekendBridgeEnabledCount = weekendBridgeRules.filter((r) => r.isEnabled).length;
  const customEnabledCount = customCategoryRules.filter((r) => r.isEnabled).length;
  const totalEnabledCount = rules.filter((r) => r.isEnabled).length;
  // Per explicit user decision: the permanently-visible EMPTY Custom section card at the bottom
  // was dead space, so it renders only once at least one custom rule exists — but the "Custom
  // rules" stat tile at the top stays always. Creation still works any time via the header/mobile
  // Add Rule (the form's Category field defaults to Custom).
  const showCustomSection = customCategoryRules.length > 0;

  // Persist a new order: optimistic reorder of the full `rules` array (rebuilt in display order so
  // the sections re-filter correctly), then one atomic PUT of the global id order. Reverts on
  // failure. The engine matches in this exact order (first-match-wins), so drag = priority.
  const persistOrder = async (nextRules: SandwichRule[]) => {
    const prev = rules;
    setRules(nextRules);
    try {
      await reorderSandwichRules(nextRules.map((r) => r.id));
    } catch (err: any) {
      setRules(prev);
      errorConfirmation(err?.response?.data?.message || 'Failed to reorder rules');
    }
  };

  const handleSectionReorder = (category: SandwichRule['category'], newSectionOrder: SandwichRule[]) => {
    const section = (c: SandwichRule['category'], live: SandwichRule[]) =>
      category === c ? newSectionOrder : live;
    // Full display order: holiday-bridge, then weekend-bridge, then custom.
    persistOrder([
      ...section('holiday-bridge', holidayBridgeRules),
      ...section('weekend-bridge', weekendBridgeRules),
      ...section('custom', customCategoryRules),
    ]);
  };

  const renderRuleRow = (trio: Trio) => (rule: SandwichRule, index: number) => (
    <RuleRow
      key={rule.id}
      rule={rule}
      trio={trio}
      index={index}
      readOnly={readOnly}
      busy={togglingId === rule.id}
      draggable={!readOnly}
      onToggle={() => handleToggle(rule)}
      onEdit={() => { setEditingRule(rule); setFormModalOpen(true); }}
      onDelete={() => setDeletingRule(rule)}
      onAudit={() => { setAuditRuleId(rule.id); setAuditRuleName(rule.name); }}
    />
  );

  // A section's rule list as a drag-to-reorder group. Whole-card drag (like the attendance
  // Overview); the row's own controls stopPropagation so they stay clickable. Read-only disables it.
  const renderRuleList = (rulesInSection: SandwichRule[], trio: Trio, category: SandwichRule['category']) => (
    <ReorderableGroup
      items={rulesInSection}
      getItemId={(r) => r.id}
      axis="y"
      disabled={readOnly}
      className="sw-reorder-group"
      onReorder={(next) => handleSectionReorder(category, next)}
      renderItem={(rule) => renderRuleRow(trio)(rule, rulesInSection.findIndex((r) => r.id === rule.id))}
    />
  );

  return (
    // Self-contained glass dialog — same GlassDialog the Add Rule dialog uses, so the main modal
    // and its sub-dialogs share one system: frosted regular-glass Paper, dim+blurred page backdrop,
    // the Apple scale-in transition, and mobile full-screen. `lg` gives the workspace its room.
    <GlassDialog
      open={open}
      onClose={() => showSandWhichLeaveModal(false)}
      maxWidth="lg"
      preset="workspace"
      header={
        <GlassHeader
          title="Sandwich Leave Rules"
          subtitle={`Payroll salary-exclusion rules · ${totalEnabledCount}/${rules.length} enabled${readOnly ? ' · read-only' : ''}`}
          icon="calendar-8"
          onClose={() => showSandWhichLeaveModal(false)}
          action={!readOnly ? (
            // Header action hides on phones (a full-width Add lives in the body there).
            <WtButton inverted size="small" startIcon={<KTIcon iconName="plus" className="fs-4" />}
              onClick={() => openAddRule('custom')}
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              Add Rule
            </WtButton>
          ) : undefined}
        />
      }
    >
      {/* Motion only — the frosted shell + backdrop are now owned by GlassDialog (no BS host CSS).
          sw-fade-up: staggered card entrance; sw-dot-pulse: the Active-badge ring (transform/opacity
          only — compositor-cheap). Both disabled under prefers-reduced-motion. */}
      <style>{`
        .sw-reorder-group { display: flex; flex-direction: column; gap: 10px; }
        @keyframes swFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .sw-fade-up { animation: swFadeUp .3s cubic-bezier(0.4, 0, 0.2, 1) both; }
        .sw-dot-pulse { position: relative; }
        .sw-dot-pulse::after { content: ''; position: absolute; inset: -1px; border-radius: 999px; border: 2px solid currentColor; opacity: 0; animation: swRing 2.4s ease-out infinite; }
        @keyframes swRing { 0% { transform: scale(0.6); opacity: 0.5; } 70%, 100% { transform: scale(1.9); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .sw-fade-up { animation: none !important; } .sw-dot-pulse::after { animation: none !important; display: none; } }
      `}</style>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
          <CircularProgress />
        </Box>
      ) : (
      // DialogContent scrolls within the fixed glass Paper (same as the Add Rule dialog).
      <DialogContent sx={{ p: FORM_SPACE.bodyPad }}>
        {/* Mobile: primary action lives in the body (header stays uncluttered) — Devices pattern. */}
        {!readOnly && (
          // Full-width phone CTA — navy fill like the Create Rule button (explicit user decision:
          // "Create Rule button is fine, so make Add Rule button also like that in mobile view").
          <WtButton fullWidth size="medium" onClick={() => openAddRule('custom')}
            startIcon={<KTIcon iconName="plus" className="fs-5" />}
            sx={{ display: { xs: 'flex', sm: 'none' }, mb: 2 }}>
            Add Rule
          </WtButton>
        )}

        {/* KPI stat strip — 2 columns on phones, 4 on wider screens. The Custom tile is always
            shown (per user: only the empty bottom SECTION was extra, not the top stat). */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>
          <StatTile label="Rules enabled" value={`${totalEnabledCount}/${rules.length}`} trio={totalEnabledCount > 0 ? TRIO.green : TRIO.slate} icon="toggle-on" />
          <StatTile label="Holiday-bridge" value={`${holidayBridgeEnabledCount}/${holidayBridgeRules.length}`} trio={TRIO.blue} icon="calendar-tick" />
          <StatTile label="Weekend-bridge" value={`${weekendBridgeEnabledCount}/${weekendBridgeRules.length}`} trio={TRIO.purple} icon="calendar-2" />
          <StatTile label="Custom rules" value={`${customEnabledCount}/${customCategoryRules.length}`} trio={TRIO.amber} icon="medal-star" />
        </Box>

        {/* Info strip + legend — frosted blue banner (tone="blue" lays an ~8% blue wash over the
            translucent glass, so it reads as tinted frost rather than an opaque callout). */}
        <GlassSurface variant="thin" tone="blue" sx={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.25, mb: 2, px: 1.75, py: 1.25,
          borderColor: TRIO.blue.bd, borderRadius: '12px',
        }}>
          <Box sx={{ color: TRIO.blue.c, lineHeight: 0 }}><KTIcon iconName="information-5" className="fs-3" /></Box>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', flex: 1, minWidth: 220, lineHeight: 1.5 }}>
            These rules govern <b>payroll salary exclusion only</b> — they never affect whether a sandwiched day is
            booked as Unpaid Leave on an employee's balance. Toggling a rule takes effect immediately.
          </Typography>
          <PatternLegend />
        </GlassSurface>

        <Stack spacing={FORM_SPACE.stackGap} className="sw-fade-up">
          <SettingsSection
            tone={TRIO.blue}
            icon="calendar-tick"
            title="Holiday-Bridge Rules"
            description="Holiday-bridged leave — the public holiday(s) between the leave days must have an active status. Fully editable — add, edit, or delete freely."
            count={holidayBridgeRules.length}
          >
            {holidayBridgeRules.length === 0 ? (
              <WtEmptyState
                dense
                icon="calendar-tick"
                tone={TRIO.blue}
                title="No holiday-bridge rules yet"
                hint="These rules govern leave placed on both sides of a public holiday. Add one to define this pattern."
                actionLabel={readOnly ? undefined : 'Add Rule'}
                onAction={readOnly ? undefined : () => openAddRule('holiday-bridge')}
              />
            ) : (
              renderRuleList(holidayBridgeRules, TRIO.blue, 'holiday-bridge')
            )}
          </SettingsSection>

          <SettingsSection
            tone={TRIO.purple}
            icon="calendar-2"
            title="Weekend-Bridge Rules"
            description="Leave placed against a Friday–Monday weekend, with or without a holiday landing on it. Fully editable — add, edit, or delete freely."
            count={weekendBridgeRules.length}
          >
            {weekendBridgeRules.length === 0 ? (
              <WtEmptyState
                dense
                icon="calendar-2"
                tone={TRIO.purple}
                title="No weekend-bridge rules yet"
                hint="These rules govern leave placed against a weekend, with or without a holiday landing on it. Add one to define this pattern."
                actionLabel={readOnly ? undefined : 'Add Rule'}
                onAction={readOnly ? undefined : () => openAddRule('weekend-bridge')}
              />
            ) : (
              renderRuleList(weekendBridgeRules, TRIO.purple, 'weekend-bridge')
            )}
          </SettingsSection>

          {showCustomSection && (
            <SettingsSection
              tone={TRIO.amber}
              icon="medal-star"
              title="Custom Rules"
              description="Admin-defined sandwich patterns beyond the built-in scenario families. Full add / edit / delete, with a complete audit trail per rule."
              count={customCategoryRules.length}
            >
              {renderRuleList(customCategoryRules, TRIO.amber, 'custom')}
            </SettingsSection>
          )}
        </Stack>
      </DialogContent>
      )}

      <RuleFormModal
        show={formModalOpen}
        onClose={() => { setFormModalOpen(false); setEditingRule(null); }}
        onSaved={loadRules}
        editingRule={editingRule}
        defaultCategory={newRuleCategory}
      />

      <AuditLogModal ruleId={auditRuleId} ruleName={auditRuleName} onClose={() => setAuditRuleId(null)} />

      <GlassDialog open={!!deletingRule} onClose={() => setDeletingRule(null)} maxWidth="xs" preset="form" header={
        <GlassHeader title="Delete Rule" subtitle={deletingRule?.name} icon="trash" onClose={() => setDeletingRule(null)} />
      }>
        <DialogContent sx={{ p: FORM_SPACE.bodyPad }}>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.55 }}>
            Are you sure you want to delete <Box component="b" sx={{ color: 'text.primary' }}>{deletingRule?.name}</Box>?
            This rule will stop applying immediately. Its audit history will remain viewable.
          </Typography>
        </DialogContent>
        <GlassDialogActions onCancel={() => setDeletingRule(null)}>
          <WtButton ghost onClick={() => setDeletingRule(null)}>Cancel</WtButton>
          <WtButton tone="danger" onClick={handleDelete}
            startIcon={<KTIcon iconName="trash" className="fs-5" />}>
            Delete
          </WtButton>
        </GlassDialogActions>
      </GlassDialog>
    </GlassDialog>
  );
}

export default SandwichLeave;
