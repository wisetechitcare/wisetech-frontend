import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ArrowDown, ArrowUp, EyeOff, FolderInput, ListPlus, Plus, Settings2, Trash2 } from 'lucide-react';
import { IFormField, IFormSection, FormFieldType, BuiltinInputKind } from '@models/company';
import { Badge } from '@/ds/ui/badge';
import { Button } from '@/ds/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuGroup, DropdownMenuTrigger,
} from '@/ds/ui/dropdown-menu';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/ds/ui/field';
import { Input } from '@/ds/ui/input';
import { Item } from '@/ds/ui/item';
import { Label } from '@/ds/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/ui/select';
import { Switch } from '@/ds/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ds/ui/tooltip';
import { cn } from '@/ds/lib/utils';
import { AutoGrid } from '@/ds/patterns/auto-grid';
import { EmptyState } from '@/ds/patterns/empty-state';
import { FormDialog } from '@/ds/patterns/form-dialog';
import { RowAction } from '@/ds/patterns/row-action';

export type { IFormField as SchemaField, IFormSection as SchemaSection, FormFieldType as FieldType };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyField = (): IFormField => ({ id: uuidv4(), label: '', type: 'text', required: false, isSystem: false, value: '', showOnInfoPage: true });

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const r = [...arr];
  const [x] = r.splice(from, 1);
  r.splice(to, 0, x);
  return r;
}

/** The types a CUSTOM field can take. */
const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: 'Character (Text)' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'file', label: 'Document / File' },
];

/** How a built-in's bespoke widget reads in the (locked) Input type box. */
const INPUT_KIND_LABEL: Record<BuiltinInputKind, string> = {
  text: 'Character (Text)',
  longText: 'Long text',
  number: 'Number',
  phone: 'Phone number',
  email: 'Email',
  url: 'Link (URL)',
  select: 'Dropdown (single)',
  multiSelect: 'Dropdown (multiple)',
  toggle: 'Yes / No',
  date: 'Date',
  file: 'Document / File',
  coordinate: 'Coordinate',
  referenceList: 'Reference list',
};

/** A labelled on/off setting: kit Switch with its label and the state in words beside it. */
function SettingSwitch({ id, label, checked, onChange, disabled, onText, offText }: {
  id: string; label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; onText: string; offText: string;
}) {
  return (
    <div className="flex min-h-10 flex-col justify-center gap-1.5">
      <Label htmlFor={id} className="heading-case text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={(v) => onChange(!!v)} />
        <span className={cn('text-sm font-medium', checked ? 'text-foreground' : 'text-muted-foreground')}>{checked ? onText : offText}</span>
      </div>
    </div>
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
  const required = !!(field.essential || field.required);
  const labelId = `schema-field-${field.id}-label`;
  const typeId = `schema-field-${field.id}-type`;
  const name = field.label || `Field ${idx + 1}`;
  return (
    <Item variant="outline" className={cn('flex-col items-stretch gap-3', sys && 'bg-muted/30', error && 'border-destructive')}>
      {/* Top row: position, kind, and the field's actions (rows: icons left of text, actions right). */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="tabular text-xs font-semibold text-muted-foreground">#{idx + 1}</span>
        {sys && <Badge variant="brand">Built-in</Badge>}
        <div className="ml-auto flex items-center gap-1.5">
          {otherSections.length > 0 && !field.fixedSection && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger
                  render={<DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" aria-label={`Move ${name} to another section`} />} />}
                >
                  <FolderInput aria-hidden />
                </TooltipTrigger>
                <TooltipContent>Move to another section</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Move to</DropdownMenuLabel>
                  {otherSections.map(s => (
                    <DropdownMenuItem key={s.id} onClick={() => onMoveToSection(s.id)}>{s.title || 'Untitled'}</DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <RowAction size="icon-sm" label={`Move ${name} up`} disabled={idx === 0} onClick={() => onMove(-1)}><ArrowUp aria-hidden /></RowAction>
          <RowAction size="icon-sm" label={`Move ${name} down`} disabled={idx === total - 1} onClick={() => onMove(1)}><ArrowDown aria-hidden /></RowAction>
          {/* Built-in fields can be renamed, required, reordered and moved — never removed.
              Only custom fields carry a delete. */}
          {!sys && <RowAction size="icon-sm" tint="danger" label={`Delete ${name}`} onClick={onDelete}><Trash2 aria-hidden /></RowAction>}
        </div>
      </div>

      {/* Controls: four across while there is room, fewer as it narrows. */}
      <AutoGrid min={170} stretch>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor={labelId}>Field label</FieldLabel>
          <Input
            id={labelId}
            value={field.label}
            required={!sys}
            placeholder="e.g. Emergency contact"
            onChange={e => onChange({ label: e.target.value })}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${labelId}-error` : undefined}
          />
          {error && <FieldError id={`${labelId}-error`}>{error}</FieldError>}
        </Field>
        <Field>
          <FieldLabel id={typeId}>Input type</FieldLabel>
          {field.fixedType && field.inputKind ? (
            // A built-in with its own widget: what that widget takes, read-only. The custom-field types would
            // mislabel it (a phone input is not "Character (Text)").
            <Select items={[{ value: field.inputKind, label: INPUT_KIND_LABEL[field.inputKind] }]} value={field.inputKind} disabled>
              <SelectTrigger className="w-full" aria-labelledby={typeId}><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={field.inputKind}>{INPUT_KIND_LABEL[field.inputKind]}</SelectItem></SelectContent>
            </Select>
          ) : (
            <Select items={FIELD_TYPES} value={field.type} disabled={field.fixedType} onValueChange={v => v && onChange({ type: v as FormFieldType })}>
              <SelectTrigger className="w-full" aria-labelledby={typeId}><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </Field>
        <SettingSwitch
          id={`schema-field-${field.id}-required`}
          label="Required"
          checked={required}
          disabled={field.essential}
          onChange={v => onChange({ required: v })}
          onText={field.essential ? 'Always' : 'Yes'}
          offText="No"
        />
        {/* Whether this field shows on the read-only info page (undefined = shown). */}
        <SettingSwitch
          id={`schema-field-${field.id}-info`}
          label="On info page"
          checked={field.showOnInfoPage !== false}
          onChange={v => onChange({ showOnInfoPage: v })}
          onText="Show"
          offText="Hide"
        />
      </AutoGrid>
    </Item>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  show: boolean;
  sections: IFormSection[];
  onSave: (sections: IFormSection[]) => void;
  onClose: () => void;
  // Label for the "shown on … Info page" toggle (e.g. "Organization" or "Company").
  infoPageLabel?: string;
}

const FORM_ID = 'form-schema-manager';

/**
 * Manage a form's sections and fields (the organization profile and the client company / sub-company / branch
 * forms). A kit Form Dialog: section list on the left, the chosen section's fields on the right, Apply in the
 * footer; closing with changes asks first. Changes reach the form only when the caller saves it.
 */
export default function FormSchemaManager({ show, sections, onSave, onClose, infoPageLabel = 'Organization' }: Props) {
  const [local, setLocal] = useState<IFormSection[]>([]);
  const [opened, setOpened] = useState('');
  const [activeId, setActiveId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [titleError, setTitleError] = useState('');

  useEffect(() => {
    if (show && sections.length) {
      const copy = sections.map(s => ({ ...s, fields: s.fields.map(f => ({ ...f })) }));
      setLocal(copy);
      setOpened(JSON.stringify(copy));
      setActiveId(sections[0].id);
      setFieldErrors({});
      setTitleError('');
    }
    // Reset only when the dialog opens: the caller's sections are the starting point, not a live source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const dirty = useMemo(() => !!opened && JSON.stringify(local) !== opened, [local, opened]);
  const active = local.find(s => s.id === activeId);

  const patchSection = (patch: Partial<IFormSection>) =>
    setLocal(prev => prev.map(s => s.id === activeId ? { ...s, ...patch } : s));

  const patchField = (fid: string, patch: Partial<IFormField>) => {
    if (!active) return;
    patchSection({ fields: active.fields.map(f => f.id === fid ? { ...f, ...patch } : f) });
    if (patch.label !== undefined) setFieldErrors(p => { const n = { ...p }; delete n[fid]; return n; });
  };

  const addField = () => active && patchSection({ fields: [...active.fields, emptyField()] });

  // Only CUSTOM fields can be removed. Built-ins map to real columns and stay on the form —
  // they can be edited, reordered and moved, not deleted (no button is offered; this guard
  // keeps it that way for any other caller). Built-ins hidden by older configs can still be
  // restored from the "Hidden fields" list below.
  const removeField = (fid: string) => {
    if (!active) return;
    if (active.fields.find(f => f.id === fid)?.isSystem) return;
    patchSection({ fields: active.fields.filter(f => f.id !== fid) });
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
  // A custom section may hold built-in fields an admin moved there. Deleting the section
  // removes its custom fields only; the built-ins go back to the first built-in section.
  const deleteSection = (id: string) => {
    const builtIns = local.find(s => s.id === id)?.fields.filter(f => f.isSystem) ?? [];
    let rest = local.filter(s => s.id !== id);
    if (builtIns.length) {
      const home = rest.find(s => s.isSystem) ?? rest[0];
      if (home) rest = rest.map(s => (s.id === home.id ? { ...s, fields: [...s.fields, ...builtIns] } : s));
    }
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

  const builtinCount = local.filter(s => s.isSystem).length;
  const customCount = local.filter(s => !s.isSystem).length;
  const totalCustomFields = local.reduce((n, s) => n + s.fields.filter(f => !f.isSystem).length, 0);

  const visibleFields = active ? active.fields.filter(f => !f.hidden) : [];
  const hiddenFields = active ? active.fields.filter(f => f.hidden) : [];
  const otherSections = active ? local.filter(s => s.id !== active.id).map(s => ({ id: s.id, title: s.title })) : [];

  return (
    <FormDialog
      open={show}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title="Manage form fields"
      description={`${builtinCount} built-in · ${customCount} custom section${customCount !== 1 ? 's' : ''} · ${totalCustomFields} custom field${totalCustomFields !== 1 ? 's' : ''}`}
      icon={<Settings2 aria-hidden />}
      tone="blue"
      size="2xl"
      formId={FORM_ID}
      submitLabel="Apply changes"
      dirty={dirty}
      footerStart={<span className="text-xs text-muted-foreground">Changes apply after you save the form.</span>}
    >
      <form id={FORM_ID} noValidate onSubmit={(e) => { e.preventDefault(); handleSave(); }}
        className="grid gap-6 md:grid-cols-[minmax(14rem,16rem)_minmax(0,1fr)]">
        {/* Sections: the list to choose from, with its own move / delete beside each row. */}
        <nav aria-label="Sections" className="flex flex-col gap-2 md:sticky md:top-0 md:self-start">
          <p className="heading-case text-xs font-semibold text-muted-foreground">Sections</p>
          <ul className="flex flex-col gap-1">
            {local.map((s, i) => {
              const on = s.id === activeId;
              const custom = s.fields.filter(f => !f.isSystem).length;
              const builtIn = s.fields.filter(f => f.isSystem).length;
              const title = s.title || 'Untitled';
              return (
                <li key={s.id} className={cn('flex items-center gap-1 rounded-xl pr-1', on && 'bg-accent')}>
                  <Item
                    size="xs"
                    render={<button type="button" />}
                    onClick={() => setActiveId(s.id)}
                    aria-current={on || undefined}
                    className="min-w-0 flex-1 flex-nowrap text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm', on ? 'font-semibold text-accent-foreground' : 'font-medium')}>{title}</span>
                      <span className="block text-xs text-muted-foreground">{builtIn} built-in{custom > 0 ? ` · +${custom} custom` : ''}</span>
                    </span>
                  </Item>
                  {on && (
                    <>
                      <RowAction size="icon-sm" label={`Move ${title} up`} disabled={i === 0} onClick={() => moveSection(i, -1)}><ArrowUp aria-hidden /></RowAction>
                      <RowAction size="icon-sm" label={`Move ${title} down`} disabled={i === local.length - 1} onClick={() => moveSection(i, 1)}><ArrowDown aria-hidden /></RowAction>
                    </>
                  )}
                  {!s.isSystem && (
                    <RowAction size="icon-sm" tint="danger" label={`Delete ${title}`} onClick={() => deleteSection(s.id)}><Trash2 aria-hidden /></RowAction>
                  )}
                </li>
              );
            })}
          </ul>
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={addSection}>
            <ListPlus data-icon="inline-start" aria-hidden /> Add section
          </Button>
        </nav>

        {/* The chosen section: its name, whether it shows on the info page, then its fields. */}
        <div className="min-w-0 space-y-6">
          {active ? (
            <>
              <div className="space-y-3">
                <Field data-invalid={titleError ? true : undefined}>
                  <FieldLabel htmlFor="schema-section-title">Section name</FieldLabel>
                  <Input
                    id="schema-section-title"
                    required
                    value={active.title}
                    placeholder="e.g. BASIC INFORMATION"
                    // Section titles are stored in capitals (they render as the form's headings).
                    onChange={e => { patchSection({ title: e.target.value.toUpperCase() }); setTitleError(''); }}
                    aria-invalid={titleError ? true : undefined}
                    aria-describedby={titleError ? 'schema-section-title-error' : undefined}
                  />
                  {titleError
                    ? <FieldError id="schema-section-title-error">{titleError}</FieldError>
                    : <FieldDescription>{active.isSystem ? 'Built-in section — rename freely. Built-in fields can be reordered, moved and customised, but not deleted.' : 'Custom section — fully editable.'}</FieldDescription>}
                </Field>

                {/* Whether this whole section appears on the read-only info page. */}
                <Item variant="outline" size="sm">
                  <Switch id="schema-section-info" checked={active.showOnInfoPage !== false} onCheckedChange={(v) => patchSection({ showOnInfoPage: !!v })} />
                  <Label htmlFor="schema-section-info" className="flex min-w-0 flex-1 flex-col items-start gap-0.5 font-normal">
                    <span className="font-medium">
                      {active.showOnInfoPage !== false ? `Shown on ${infoPageLabel} Info page` : `Hidden from ${infoPageLabel} Info page`}
                    </span>
                    <span className="text-xs text-muted-foreground">Controls the whole section on the read-only info view (fields can be toggled individually below).</span>
                  </Label>
                </Item>
              </div>

              <section aria-labelledby="schema-fields-heading" className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 id="schema-fields-heading" className="heading-case text-xs font-semibold text-muted-foreground">Fields</h3>
                  <div aria-hidden className="h-px flex-1 bg-border" />
                  <Button type="button" size="sm" onClick={addField}>
                    <Plus data-icon="inline-start" aria-hidden /> Add field
                  </Button>
                </div>

                {visibleFields.length === 0 ? (
                  <EmptyState
                    size="sm"
                    icon={<ListPlus aria-hidden />}
                    title="No fields yet"
                    description="Use Add field to start building this section."
                  />
                ) : (
                  <div className="space-y-3">
                    {visibleFields.map((f, i) => (
                      <FieldCard key={f.id} field={f} idx={i} total={visibleFields.length}
                        onChange={patch => patchField(f.id, patch)} onDelete={() => removeField(f.id)}
                        onMove={dir => moveField(f.id, dir)} onMoveToSection={target => moveFieldToSection(f.id, target)}
                        otherSections={otherSections} error={fieldErrors[f.id]} />
                    ))}
                  </div>
                )}

                {/* Hidden built-in fields — kept in the DB, removed from the form. Restore anytime. */}
                {hiddenFields.length > 0 && (
                  <Item variant="muted" className="flex-col items-stretch gap-2.5">
                    <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <EyeOff className="size-3.5" aria-hidden /> <span className="heading-case">Hidden fields · {hiddenFields.length}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {hiddenFields.map(f => (
                        <span key={f.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-background py-1 pr-1 pl-3 text-sm">
                          {f.label}
                          <Button type="button" variant="tinted" size="xs" onClick={() => restoreField(f.id)}>Restore</Button>
                        </span>
                      ))}
                    </div>
                  </Item>
                )}
              </section>
            </>
          ) : (
            <EmptyState size="sm" title="Select a section" />
          )}
        </div>
      </form>
    </FormDialog>
  );
}
