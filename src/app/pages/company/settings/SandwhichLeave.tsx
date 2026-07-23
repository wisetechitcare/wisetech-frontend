import { useEffect, useState } from "react";
import {
  DialogContent, DialogActions,
  Tooltip, Switch, TextField, MenuItem,
  Checkbox, FormControlLabel, CircularProgress, Box, Stack, Typography, Chip,
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
// Shared UI kit (single import surface): tokens, CTA/icon buttons, and the reusable
// glassmorphism primitives (GlassSurface / GlassDialog / GlassHeader) — see ui/index.ts.
import {
  T, WtButton, WtIconButton, GlassSurface, GlassDialog, GlassHeader,
} from "@app/modules/common/components/ui";

interface SandwichLeaveProps {
  /** Controls the (now self-contained) glass dialog's visibility. */
  open: boolean;
  showSandWhichLeaveModal: (visible: boolean) => void;
  readOnly?: boolean;  // When true, disables all inputs and hides mutating actions
}

// ─── Tone trios ──────────────────────────────────────────────────────────────────────────────
// The canonical color/background/border trio palette from EmployeeDetailsCard (salary meta tiles)
// — the exact tints on the Leave Policies cards, salary tiles, and attendance dashboard the user
// pointed to as the reference. One trio drives icon box, chip, and border per tone; no alpha-hex
// tricks, so every tint matches those screens pixel-for-pixel.
type Trio = { c: string; bg: string; bd: string };
const TRIO: Record<'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'cyan' | 'slate', Trio> = {
  blue:   { c: '#2563eb', bg: '#eff6ff', bd: '#dbeafe' },
  green:  { c: '#16a34a', bg: '#f0fdf4', bd: '#dcfce7' },
  purple: { c: '#7c3aed', bg: '#f5f3ff', bd: '#ede9fe' },
  amber:  { c: '#d97706', bg: '#fffbeb', bd: '#fde68a' },
  rose:   { c: '#e11d48', bg: '#fff1f2', bd: '#fecdd3' },
  cyan:   { c: '#0891b2', bg: '#ecfeff', bd: '#cffafe' },
  slate:  { c: '#64748b', bg: '#f8fafc', bd: '#e2e8f0' },
};

// EmployeeDetailsCard metric-tile motion, verbatim: 200ms standard easing, -2px lift, deepening
// slate shadow, border tinting to the tone on hover.
const EASE_200 = 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)';
const SHADOW_REST = '0 1px 2px rgba(15,23,42,0.04), 0 8px 16px rgba(15,23,42,0.035)';
const SHADOW_HOVER = '0 2px 4px rgba(15,23,42,0.04), 0 14px 22px rgba(15,23,42,0.055)';

// Button physics (gradient + glass edge + lift/press) come from the shared WtButton/WtIconButton
// primitives in @app/modules/common/components/ui/buttons — do not re-declare them locally.

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

// Tinted icon box — EmployeeDetailsCard anatomy (radius 11, tone trio, grid-centered glyph).
function IconBox({ icon, trio, size = 40, fs = 'fs-2' }: { icon: string; trio: Trio; size?: number; fs?: string }) {
  return (
    <Box sx={{
      width: size, height: size, borderRadius: '11px', display: 'grid', placeItems: 'center',
      bgcolor: trio.bg, color: trio.c, border: `1px solid ${trio.bd}`, flexShrink: 0,
    }}>
      <KTIcon iconName={icon} className={fs} />
    </Box>
  );
}

// Soft pill status badge with tone dot (the "7 days" / "Good" pills on the attendance dashboard).
// `pulse` rings the dot for live "Active" state — transform/opacity only (compositor-friendly).
// When `onClick` is supplied the badge becomes an interactive toggle (click OR Enter/Space),
// styled with a pressable affordance and drag-safe (stops pointerdown so it never starts a card
// drag). Passive callers omit onClick and get the original static chip unchanged.
function StatusBadge({ trio, label, pulse, onClick, disabled, title }: {
  trio: Trio; label: string; pulse?: boolean;
  onClick?: () => void; disabled?: boolean; title?: string;
}) {
  const interactive = !!onClick;
  const badge = (
    <Box
      role={interactive ? 'button' : undefined}
      tabIndex={interactive && !disabled ? 0 : undefined}
      aria-pressed={interactive ? pulse : undefined}
      aria-disabled={interactive ? disabled : undefined}
      onClick={interactive && !disabled ? onClick : undefined}
      onKeyDown={interactive && !disabled ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick!(); }
      } : undefined}
      onPointerDown={interactive ? (e: React.PointerEvent) => e.stopPropagation() : undefined}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: '6px', px: '10px', py: '3px',
        borderRadius: 999, bgcolor: trio.bg, border: `1px solid ${trio.bd}`, flexShrink: 0,
        userSelect: 'none',
        ...(interactive && {
          cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.6 : 1, transition: EASE_200,
          '&:hover': disabled ? {} : { filter: 'brightness(0.96)', boxShadow: SHADOW_REST },
          '&:active': disabled ? {} : { transform: 'scale(0.95)' },
          '&:focus-visible': { outline: `2px solid ${trio.c}`, outlineOffset: 2 },
        }),
      }}
    >
      <Box className={pulse ? 'sw-dot-pulse' : undefined} sx={{ width: 7, height: 7, borderRadius: 999, bgcolor: trio.c, color: trio.c }} />
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: trio.c, lineHeight: 1, whiteSpace: 'nowrap' }}>{label}</Typography>
    </Box>
  );
  return interactive && title ? <Tooltip title={title}>{badge}</Tooltip> : badge;
}

// Salary-meta-tile stat card: small muted label ABOVE the bold value (screenshot anatomy),
// tinted icon box left, EmployeeDetailsCard hover lift.
function StatTile({ label, value, trio, icon }: { label: string; value: React.ReactNode; trio: Trio; icon: string }) {
  return (
    <GlassSurface variant="thin" sx={{
      minWidth: 0, p: 1.5, borderRadius: '14px', display: 'flex', alignItems: 'center', gap: 1.25,
      borderColor: 'divider', boxShadow: SHADOW_REST, transition: EASE_200,
      '&:hover': { transform: 'translateY(-2px)', boxShadow: SHADOW_HOVER, borderColor: trio.bd },
    }}>
      <IconBox icon={icon} trio={trio} size={40} fs="fs-2" />
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>{label}</Typography>
        <Typography noWrap sx={{ fontSize: 19, fontWeight: 800, lineHeight: 1.2, color: 'text.primary' }}>{value}</Typography>
      </Box>
    </GlassSurface>
  );
}

// Rule-row action button — the shared tinted-ghost primitive with the trio hue. Slightly compact on
// phones so the trio of controls leaves the rule title more room (and reads as buttons, not boxes).
function GhostIconButton({ icon, trio, title, onClick }: { icon: string; trio: Trio; title: string; onClick: () => void }) {
  return (
    <WtIconButton title={title} color={trio.c} onClick={onClick}
      sx={{ width: { xs: 36, sm: 40 }, height: { xs: 36, sm: 40 } }}>
      <KTIcon iconName={icon} className="fs-3" />
    </WtIconButton>
  );
}

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
          <Typography noWrap sx={{ fontSize: { xs: 10.5, md: 11 }, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', lineHeight: 1.3 }}>{role}</Typography>
          {cond && (
            <Typography noWrap sx={{ fontSize: { xs: 13.5, md: 14.5 }, fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>{cond}</Typography>
          )}
          <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mt: 0.35 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: 999, bgcolor: trio.c, flexShrink: 0 }} />
            <Typography noWrap sx={{ fontSize: { xs: 10.5, md: 11 }, fontWeight: 700, color: trio.c, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>{label}</Typography>
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

// ─── Section card ───────────────────────────────────────────────────────────────────────────

function SectionCard({ title, description, icon, trio, count, children }: {
  title: string; description: string; icon: string; trio: Trio; count: number; children: React.ReactNode;
}) {
  return (
    <GlassSurface variant="thin" className="sw-fade-up" sx={{ borderRadius: '14px', borderColor: 'divider', overflow: 'hidden', boxShadow: SHADOW_REST }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ p: { xs: 1.5, sm: 2 }, pb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <IconBox icon={icon} trio={trio} size={42} fs="fs-2" />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ rowGap: 0.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: 'text.primary', lineHeight: 1.25 }}>{title}</Typography>
            <Chip size="small" label={count} sx={{ height: 20, fontSize: 11, fontWeight: 700, color: trio.c, bgcolor: trio.bg, border: `1px solid ${trio.bd}`, '& .MuiChip-label': { px: 1 } }} />
          </Stack>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.25, lineHeight: 1.5 }}>{description}</Typography>
        </Box>
      </Stack>
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>{children}</Box>
    </GlassSurface>
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
              <GhostIconButton icon="time" trio={TRIO.slate} title="View audit history" onClick={onAudit} />
              <GhostIconButton icon="pencil" trio={TRIO.blue} title="Edit rule" onClick={onEdit} />
              <GhostIconButton icon="trash" trio={TRIO.rose} title="Delete rule" onClick={onDelete} />
            </Stack>
          )}
        </Stack>

        <SandwichPatternStrip pattern={rule.pattern} />
      </Stack>
    </GlassSurface>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────────────────────

function EmptyState({ icon, trio, title, description, onAdd }: {
  icon: string; trio: Trio; title: string; description: string; onAdd?: () => void;
}) {
  return (
    <Stack alignItems="center" spacing={1} sx={{ textAlign: 'center', py: 3.5 }}>
      <Box sx={{ width: 56, height: 56, borderRadius: '16px', display: 'grid', placeItems: 'center', bgcolor: trio.bg, color: trio.c, border: `1px solid ${trio.bd}` }}>
        <KTIcon iconName={icon} className="fs-2x" />
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: 15, color: 'text.primary' }}>{title}</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 400, lineHeight: 1.5 }}>{description}</Typography>
      {onAdd && (
        <WtButton inverted size="small" startIcon={<KTIcon iconName="plus" className="fs-5" />} onClick={onAdd}
          sx={{ mt: 0.5, px: 2, fontSize: 13 }}>
          Add Rule
        </WtButton>
      )}
    </Stack>
  );
}

// ─── Dialog header — now the shared GlassHeader (navy gradient + red accent stripe), with this
// screen's KTIcon glyphs plugged in. Kept as a thin local wrapper so the four call sites (which
// pass `icon` as a KTIcon name string) stay unchanged. ───────────────────────────────────────
function DialogHeader({ title, subtitle, icon, onClose, action }: {
  title: string; subtitle?: string; icon: string; onClose?: () => void; action?: React.ReactNode;
}) {
  return (
    <GlassHeader
      variant="gradient"
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      action={action}
      icon={<KTIcon iconName={icon} className="fs-1" />}
      closeIcon={<KTIcon iconName="cross" className="fs-3" />}
    />
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

// Devices LabeledField eyebrow — names each form group so the dialog scans at a glance.
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>{children}</Typography>
  );
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
        await successConfirmation('Rule updated successfully');
      } else {
        await createSandwichRule({ name, description, category, pattern, isEnabled });
        await successConfirmation('Rule created successfully');
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
  const controlLabelSx = { '& .MuiFormControlLabel-label': { fontSize: 13, fontWeight: 600, color: 'text.primary' } } as const;

  return (
    // GlassDialog = frosted Paper + dimmed/blurred backdrop; disableEnforceFocus defaults true so
    // the focus trap survives being portaled outside the react-bootstrap host modal.
    <GlassDialog open={show} onClose={onClose} maxWidth="md" header={
      <DialogHeader
        title={editingRule ? 'Edit Rule' : 'Add Rule'}
        subtitle={editingRule ? `Editing "${editingRule.name}"` : 'Define a new sandwich day-pattern'}
        icon="pencil"
        onClose={onClose}
      />
    }>
      <DialogContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Stack spacing={1.5}>
          {/* Live preview — updates as the form below changes */}
          <GlassSurface variant="thin" sx={{ p: 1.5, borderRadius: '12px', borderColor: 'divider' }}>
            <Box sx={{ mb: 1 }}><Eyebrow>Live preview</Eyebrow></Box>
            <SandwichPatternStrip pattern={pattern} />
            <Box sx={{ mt: 1 }}><PatternLegend /></Box>
          </GlassSurface>

          <GlassSurface variant="thin" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: '12px', borderColor: 'divider' }}>
            <Stack spacing={2}>
              <Eyebrow>Rule details</Eyebrow>
              <TextField label="Rule name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali Bridge" fullWidth size="small" />
              <TextField label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this rule for?" fullWidth size="small" multiline minRows={2} />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField select label="Category" value={category} onChange={(e) => setCategory(e.target.value as any)} size="small">
                  <MenuItem value="custom">Custom</MenuItem>
                  <MenuItem value="holiday-bridge">Holiday-Bridge</MenuItem>
                  <MenuItem value="weekend-bridge">Weekend-Bridge</MenuItem>
                </TextField>
                {/* Exact run length, OR toggle "Any" to match a bridge of any length (catch-all). */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField type="number" label="Interior off-day run length" size="small" sx={{ flex: 1 }}
                    value={pattern.runLength === 'any' ? '' : pattern.runLength}
                    disabled={pattern.runLength === 'any'}
                    placeholder={pattern.runLength === 'any' ? 'Any length' : undefined}
                    inputProps={{ min: 1 }}
                    onChange={(e) => set({ runLength: Math.max(1, parseInt(e.target.value) || 1) })} />
                  <Tooltip title="Match a bridge of ANY length (e.g. long weekends, festival breaks)">
                    <FormControlLabel sx={{ ...controlLabelSx, mr: 0, flexShrink: 0 }}
                      control={<Switch size="small" checked={pattern.runLength === 'any'}
                        onChange={(e) => set({ runLength: e.target.checked ? 'any' : 2 })} />}
                      label="Any" />
                  </Tooltip>
                </Box>
              </Box>
              <TextField select label="Interior days must be" value={pattern.interiorDayType ?? 'any'} onChange={(e) => set({ interiorDayType: e.target.value as any })} size="small" fullWidth>
                <MenuItem value="any">Holiday or Weekend (either)</MenuItem>
                <MenuItem value="holiday">Holiday only (not a weekend)</MenuItem>
                <MenuItem value="weekend">Weekend only (branch off-day)</MenuItem>
              </TextField>
            </Stack>
          </GlassSurface>

          <GlassSurface variant="thin" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: '12px', borderColor: 'divider' }}>
            <Stack spacing={1}>
              <Eyebrow>Leading day (before the off-day run)</Eyebrow>
              <FormControlLabel sx={controlLabelSx} control={<Switch size="small" checked={pattern.leadingRequired} onChange={(e) => set({ leadingRequired: e.target.checked })} />} label="Leading leave day required?" />
              {pattern.leadingRequired && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, alignItems: 'center' }}>
                  <TextField select label="Leading day must be" value={pattern.leadingPaidCondition} onChange={(e) => set({ leadingPaidCondition: e.target.value as any })} size="small">
                    <MenuItem value="any">Paid or Unpaid</MenuItem>
                    <MenuItem value="paid">Paid only</MenuItem>
                    <MenuItem value="unpaid">Unpaid only</MenuItem>
                  </TextField>
                  <FormControlLabel sx={controlLabelSx} control={<Checkbox size="small" checked={pattern.excludeLeadingDayFromSalary} onChange={(e) => set({ excludeLeadingDayFromSalary: e.target.checked })} />} label="Exclude leading day from salary when paid" />
                </Box>
              )}
            </Stack>
          </GlassSurface>

          <GlassSurface variant="thin" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: '12px', borderColor: 'divider' }}>
            <Stack spacing={1}>
              <Eyebrow>Trailing day (after the off-day run)</Eyebrow>
              <FormControlLabel sx={controlLabelSx} control={<Switch size="small" checked={pattern.trailingRequired} onChange={(e) => set({ trailingRequired: e.target.checked })} />} label="Trailing leave day required?" />
              {pattern.trailingRequired && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, alignItems: 'center' }}>
                  <TextField select label="Trailing day must be" value={pattern.trailingPaidCondition} onChange={(e) => set({ trailingPaidCondition: e.target.value as any })} size="small">
                    <MenuItem value="any">Paid or Unpaid</MenuItem>
                    <MenuItem value="paid">Paid only</MenuItem>
                    <MenuItem value="unpaid">Unpaid only</MenuItem>
                  </TextField>
                  <FormControlLabel sx={controlLabelSx} control={<Checkbox size="small" checked={pattern.excludeTrailingDayFromSalary} onChange={(e) => set({ excludeTrailingDayFromSalary: e.target.checked })} />} label="Exclude trailing day from salary when paid" />
                </Box>
              )}
            </Stack>
          </GlassSurface>

          <GlassSurface variant="thin" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: '12px', borderColor: 'divider' }}>
            <Stack spacing={0.5}>
              <Eyebrow>Salary counting & activation</Eyebrow>
              <FormControlLabel sx={controlLabelSx} control={<Checkbox size="small" checked={pattern.excludeInteriorDaysFromSalary} onChange={(e) => set({ excludeInteriorDaysFromSalary: e.target.checked })} />} label="Exclude the interior off-day(s) themselves from the salary count" />
              <FormControlLabel sx={controlLabelSx} control={<Switch checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />} label="Enabled" />
            </Stack>
          </GlassSurface>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${T.color.line}` }}>
        <WtButton ghost onClick={onClose} disabled={submitting}>Cancel</WtButton>
        {/* Commit action = navy fill (user decision: Add = white pill, Save = navy, Delete = red) */}
        <WtButton onClick={handleSave} disabled={submitting} sx={{ px: 2.5, py: 0.9 }}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <KTIcon iconName="check-circle" className="fs-5" />}>
          {editingRule ? 'Save Changes' : 'Create Rule'}
        </WtButton>
      </DialogActions>
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
    <GlassDialog open={!!ruleId} onClose={onClose} maxWidth="sm" header={
      <DialogHeader title="Audit History" subtitle={ruleName} icon="time" onClose={onClose} />
    }>
      <DialogContent sx={{ maxHeight: '62vh', p: { xs: 1.5, sm: 2 } }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
        ) : logs.length === 0 ? (
          <EmptyState icon="time" trio={TRIO.slate} title="No audit history yet"
            description="Every create, edit, enable/disable, and delete on this rule will be recorded here — who did it and when." />
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
      await successConfirmation('Rule deleted successfully');
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
      header={
        <DialogHeader
          title="Sandwich Leave Rules"
          subtitle={`Payroll salary-exclusion rules · ${totalEnabledCount}/${rules.length} enabled${readOnly ? ' · read-only' : ''}`}
          icon="calendar-8"
          onClose={() => showSandWhichLeaveModal(false)}
          action={!readOnly ? (
            // Header action hides on phones (a full-width Add lives in the body there).
            <WtButton inverted startIcon={<KTIcon iconName="plus" className="fs-4" />}
              onClick={() => openAddRule('custom')}
              sx={{ display: { xs: 'none', sm: 'inline-flex' }, height: 40, px: 2.25, fontSize: 13.5 }}>
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
      <DialogContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        {/* Mobile: primary action lives in the body (header stays uncluttered) — Devices pattern. */}
        {!readOnly && (
          // Full-width phone CTA — navy fill like the Create Rule button (explicit user decision:
          // "Create Rule button is fine, so make Add Rule button also like that in mobile view").
          <WtButton fullWidth onClick={() => openAddRule('custom')}
            startIcon={<KTIcon iconName="plus" className="fs-5" />}
            sx={{ display: { xs: 'flex', sm: 'none' }, fontSize: 13.5, height: 44, mb: 2 }}>
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

        <Stack spacing={1.5}>
          <SectionCard title="Holiday-Bridge Rules"
            description="Holiday-bridged leave — the public holiday(s) between the leave days must have an active status. Fully editable — add, edit, or delete freely."
            icon="calendar-tick" trio={TRIO.blue} count={holidayBridgeRules.length}>
            {holidayBridgeRules.length === 0 ? (
              <EmptyState icon="calendar-tick" trio={TRIO.blue} title="No holiday-bridge rules yet"
                description="These rules govern leave placed on both sides of a public holiday. Add one to define this pattern."
                onAdd={readOnly ? undefined : () => openAddRule('holiday-bridge')} />
            ) : (
              renderRuleList(holidayBridgeRules, TRIO.blue, 'holiday-bridge')
            )}
          </SectionCard>

          <SectionCard title="Weekend-Bridge Rules"
            description="Leave placed against a Friday–Monday weekend, with or without a holiday landing on it. Fully editable — add, edit, or delete freely."
            icon="calendar-2" trio={TRIO.purple} count={weekendBridgeRules.length}>
            {weekendBridgeRules.length === 0 ? (
              <EmptyState icon="calendar-2" trio={TRIO.purple} title="No weekend-bridge rules yet"
                description="These rules govern leave placed against a weekend, with or without a holiday landing on it. Add one to define this pattern."
                onAdd={readOnly ? undefined : () => openAddRule('weekend-bridge')} />
            ) : (
              renderRuleList(weekendBridgeRules, TRIO.purple, 'weekend-bridge')
            )}
          </SectionCard>

          {showCustomSection && (
            <SectionCard title="Custom Rules"
              description="Admin-defined sandwich patterns beyond the built-in scenario families. Full add / edit / delete, with a complete audit trail per rule."
              icon="medal-star" trio={TRIO.amber} count={customCategoryRules.length}>
              {renderRuleList(customCategoryRules, TRIO.amber, 'custom')}
            </SectionCard>
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

      <GlassDialog open={!!deletingRule} onClose={() => setDeletingRule(null)} maxWidth="xs" header={
        <DialogHeader title="Delete Rule" subtitle={deletingRule?.name} icon="trash" onClose={() => setDeletingRule(null)} />
      }>
        <DialogContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.55 }}>
            Are you sure you want to delete <Box component="b" sx={{ color: 'text.primary' }}>{deletingRule?.name}</Box>?
            This rule will stop applying immediately. Its audit history will remain viewable.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${T.color.line}` }}>
          <WtButton ghost onClick={() => setDeletingRule(null)}>Cancel</WtButton>
          <WtButton tone="danger" onClick={handleDelete} sx={{ px: 2.5, py: 0.9 }}
            startIcon={<KTIcon iconName="trash" className="fs-5" />}>
            Delete
          </WtButton>
        </DialogActions>
      </GlassDialog>
    </GlassDialog>
  );
}

export default SandwichLeave;
