import React, { useState, type CSSProperties } from 'react';
import Select, { components } from 'react-select';
import { ColourOption, SingleValue, DropdownIndicator } from '../common/inputs/ColorInDropdwon';
import { C, FONT, RADIUS } from '../configuration/ConfigDesignSystem';
import { DetailCard, type AccentColor } from './DetailPageComponents';
import './DetailPageResponsive.css';

/**
 * EditableDetailCard — a DetailCard that flips between read-only and inline-edit
 * mode via an Edit → Save/Cancel control in its header. It owns the local draft
 * so each card edits and saves independently ("edit this section directly"),
 * without a modal or the full form.
 *
 * The render-prop children receive `{ editing, draft, set }` so a row can show
 * its persisted value in read mode and a field editor in edit mode. `onSave`
 * returns a promise; a rejection keeps the card in edit mode and surfaces the
 * message (e.g. a 409 optimistic-concurrency conflict).
 */
export interface EditableCardContext<T> {
  editing: boolean;
  draft: T;
  set: (patch: Partial<T>) => void;
}

interface EditableDetailCardProps<T extends Record<string, any>> {
  title: string;
  subtitle?: string;
  icon: string;
  accentColor?: AccentColor;
  /** Persisted values; seeded into the draft when edit mode opens. */
  values: T;
  onSave: (draft: T) => Promise<void>;
  canEdit?: boolean;
  children: (ctx: EditableCardContext<T>) => React.ReactNode;
}

const iconBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: FONT.body,
  fontSize: 12,
  fontWeight: 600,
  padding: '6px 12px',
  borderRadius: RADIUS.md,
  border: `1px solid ${C.border}`,
  background: '#fff',
  color: C.textSecondary,
  cursor: 'pointer',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};

export function EditableDetailCard<T extends Record<string, any>>({
  title, subtitle, icon, accentColor = 'primary', values, onSave, canEdit = true, children,
}: EditableDetailCardProps<T>) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<T>(values);

  const open = () => { setDraft(values); setError(null); setEditing(true); };
  const cancel = () => { setEditing(false); setError(null); };
  const set = (patch: Partial<T>) => setDraft(prev => ({ ...prev, ...patch }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (e: any) {
      // Backend wraps the message as { message, statusCode, data }.
      const msg = e?.message || e?.data?.message || 'Save failed. Please try again.';
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  };

  const actions = !canEdit ? null : editing ? (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button type="button" style={iconBtn} onClick={cancel} disabled={saving}>
        Cancel
      </button>
      <button
        type="button"
        style={{ ...iconBtn, border: '1px solid #AA393D', background: '#AA393D', color: '#fff', opacity: saving ? 0.7 : 1 }}
        onClick={save}
        disabled={saving}
      >
        {saving ? (
          <span className="spinner-border spinner-border-sm" role="status" style={{ width: 12, height: 12 }} />
        ) : (
          <i className="bi bi-check2" style={{ fontSize: 14 }} />
        )}
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  ) : (
    <button type="button" style={iconBtn} onClick={open}>
      <i className="bi bi-pencil" style={{ fontSize: 12 }} /> Edit
    </button>
  );

  return (
    <DetailCard title={title} subtitle={subtitle} icon={icon} accentColor={accentColor} actions={actions}>
      {children({ editing, draft, set })}
      {error && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 12px',
            borderRadius: RADIUS.md,
            background: '#fff1f3',
            border: '1px solid #f1416c33',
            color: '#9b1c44',
            fontFamily: FONT.body,
            fontSize: 12.5,
            fontWeight: 500,
          }}
        >
          <i className="bi bi-exclamation-triangle me-2" />
          {error}
        </div>
      )}
    </DetailCard>
  );
}

// ── Field row (label + right slot) — mirrors DetailRow spacing ────────────────

export const FieldRow: React.FC<{ label: string; children: React.ReactNode; isLast?: boolean; align?: 'start' | 'center' }> = ({
  label, children, isLast, align = 'center',
}) => (
  <div
    className="field-row"
    style={{
      display: 'flex',
      alignItems: align === 'start' ? 'flex-start' : 'center',
      justifyContent: 'space-between',
      gap: 20,
      paddingTop: 10,
      paddingBottom: 10,
      borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
      minHeight: 40,
    }}
  >
    <span style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 500, color: C.textSecondary, flexShrink: 0, lineHeight: 1.45 }}>
      {label}
    </span>
    <div className="field-row-value" style={{ fontFamily: FONT.body, fontSize: 13, fontWeight: 500, color: C.textPrimary, textAlign: 'right', lineHeight: 1.45, wordBreak: 'break-word', maxWidth: '65%' }}>
      {children}
    </div>
  </div>
);

// ── Field editors ─────────────────────────────────────────────────────────────

const baseInput: CSSProperties = {
  width: '100%',
  minWidth: 150,
  fontFamily: FONT.body,
  fontSize: 13,
  fontWeight: 500,
  padding: '7px 10px',
  border: `1px solid ${C.border}`,
  borderRadius: RADIUS.md,
  color: C.textPrimary,
  background: '#fff',
  outline: 'none',
};

/** ISO / Date → yyyy-mm-dd for <input type=date>. */
export const toDateInputValue = (v: any): string => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 10);
};

export const TextEditor: React.FC<{ value: any; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
  <input style={baseInput} value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
);

export const NumberEditor: React.FC<{ value: any; onChange: (v: string) => void; placeholder?: string; prefix?: string }> = ({ value, onChange, placeholder, prefix }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
    {prefix && <span style={{ color: C.textMuted, fontSize: 13 }}>{prefix}</span>}
    <input type="number" style={{ ...baseInput, textAlign: 'right' }} value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
  </div>
);

export const SelectEditor: React.FC<{
  value: any;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}> = ({ value, onChange, options, placeholder = 'Select…' }) => (
  <select style={{ ...baseInput, cursor: 'pointer' }} value={value ?? ''} onChange={e => onChange(e.target.value)}>
    <option value="">{placeholder}</option>
    {options.map(o => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
);

/**
 * SearchableSelectEditor — same string-in/string-out contract as SelectEditor,
 * but backed by react-select so the user can TYPE to filter a large option list
 * (e.g. hundreds of client contacts). Menu is portalled to <body> so it escapes
 * the card's overflow. Use this in place of SelectEditor whenever the option
 * list is long enough that type-ahead matters.
 */
const searchableSelectStyles: any = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: 34,
    fontFamily: FONT.body,
    fontSize: 13,
    borderRadius: RADIUS.md,
    borderColor: state.isFocused ? '#94A3B8' : C.border,
    boxShadow: 'none',
    ':hover': { borderColor: '#94A3B8' },
  }),
  valueContainer: (base: any) => ({ ...base, padding: '0 8px' }),
  input: (base: any) => ({ ...base, margin: 0, padding: 0, fontSize: 13 }),
  indicatorsContainer: (base: any) => ({ ...base, height: 32 }),
  dropdownIndicator: (base: any) => ({ ...base, padding: 4 }),
  clearIndicator: (base: any) => ({ ...base, padding: 4 }),
  indicatorSeparator: (base: any) => ({ ...base, marginTop: 6, marginBottom: 6 }),
  placeholder: (base: any) => ({ ...base, color: C.textMuted, fontSize: 13 }),
  singleValue: (base: any) => ({ ...base, color: C.textPrimary, fontSize: 13 }),
  menu: (base: any) => ({ ...base, fontFamily: FONT.body, fontSize: 13, zIndex: 9999 }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: 13,
    color: C.textPrimary,
    backgroundColor: state.isSelected ? '#E2E8F0' : state.isFocused ? '#F1F5F9' : '#fff',
  }),
};

export const SearchableSelectEditor: React.FC<{
  value: any;
  onChange: (v: string) => void;
  options: any[];
  placeholder?: string;
  showColor?: boolean;
}> = ({ value, onChange, options, placeholder = 'Select…', showColor }) => (
  <Select
    options={options}
    value={options.find(o => String(o.value) === String(value ?? '')) ?? null}
    onChange={(opt: any) => onChange(opt?.value ?? '')}
    placeholder={placeholder}
    isSearchable
    isClearable
    menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
    menuPosition="fixed"
    styles={searchableSelectStyles}
    classNamePrefix="react-select"
    components={showColor ? {
      Option: ColourOption,
      SingleValue,
      DropdownIndicator,
    } : {}}
  />
);

export const DateEditor: React.FC<{ value: any; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <input type="date" style={{ ...baseInput, cursor: 'pointer' }} value={toDateInputValue(value)} onChange={e => onChange(e.target.value)} />
);

export const ToggleEditor: React.FC<{ value: boolean; onChange: (v: boolean) => void; onLabel?: string; offLabel?: string }> = ({
  value, onChange, onLabel = 'Yes', offLabel = 'No',
}) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '5px 12px',
      borderRadius: RADIUS.full,
      border: `1px solid ${value ? '#16a34a55' : C.border}`,
      background: value ? '#edfdf3' : '#f3f4f6',
      color: value ? '#0a5c2a' : C.textSecondary,
      fontFamily: FONT.body,
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
    }}
  >
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: value ? '#17c964' : '#94A3B8' }} />
    {value ? onLabel : offLabel}
  </button>
);
