import React, { useEffect, useId, useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { Button } from '@/ds/ui/button';
import { Field, FieldError, FieldLabel } from '@/ds/ui/field';
import { Input } from '@/ds/ui/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/ds/ui/input-group';

interface PrefixInlineEditProps {
  value: string; // Full prefix like "testLead/2024-25/32"
  label: string; // Field label like "Inquiry No." or "Project No."
  onChange: (newPrefix: string) => void;
  disabled?: boolean;
  required?: boolean;
  /** Server / form level error shown under the field. */
  error?: string | null;
  className?: string;
}

interface PrefixParts {
  prefix: string;
  year: string;
  count: string;
}

/** The last two segments are year + count; everything before is the prefix (which may itself contain '/'). */
const parsePrefix = (prefixValue: string): PrefixParts => {
  if (!prefixValue || !prefixValue.includes('/')) return { prefix: '', year: '', count: '' };
  const parts = prefixValue.split('/').filter(Boolean);
  if (parts.length >= 3) {
    return { prefix: parts.slice(0, -2).join('/'), year: parts[parts.length - 2], count: parts[parts.length - 1] };
  }
  return { prefix: parts[0] || '', year: parts[1] || '', count: parts[2] || '' };
};

const validate = (v: PrefixParts): Partial<PrefixParts> => {
  const errors: Partial<PrefixParts> = {};
  if (!v.prefix.trim()) errors.prefix = 'Prefix is required';
  if (!v.year.trim()) errors.year = 'Year is required';
  if (!v.count.trim()) errors.count = 'Count is required';
  else if (!/^\d+$/.test(v.count.trim())) errors.count = 'Only numbers are allowed';
  return errors;
};

const PrefixInlineEdit: React.FC<PrefixInlineEditProps> = ({
  value, label, onChange, disabled = false, required = false, error, className,
}) => {
  const id = useId();
  const [isEditing, setIsEditing] = useState(false);
  const [edit, setEdit] = useState<PrefixParts>({ prefix: '', year: '', count: '' });
  const [errors, setErrors] = useState<Partial<PrefixParts>>({});

  useEffect(() => { setEdit(parsePrefix(value)); }, [value]);

  const cancel = () => {
    setIsEditing(false);
    setEdit(parsePrefix(value));
    setErrors({});
  };

  const save = () => {
    const found = validate(edit);
    setErrors(found);
    if (Object.keys(found).length) return;
    // Preserve a multi-segment prefix (e.g. "WT/Lead").
    const prefix = edit.prefix.split('/').map((p) => p.trim()).filter(Boolean).join('/');
    onChange(`${prefix}/${edit.year.trim()}/${edit.count.trim()}`);
    setIsEditing(false);
  };

  const set = (field: keyof PrefixParts, next: string) => {
    // The count is a number: reject anything else on the spot.
    if (field === 'count' && next !== '' && !/^\d+$/.test(next)) {
      setErrors((e) => ({ ...e, count: 'Only numbers are allowed' }));
      return;
    }
    setEdit((e) => ({ ...e, [field]: next }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    else if (e.key === 'Escape') cancel();
  };

  const editErrors = [errors.prefix, errors.year, errors.count].filter(Boolean).join(' · ');
  const message = editErrors || error || undefined;

  const header = label && (
    <FieldLabel htmlFor={id}>
      {label}
      {required && <span aria-hidden className="text-destructive">*</span>}
    </FieldLabel>
  );

  if (!value) {
    return (
      <Field className={className}>
        {header}
        <InputGroup>
          <InputGroupInput id={id} readOnly value="" placeholder="Not generated" />
        </InputGroup>
      </Field>
    );
  }

  return (
    <Field className={className} data-invalid={message ? true : undefined}>
      {header}
      {isEditing ? (
        <div className="flex items-center gap-1.5">
          <Input id={id} autoFocus value={edit.prefix} placeholder="Prefix" aria-label="Prefix"
            aria-invalid={errors.prefix ? true : undefined} onChange={(e) => set('prefix', e.target.value)} onKeyDown={onKeyDown}
            className="min-w-0 flex-[2] text-center" />
          <span aria-hidden className="text-muted-foreground">/</span>
          <Input value={edit.year} placeholder="Year" aria-label="Year"
            aria-invalid={errors.year ? true : undefined} onChange={(e) => set('year', e.target.value)} onKeyDown={onKeyDown}
            className="min-w-0 flex-[1.4] text-center" />
          <span aria-hidden className="text-muted-foreground">/</span>
          <Input value={edit.count} placeholder="Count" aria-label="Count" inputMode="numeric"
            aria-invalid={errors.count ? true : undefined} onChange={(e) => set('count', e.target.value)} onKeyDown={onKeyDown}
            className="min-w-0 flex-1 text-center" />
          <Button type="button" variant="tinted" size="icon-sm" title="Save" aria-label="Save"
            style={{ '--tint': 'var(--success)' } as React.CSSProperties} onClick={save}>
            <Check />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" title="Cancel" aria-label="Cancel" onClick={cancel}>
            <X />
          </Button>
        </div>
      ) : (
        <InputGroup>
          <InputGroupInput id={id} readOnly value={value} aria-invalid={message ? true : undefined} />
          {!disabled && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton type="button" size="icon-xs" variant="ghost" title="Edit number" aria-label={`Edit ${label || 'number'}`} onClick={() => { setIsEditing(true); setErrors({}); }}>
                <Pencil />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      )}
      {message && <FieldError>{message}</FieldError>}
    </Field>
  );
};

export default PrefixInlineEdit;
