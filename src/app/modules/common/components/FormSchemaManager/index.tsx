import { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { v4 as uuidv4 } from 'uuid';
import { IFormField, IFormSection, FormFieldType } from '@models/company';
import { IconGear, IconClose } from '@app/modules/common/components/icons/OrgIcons';

export type { IFormField as SchemaField, IFormSection as SchemaSection, FormFieldType as FieldType };

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  brand: '#9D4141',
  brandSoft: '#FBEEEE',
  brandBorder: '#E8C9C9',
  ink: '#1F2430',
  inkSoft: '#5A6172',
  inkFaint: '#9AA1B1',
  line: '#E7E9EF',
  surface: '#FFFFFF',
  panel: '#F6F7F9',
  panelAlt: '#FAFBFC',
};

const TYPE_META: Record<FormFieldType, { label: string; color: string; bg: string; icon: string }> = {
  text:   { label: 'Text',     color: '#2563EB', bg: '#EAF1FE', icon: 'Aa' },
  number: { label: 'Number',   color: '#0E9F6E', bg: '#E6F6EF', icon: '#' },
  date:   { label: 'Date',     color: '#7C3AED', bg: '#F1ECFE', icon: '📅' },
  file:   { label: 'Document', color: '#C2710C', bg: '#FBF0E2', icon: '📎' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyField = (): IFormField => ({ id: uuidv4(), label: '', type: 'text', required: false, isSystem: false, value: '', showOnInfoPage: true });

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const r = [...arr];
  const [x] = r.splice(from, 1);
  r.splice(to, 0, x);
  return r;
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)}
      style={{ width: 38, height: 21, borderRadius: 999, cursor: 'pointer', background: value ? C.brand : '#CDD2DC', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: value ? 20 : 3, width: 15, height: 15, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
    </div>
  );
}

function IconBtn({ children, onClick, disabled, title, danger }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string; danger?: boolean }) {
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26,
        borderRadius: 6, fontSize: 12, lineHeight: 1, cursor: disabled ? 'not-allowed' : 'pointer',
        border: `1px solid ${danger ? '#F3C7C7' : C.line}`, background: danger ? '#FFF5F5' : '#fff',
        color: danger ? '#D14343' : C.inkSoft, opacity: disabled ? 0.4 : 1, transition: 'all .12s',
      }}>
      {children}
    </button>
  );
}

function TypeSelect({ value, onChange }: { value: FormFieldType; onChange: (v: FormFieldType) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as FormFieldType)}
      style={{ padding: '8px 10px', borderRadius: 8, fontSize: 13, border: `1px solid ${C.line}`, background: '#fff', color: C.ink, cursor: 'pointer', outline: 'none', minWidth: 130 }}>
      <option value="text">Character (Text)</option>
      <option value="number">Number</option>
      <option value="date">Date</option>
      <option value="file">Document / File</option>
    </select>
  );
}

// ─── Field card ───────────────────────────────────────────────────────────────

interface FieldCardProps {
  field: IFormField;
  idx: number;
  total: number;
  onChange: (patch: Partial<IFormField>) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onMoveToSection: (targetSectionId: string) => void;
  otherSections: { id: string; title: string }[];
  error?: string;
}

function FieldCard({ field, idx, total, onChange, onDelete, onMove, onMoveToSection, otherSections, error }: FieldCardProps) {
  const sys = field.isSystem;
  return (
    <div style={{
      background: sys ? C.panelAlt : '#fff', border: `1px solid ${error ? '#F3B4B4' : C.line}`,
      borderRadius: 10, padding: '12px 14px', marginBottom: 10, boxShadow: '0 1px 2px rgba(20,25,40,.03)',
    }}>
      {/* top row: index + badges + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.inkFaint, letterSpacing: '.5px' }}>#{idx + 1}</span>
        {sys && (
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.4px', color: C.brand, background: C.brandSoft, border: `1px solid ${C.brandBorder}`, borderRadius: 999, padding: '2px 8px' }}>BUILT-IN</span>
        )}
        <div style={{ flex: 1 }} />
        {/* Move this field to another section */}
        {otherSections.length > 0 && (
          <select
            value=""
            title="Move field to another section"
            onChange={e => { if (e.target.value) onMoveToSection(e.target.value); }}
            style={{ height: 26, borderRadius: 6, fontSize: 11.5, border: `1px solid ${C.line}`, background: '#fff', color: C.inkSoft, cursor: 'pointer', outline: 'none', maxWidth: 150 }}
          >
            <option value="">Move to…</option>
            {otherSections.map(s => <option key={s.id} value={s.id}>{s.title || 'Untitled'}</option>)}
          </select>
        )}
        <IconBtn title="Move up" disabled={idx === 0} onClick={() => onMove(-1)}>▲</IconBtn>
        <IconBtn title="Move down" disabled={idx === total - 1} onClick={() => onMove(1)}>▼</IconBtn>
        <IconBtn title={sys ? 'Hide field (its data is kept)' : 'Delete field'} danger onClick={onDelete}>✕</IconBtn>
      </div>

      {/* control row */}
      <div className="schema-field-controls" style={{ display: 'grid', gridTemplateColumns: '1fr 150px 92px 110px', gap: 12, alignItems: 'end' }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.inkSoft, display: 'block', marginBottom: 5, letterSpacing: '.3px' }}>FIELD LABEL{!sys && <span style={{ color: C.brand }}> *</span>}</label>
          <input type="text" value={field.label} placeholder="e.g. Emergency Contact"
            onChange={e => onChange({ label: e.target.value })}
            style={{ width: '100%', padding: '9px 11px', borderRadius: 8, fontSize: 13.5, fontWeight: 500, color: C.ink, border: `1px solid ${error ? '#F3B4B4' : C.line}`, background: sys ? '#fff' : C.panelAlt, outline: 'none' }} />
          {error && <div style={{ fontSize: 11, color: '#D14343', marginTop: 4 }}>{error}</div>}
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.inkSoft, display: 'block', marginBottom: 5, letterSpacing: '.3px' }}>INPUT TYPE</label>
          <TypeSelect value={field.type} onChange={type => onChange({ type })} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.inkSoft, display: 'block', marginBottom: 7, letterSpacing: '.3px' }}>REQUIRED</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Toggle value={field.required} onChange={required => onChange({ required })} />
            <span style={{ fontSize: 12, fontWeight: 600, color: field.required ? C.brand : C.inkFaint }}>{field.required ? 'Yes' : 'No'}</span>
          </div>
        </div>
        <div>
          {/* Whether this field shows on the read-only Organization Info page (undefined = shown). */}
          <label style={{ fontSize: 11, fontWeight: 700, color: C.inkSoft, display: 'block', marginBottom: 7, letterSpacing: '.3px' }}>ON INFO PAGE</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Toggle value={field.showOnInfoPage !== false} onChange={v => onChange({ showOnInfoPage: v })} />
            <span style={{ fontSize: 12, fontWeight: 600, color: field.showOnInfoPage !== false ? C.brand : C.inkFaint }}>{field.showOnInfoPage !== false ? 'Show' : 'Hide'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  show: boolean;
  sections: IFormSection[];
  onSave: (sections: IFormSection[]) => void;
  onClose: () => void;
}

export default function FormSchemaManager({ show, sections, onSave, onClose }: Props) {
  const [local, setLocal] = useState<IFormSection[]>([]);
  const [activeId, setActiveId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [titleError, setTitleError] = useState('');

  useEffect(() => {
    if (show && sections.length) {
      setLocal(sections.map(s => ({ ...s, fields: s.fields.map(f => ({ ...f })) })));
      setActiveId(sections[0].id);
      setFieldErrors({});
      setTitleError('');
    }
  }, [show]);

  const active = local.find(s => s.id === activeId);

  const patchSection = (patch: Partial<IFormSection>) =>
    setLocal(prev => prev.map(s => s.id === activeId ? { ...s, ...patch } : s));

  const patchField = (fid: string, patch: Partial<IFormField>) => {
    if (!active) return;
    patchSection({ fields: active.fields.map(f => f.id === fid ? { ...f, ...patch } : f) });
    if (patch.label !== undefined) setFieldErrors(p => { const n = { ...p }; delete n[fid]; return n; });
  };

  const addField = () => active && patchSection({ fields: [...active.fields, emptyField()] });

  // Built-in fields map to real DB columns, so "deleting" one only hides it from the
  // form (reversible, no data loss). Custom fields have no column → removed outright.
  const removeField = (fid: string) => {
    if (!active) return;
    const target = active.fields.find(f => f.id === fid);
    if (target?.isSystem) patchSection({ fields: active.fields.map(f => f.id === fid ? { ...f, hidden: true } : f) });
    else patchSection({ fields: active.fields.filter(f => f.id !== fid) });
  };
  const restoreField = (fid: string) =>
    active && patchSection({ fields: active.fields.map(f => f.id === fid ? { ...f, hidden: false } : f) });

  // Move a field out of the active section and append it to another section.
  const moveFieldToSection = (fid: string, targetSectionId: string) => {
    if (!active || targetSectionId === active.id) return;
    const field = active.fields.find(f => f.id === fid);
    if (!field) return;
    setLocal(prev => prev.map(s => {
      if (s.id === active.id) return { ...s, fields: s.fields.filter(f => f.id !== fid) };
      if (s.id === targetSectionId) return { ...s, fields: [...s.fields, field] };
      return s;
    }));
  };

  // Reorder within the visible (non-hidden) fields; hidden built-ins are kept at the end.
  const moveField = (fieldId: string, dir: -1 | 1) => {
    if (!active) return;
    const visible = active.fields.filter(f => !f.hidden);
    const hidden = active.fields.filter(f => f.hidden);
    const i = visible.findIndex(f => f.id === fieldId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= visible.length) return;
    patchSection({ fields: [...moveItem(visible, i, j), ...hidden] });
  };

  const addSection = () => {
    const id = uuidv4();
    setLocal(prev => [...prev, { id, title: 'NEW SECTION', isSystem: false, fields: [] }]);
    setActiveId(id);
    setTitleError('');
  };
  const deleteSection = (id: string) => {
    const rest = local.filter(s => s.id !== id);
    setLocal(rest);
    if (activeId === id) setActiveId(rest[rest.length - 1]?.id ?? '');
  };
  const moveSection = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next >= 0 && next < local.length) setLocal(prev => moveItem(prev, idx, next));
  };

  function validate(): boolean {
    const errs: Record<string, string> = {};
    let ok = true;
    if (active && !active.title.trim()) { setTitleError('Section name is required'); ok = false; } else setTitleError('');
    local.forEach(s => s.fields.forEach(f => { if (!f.hidden && !f.label.trim()) { errs[f.id] = 'Label is required'; ok = false; } }));
    setFieldErrors(errs);
    if (!ok) for (const s of local) if (s.fields.some(f => !f.hidden && !f.label.trim())) { setActiveId(s.id); break; }
    return ok;
  }

  const handleSave = () => { if (validate()) onSave(local); };

  const customCount = local.filter(s => !s.isSystem).length;
  const totalCustomFields = local.reduce((n, s) => n + s.fields.filter(f => !f.isSystem).length, 0);

  return (
    <>
      {/* Stacking + floating-card styling. Because this modal opens on top of the
          Edit-Profile modal, its backdrop must sit above the parent so the form
          behind is properly dimmed. */}
      <style>{`
        .schema-mgr-backdrop.modal-backdrop { z-index: 1190; background: #0E1016; }
        .schema-mgr-backdrop.modal-backdrop.show { opacity: 0.55; }
        .schema-mgr-modal { z-index: 1200; }
        .schema-mgr-dialog { max-width: 1120px; }
        .schema-mgr-content {
          border: none;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 30px 80px rgba(8, 10, 18, 0.45), 0 4px 14px rgba(8, 10, 18, 0.25);
        }

        /* Below the desktop width, keep the dialog within the viewport with a small gutter. */
        @media (max-width: 1180px) {
          .schema-mgr-dialog { max-width: calc(100% - 1rem); margin-left: auto; margin-right: auto; }
        }

        /* ── Tablet / phone: stack the two panels so the editor never gets clipped ── */
        @media (max-width: 768px) {
          .schema-mgr-body {
            flex-direction: column !important;
            height: auto !important;
            max-height: 80vh !important;
            overflow-y: auto !important;
          }
          .schema-mgr-rail {
            width: 100% !important;
            flex-shrink: 1 !important;
            border-right: none !important;
            border-bottom: 1px solid ${C.line} !important;
            max-height: 34vh;
          }
          .schema-mgr-editor { padding: 16px 16px 20px !important; }
          /* Field controls wrap instead of overflowing the narrow editor */
          .schema-field-controls {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 460px) {
          .schema-field-controls { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <Modal
        show={show}
        onHide={onClose}
        centered
        backdrop
        backdropClassName="schema-mgr-backdrop"
        dialogClassName="schema-mgr-dialog"
        contentClassName="schema-mgr-content"
        className="schema-mgr-modal"
        style={{ zIndex: 1200 }}
      >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 26px', borderBottom: `1px solid ${C.line}`, background: C.surface }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.brandSoft, border: `1px solid ${C.brandBorder}`, display: 'grid', placeItems: 'center', color: C.brand }}><IconGear size={20} /></div>
          <div>
            <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 17, color: C.ink }}>Manage Form Fields</div>
            <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 1 }}>
              {local.filter(s => s.isSystem).length} built-in · {customCount} custom section{customCount !== 1 ? 's' : ''} · {totalCustomFields} custom field{totalCustomFields !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff', color: C.inkSoft, cursor: 'pointer', display: 'grid', placeItems: 'center' }}><IconClose size={16} /></button>
      </div>

      {/* Body */}
      <div className="schema-mgr-body" style={{ display: 'flex', height: '70vh', overflow: 'hidden', background: C.panel }}>

        {/* Left rail */}
        <div className="schema-mgr-rail" style={{ width: 248, flexShrink: 0, borderRight: `1px solid ${C.line}`, background: C.surface, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px 8px', fontSize: 11, fontWeight: 700, color: C.inkFaint, letterSpacing: '.8px' }}>SECTIONS</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px' }}>
            {local.map((s, i) => {
              const on = s.id === activeId;
              const cf = s.fields.filter(f => !f.isSystem).length;
              return (
                <div key={s.id} onClick={() => setActiveId(s.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 11px', borderRadius: 9, marginBottom: 4, cursor: 'pointer', background: on ? C.brandSoft : 'transparent', border: `1px solid ${on ? C.brandBorder : 'transparent'}`, transition: 'all .12s' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: on ? 700 : 600, color: on ? C.brand : C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title || 'Untitled'}</div>
                    <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 1 }}>
                      {s.fields.filter(f => f.isSystem).length} built-in{cf > 0 ? ` · +${cf} custom` : ''}
                    </div>
                  </div>
                  {on && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <button type="button" disabled={i === 0} onClick={e => { e.stopPropagation(); moveSection(i, -1); }} style={{ border: 'none', background: 'none', fontSize: 9, cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 0.7, padding: 0, color: C.brand, lineHeight: 1 }}>▲</button>
                      <button type="button" disabled={i === local.length - 1} onClick={e => { e.stopPropagation(); moveSection(i, 1); }} style={{ border: 'none', background: 'none', fontSize: 9, cursor: i === local.length - 1 ? 'default' : 'pointer', opacity: i === local.length - 1 ? 0.3 : 0.7, padding: 0, color: C.brand, lineHeight: 1 }}>▼</button>
                    </div>
                  )}
                  {!s.isSystem && (
                    <button type="button" title="Delete section" onClick={e => { e.stopPropagation(); deleteSection(s.id); }}
                      style={{ border: 'none', background: 'none', fontSize: 13, color: '#D14343', cursor: 'pointer', opacity: 0.65, padding: '0 2px', lineHeight: 1 }}>✕</button>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ padding: 12, borderTop: `1px solid ${C.line}` }}>
            <button type="button" onClick={addSection}
              style={{ width: '100%', background: C.brandSoft, border: `1.5px dashed ${C.brand}`, borderRadius: 9, padding: 10, color: C.brand, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              + Add New Section
            </button>
          </div>
        </div>

        {/* Right editor */}
        <div className="schema-mgr-editor" style={{ flex: 1, overflowY: 'auto', padding: '24px 30px', background: C.panel }}>
          {active ? (
            <>
              {/* Section title (editable for all sections) */}
              <div style={{ marginBottom: 22 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.inkSoft, display: 'block', marginBottom: 6, letterSpacing: '.4px' }}>
                  SECTION NAME <span style={{ color: C.brand }}>*</span>
                </label>
                <input type="text" value={active.title} placeholder="e.g. BASIC INFORMATION"
                  onChange={e => { patchSection({ title: e.target.value.toUpperCase() }); setTitleError(''); }}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 16, fontWeight: 700, letterSpacing: '.5px', color: C.brand, border: `1.5px solid ${titleError ? '#F3B4B4' : C.line}`, background: '#fff', outline: 'none' }} />
                {titleError && <div style={{ fontSize: 12, color: '#D14343', marginTop: 5 }}>{titleError}</div>}
                <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 6 }}>
                  {active.isSystem ? 'Built-in section — rename freely, fields below can be reordered and customised.' : 'Custom section — fully editable.'}
                </div>

                {/* Whether this whole section appears on the read-only Organization Info page. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '10px 14px', border: `1px solid ${C.line}`, borderRadius: 10, background: '#fff' }}>
                  <Toggle value={active.showOnInfoPage !== false} onChange={v => patchSection({ showOnInfoPage: v })} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: active.showOnInfoPage !== false ? C.brand : C.inkFaint }}>
                      {active.showOnInfoPage !== false ? 'Shown on Organization Info page' : 'Hidden from Organization Info page'}
                    </div>
                    <div style={{ fontSize: 11, color: C.inkFaint }}>Controls the whole section on the read-only info view (fields can be toggled individually below).</div>
                  </div>
                </div>
              </div>

              {/* Fields header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: '.4px' }}>FIELDS</span>
                <div style={{ flex: 1, height: 1, background: C.line }} />
                <button type="button" onClick={addField}
                  style={{ background: C.brand, border: 'none', borderRadius: 8, padding: '7px 16px', color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', boxShadow: '0 1px 3px rgba(157,65,65,.3)' }}>
                  + Add Field
                </button>
              </div>

              {(() => {
                const visibleFields = active.fields.filter(f => !f.hidden);
                const hiddenFields = active.fields.filter(f => f.hidden);
                const otherSections = local.filter(s => s.id !== active.id).map(s => ({ id: s.id, title: s.title }));
                return (
                  <>
                    {visibleFields.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '48px 20px', border: `2px dashed ${C.line}`, borderRadius: 12, color: C.inkFaint, background: '#fff' }}>
                        <div style={{ fontSize: 30, marginBottom: 8 }}>＋</div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: C.inkSoft }}>No fields yet</div>
                        <div style={{ fontSize: 13 }}>Click “+ Add Field” to start building this section</div>
                      </div>
                    ) : (
                      visibleFields.map((f, i) => (
                        <FieldCard key={f.id} field={f} idx={i} total={visibleFields.length}
                          onChange={patch => patchField(f.id, patch)} onDelete={() => removeField(f.id)}
                          onMove={dir => moveField(f.id, dir)} onMoveToSection={target => moveFieldToSection(f.id, target)}
                          otherSections={otherSections} error={fieldErrors[f.id]} />
                      ))
                    )}

                    {/* Hidden built-in fields — kept in the DB, removed from the form. Restore anytime. */}
                    {hiddenFields.length > 0 && (
                      <div style={{ marginTop: 18, padding: '12px 14px', border: `1px dashed ${C.line}`, borderRadius: 10, background: C.panelAlt }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.inkSoft, letterSpacing: '.4px', marginBottom: 10 }}>HIDDEN FIELDS · {hiddenFields.length}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {hiddenFields.map(f => (
                            <div key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 999, padding: '5px 6px 5px 12px' }}>
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>{f.label}</span>
                              <button type="button" onClick={() => restoreField(f.id)} title="Restore field to the form"
                                style={{ border: `1px solid ${C.brandBorder}`, background: C.brandSoft, color: C.brand, borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '3px 10px', cursor: 'pointer' }}>
                                Restore
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: C.inkFaint, fontSize: 14 }}>Select a section</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center', padding: '14px 26px', borderTop: `1px solid ${C.line}`, background: C.surface }}>
        <span style={{ fontSize: 12, color: C.inkFaint }}>Changes apply after you click <b style={{ color: C.inkSoft }}>Update</b> on the form.</span>
        <div style={{ display: 'flex', gap: 10, flexGrow: 1, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 8, padding: '9px 22px', fontWeight: 600, color: C.inkSoft, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
          <button type="button" onClick={handleSave} style={{ background: C.brand, border: 'none', borderRadius: 8, padding: '9px 28px', fontWeight: 700, color: '#fff', cursor: 'pointer', fontSize: 14, boxShadow: '0 1px 3px rgba(157,65,65,.3)' }}>Apply Changes</button>
        </div>
      </div>
      </Modal>
    </>
  );
}
