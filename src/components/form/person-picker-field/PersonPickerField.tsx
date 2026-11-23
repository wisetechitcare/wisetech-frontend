import { useId, useMemo } from "react";
import type { FieldError } from "react-hook-form";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/ds/ui/combobox";
import { Avatar, AvatarFallback, AvatarImage, AvatarSize } from "@/ds/ui/avatar";
import { Field, FieldDescription, FieldError as FieldErrorMessage, FieldLabel } from "@/ds/ui/field";

import {
  FIELD_CHIP_RADIUS,
  FIELD_CONTROL_RADIUS,
  FIELD_MENU_RADIUS,
  hasFieldError,
  resolveFieldHint,
} from "@/components/form/common";
import { cn } from "@/lib/utils";

export interface PersonOption {
  id: string;
  name: string;
  code?: string;
  subtitle?: string;
  avatarUrl?: string;
}

export interface PersonPickerFieldProps {
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  labelClassName?: string;
  error?: boolean | FieldError;
  hint?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  people: PersonOption[];
  /** Chosen person ids. */
  value?: string[];
  onChange?: (ids: string[]) => void;
  multiple?: boolean;
  onBlur?: () => void;
}

function PersonAvatar({ person, size = AvatarSize.SM }: { person: PersonOption; size?: `${AvatarSize}` }) {
  return (
    <Avatar size={size}>
      {person.avatarUrl ? <AvatarImage src={person.avatarUrl} alt={person.name} /> : null}
      <AvatarFallback name={person.name} />
    </Avatar>
  );
}

function PersonOptionRow({ person }: { person: PersonOption }) {
  const secondary = [person.code, person.subtitle].filter(Boolean).join(" · ");

  return (
    <>
      <PersonAvatar person={person} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{person.name}</p>
        {secondary ? (
          <p className="truncate text-xs text-muted-foreground">{secondary}</p>
        ) : null}
      </div>
    </>
  );
}

/**
 * People picker for forms — Storybook form field that reuses Components/Avatar
 * (same API, sizes and fallbacks) for option rows and selected chips.
 * Clear (X) on single select stays on the right via ComboboxInput.
 */
const PersonPickerField = ({
  id,
  name,
  label,
  required = false,
  labelClassName,
  error,
  hint,
  disabled = false,
  className,
  placeholder = "Search by name or code",
  people,
  value = [],
  onChange,
  multiple = false,
  onBlur,
}: PersonPickerFieldProps) => {
  const generatedId = useId();
  const isError = hasFieldError(error);
  const resolvedHint = resolveFieldHint(hint, error);
  const controlId = id ?? name ?? generatedId;
  const labelId = `${controlId}-label`;
  const anchor = useComboboxAnchor();

  const byId = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const selected = value
    .map((personId) => byId.get(personId))
    .filter((person): person is PersonOption => !!person);

  const filter = (person: PersonOption, query: string) => {
    const normalized = query.trim().toLowerCase();
    return (
      !normalized ||
      person.name.toLowerCase().includes(normalized) ||
      (person.code ?? "").toLowerCase().includes(normalized)
    );
  };

  const list = (
    <>
      <ComboboxEmpty>No one matches. Check the spelling or the employee code.</ComboboxEmpty>
      <ComboboxList>
        {(person: PersonOption) => (
          <ComboboxItem key={person.id} value={person}>
            <PersonOptionRow person={person} />
          </ComboboxItem>
        )}
      </ComboboxList>
    </>
  );

  return (
    <Field
      data-invalid={isError || undefined}
      data-disabled={disabled || undefined}
      data-filled={value.length > 0 ? "true" : undefined}
      className={cn("w-full min-w-0", className)}
      onBlur={onBlur}
    >
      {label && (
        <FieldLabel
          id={labelId}
          htmlFor={multiple ? undefined : controlId}
          className={labelClassName}
        >
          {label}
        </FieldLabel>
      )}

      {required && <span className="sr-only" aria-required="true" />}

      {multiple ? (
        <Combobox
          multiple
          items={people}
          value={selected}
          onValueChange={(next: PersonOption[]) => onChange?.(next.map((person) => person.id))}
          itemToStringLabel={(person: PersonOption | null) => person?.name ?? ""}
          isItemEqualToValue={(a: PersonOption, b: PersonOption) => a.id === b.id}
          filter={filter}
          disabled={disabled}
        >
          <ComboboxChips
            ref={anchor}
            aria-invalid={isError || undefined}
            className={cn("min-h-11", FIELD_CONTROL_RADIUS)}
          >
            <ComboboxValue>
              {(values: PersonOption[]) => (
                <>
                  {values.map((person) => (
                    <ComboboxChip key={person.id} className={FIELD_CHIP_RADIUS}>
                      <PersonAvatar person={person} size={AvatarSize.SM} />
                      {person.name}
                    </ComboboxChip>
                  ))}
                  <ComboboxChipsInput
                    id={controlId}
                    aria-labelledby={label ? labelId : undefined}
                    placeholder={values.length ? "" : placeholder}
                  />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={anchor} className={FIELD_MENU_RADIUS}>
            {list}
          </ComboboxContent>
        </Combobox>
      ) : (
        <Combobox
          items={people}
          value={selected[0] ?? null}
          onValueChange={(next: PersonOption | null) => onChange?.(next ? [next.id] : [])}
          itemToStringLabel={(person: PersonOption | null) => person?.name ?? ""}
          isItemEqualToValue={(a: PersonOption, b: PersonOption) => a.id === b.id}
          filter={filter}
          disabled={disabled}
        >
          <ComboboxInput
            id={controlId}
            placeholder={placeholder}
            showClear
            disabled={disabled}
            aria-invalid={isError || undefined}
            className={cn("h-11 w-full", FIELD_CONTROL_RADIUS)}
          />
          <ComboboxContent className={FIELD_MENU_RADIUS}>{list}</ComboboxContent>
        </Combobox>
      )}

      {resolvedHint &&
        (isError ? (
          <FieldErrorMessage>{resolvedHint}</FieldErrorMessage>
        ) : (
          <FieldDescription>{resolvedHint}</FieldDescription>
        ))}
    </Field>
  );
};

PersonPickerField.displayName = "PersonPickerField";

export default PersonPickerField;
