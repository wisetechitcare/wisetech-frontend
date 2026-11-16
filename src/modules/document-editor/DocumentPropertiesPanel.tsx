import React, { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { Badge } from "@/ds/ui/badge";
import { Card, CardContent } from "@/ds/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ds/ui/collapsible";
import { Field, FieldDescription, FieldLabel } from "@/ds/ui/field";
import { Input } from "@/ds/ui/input";
import { Textarea } from "@/ds/ui/textarea";
import { IconBox } from "@/ds/patterns/icon-box";
import { cn } from "@/ds/lib/utils";
import { AppIcon } from "@app/modules/common/components/ui/AppIcon";
import type { FieldPolicy } from "@services/documents";
import {
  ADDRESS_SOURCE_LABELS,
  activeAddressSource,
  addressSourceOptions,
  companyAddressOptions,
  contactSourceOptions,
  partyOptions,
  fieldMeta as metaOf,
  isSectionOff as sectionOff,
  groupFields as groupOf,
  groupIcon,
  type AddressSource,
} from "./fields";
import type { DocumentProfile } from "./types";
import LabelledSwitch from "./LabelledSwitch";
import { MiniSelect, Segmented } from "./controls";

/**
 * The property inspector: what this TEMPLATE lets the user change, grouped into cards — source pickers, section
 * switches and the fields the page can't type into itself — plus a collapsed list of what the record fills in.
 */

/** A small tinted tile for a section's icon. */
const SectionIcon: React.FC<{ name: string; tone?: "brand" | "slate" }> = ({ name, tone = "brand" }) => (
  <IconBox size="sm" tone={tone} className="size-6 rounded-md [&>svg]:size-3.5" icon={<AppIcon name={name} className="fs-8" />} />
);

/**
 * One extra picker (company, address variant, contact person) under a source switch. Label above, control full
 * width: a name like "STUDIO T › demo" needs the room, and side-by-side squeezed it into a clipped pill.
 */
const PickerRow: React.FC<{ label: string; children: React.ReactNode; note?: React.ReactNode }> = ({ label, children, note }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    {children}
    {note}
  </div>
);

export interface DocumentPropertiesPanelProps {
  profile: DocumentProfile;
  policy: FieldPolicy;
  values: Record<string, string>;
  disabled: boolean;
  onChange: (field: string, value: string) => void;
  /** The document's locked reference data — only `source_*` keys are read here. */
  mergeData?: Record<string, unknown>;
  /**
   * Fields typed directly on the page. Their text inputs are left out here, so this
   * panel only carries what the page can't: source pickers, switches, and any
   * editable field the template doesn't print.
   */
  inlineFields?: ReadonlySet<string>;
}

const DocumentPropertiesPanel: React.FC<DocumentPropertiesPanelProps> = ({
  profile,
  policy,
  values,
  disabled,
  onChange,
  mergeData = {},
  inlineFields,
}) => {
  const [showLocked, setShowLocked] = useState(false);
  const fieldMeta = (key: string) => metaOf(profile, key);
  const required = new Set(policy.required);
  const isMissing = (field: string) =>
    required.has(field) && !sectionOff(profile, values, field) && !String(values[field] ?? "").trim();
  const sourceOptions = addressSourceOptions(mergeData);
  const contacts = contactSourceOptions(mergeData);
  const companyAddresses = companyAddressOptions(mergeData);
  const parties = partyOptions(mergeData);

  return (
    <div className="flex w-full flex-col gap-3">
      {groupOf(profile, policy.editable.filter((f) => !profile.isPageOnlyField?.(f) && !fieldMeta(f).hidden)).map(({ group, fields: allFields }) => {
        const missingHere = allFields.filter(isMissing).length;
        const addressFields = profile.addressGroups?.[group];
        // The group's own on/off switch lives in its header, not among its rows.
        const switchKey = allFields.find((f) => fieldMeta(f).headerSwitch);
        const sectionOn = !switchKey || String(values[switchKey] ?? "Yes") !== "No";
        const fields = allFields.filter(
          (f) => f !== switchKey && (!inlineFields?.has(f) || fieldMeta(f).toggleDefault)
        );
        // Every field in this group is typed on the page and it has no picker or switch: nothing to show.
        if (!fields.length && !addressFields && !switchKey) return null;

        const active = addressFields
          ? activeAddressSource(values[addressFields.nameKey] ?? "", sourceOptions, contacts, parties)
          : null;

        const fill = (picked: { name: string; address: string }) => {
          if (!addressFields) return;
          onChange(addressFields.nameKey, picked.name);
          onChange(addressFields.addressKey, picked.address);
        };
        // The company this group shows. A group that records its party (Bill To) reads the stored choice, falling
        // back to the one the page was resolved for; any other group matches by the name it currently prints.
        const partyKey = addressFields?.partyKey;
        const party = partyKey
          ? parties.find((p) => p.key === (values[partyKey] || String(mergeData.source_party ?? "")))
          : parties.find((p) => p.name === values[addressFields?.nameKey ?? ""]);
        const pickParty = (key: string) => {
          const picked = parties.find((p) => p.key === key);
          if (!picked) return;
          if (partyKey) onChange(partyKey, picked.key);
          fill(picked);
        };
        // Address variants are the picked company's own, so switching company never offers the previous one's.
        const variants = party ? party.addresses : companyAddresses;
        const activeAddress = variants.find((a) => a.address.trim() && a.address === values[addressFields?.addressKey ?? ""]);

        return (
          <Card key={group} variant="panel" className="gap-3 py-3 [--card-spacing:--spacing(3)]">
            <CardContent className="flex flex-col gap-3">
              {/* Header: title, how many required fields are still empty, and the section's own switch. */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <SectionIcon name={groupIcon(profile, group)} />
                  <span className="truncate text-sm font-semibold">{group}</span>
                  {missingHere > 0 && (
                    <Badge variant="destructive" title={`${missingHere} required field${missingHere === 1 ? "" : "s"} still empty here`}>
                      {missingHere}
                    </Badge>
                  )}
                </div>
                {switchKey && (
                  <LabelledSwitch
                    checked={sectionOn}
                    disabled={disabled}
                    onLabel="Shown"
                    offLabel="Hidden"
                    ariaLabel={`Show ${fieldMeta(switchKey).label} on the document`}
                    onToggle={(on) => onChange(switchKey, on ? "Yes" : "No")}
                  />
                )}
              </div>

              {/* Where an address group takes its details from: Contact | Company | Project. */}
              {addressFields && sectionOn && (
                <Segmented
                  ariaLabel={`${group} source`}
                  value={active}
                  onChange={(key) => {
                    if (key !== active) fill(sourceOptions[key as AddressSource]);
                  }}
                  options={(Object.keys(ADDRESS_SOURCE_LABELS) as AddressSource[]).map((key) => {
                    const hasName = Boolean(sourceOptions[key].name.trim());
                    return {
                      value: key,
                      label: ADDRESS_SOURCE_LABELS[key],
                      disabled: disabled || !hasName,
                      title: hasName ? undefined : "Not set on this project",
                    };
                  })}
                />
              )}

              {/* Which of the project's Contact Person companies — shown only when there is a choice to make. */}
              {sectionOn && addressFields && active === "company" && parties.length > 1 && (
                <PickerRow
                  label="Company"
                  note={partyKey && party ? (
                    party.gstin ? (
                      <span className="text-[11px] text-muted-foreground">GSTIN <span className="font-semibold tabular-nums text-foreground">{party.gstin}</span></span>
                    ) : (
                      <span className="text-[11px] font-medium text-warning-foreground">No GSTIN on record — the invoice will print without one.</span>
                    )
                  ) : null}
                >
                  <MiniSelect
                    ariaLabel={`${group} company`}
                    className="w-full"
                    disabled={disabled}
                    value={party?.key ?? ""}
                    options={parties.map((p) => ({ value: p.key, label: p.label }))}
                    onChange={pickParty}
                  />
                </PickerRow>
              )}

              {/* Shown whenever the company has any address, so which one prints is always visible; a variant the
                  company has not filled in is disabled rather than hidden. */}
              {sectionOn && addressFields && active === "company" && variants.some((a) => a.address.trim()) && (
                <PickerRow label="Address Variant">
                  <Segmented
                    ariaLabel="Address variant"
                    className="w-full"
                    value={activeAddress?.label ?? null}
                    onChange={(label) => {
                      const picked = variants.find((a) => a.label === label);
                      if (picked?.address.trim()) onChange(addressFields.addressKey, picked.address);
                    }}
                    options={variants.map((a) => ({
                      value: a.label,
                      label: a.label,
                      disabled: disabled || !a.address.trim(),
                      title: a.address.trim() ? undefined : `No ${a.label.toLowerCase()} on this company`,
                    }))}
                  />
                </PickerRow>
              )}

              {sectionOn && addressFields && active === "contact" && contacts.length > 1 && (
                <PickerRow label="Contact Person">
                  <MiniSelect
                    ariaLabel="Contact person"
                    className="w-full"
                    disabled={disabled}
                    value={values[addressFields.nameKey] ?? ""}
                    options={contacts.map((c) => ({ value: c.name, label: c.name }))}
                    onChange={(name) => {
                      const picked = contacts.find((c) => c.name === name);
                      if (picked) fill(picked);
                    }}
                  />
                </PickerRow>
              )}

              {sectionOn && fields.map((field) => {
                const meta = fieldMeta(field);
                const value = String(values[field] ?? "");
                const missing = isMissing(field);
                const hint = missing ? "Needed before publishing" : meta.hint;
                const mark = required.has(field) && <span aria-hidden className="ml-0.5 text-destructive">*</span>;

                if (meta.toggleDefault) {
                  const checked = (value === "Yes" || value === "No" ? value : meta.toggleDefault) === "Yes";
                  return (
                    <div key={field} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 ring-1 ring-border">
                      <div className="min-w-0">
                        <p className="m-0 text-xs font-semibold">{meta.label}{mark}</p>
                        {hint && (
                          <p className={cn("m-0 text-[11px]", missing ? "text-destructive" : "text-muted-foreground")}>{hint}</p>
                        )}
                      </div>
                      <LabelledSwitch
                        checked={checked}
                        disabled={disabled}
                        onLabel="Yes"
                        offLabel="No"
                        onToggle={(on) => onChange(field, on ? "Yes" : "No")}
                      />
                    </div>
                  );
                }

                const id = `doc-field-${field}`;
                const control = { id, disabled, value, "aria-invalid": missing || undefined } as const;
                return (
                  <Field key={field} data-invalid={missing || undefined}>
                    <FieldLabel htmlFor={id}>{meta.label}{mark}</FieldLabel>
                    {meta.multiline ? (
                      <Textarea {...control} onChange={(event) => onChange(field, event.target.value)} />
                    ) : (
                      <Input {...control} className="tabular-nums" onChange={(event) => onChange(field, event.target.value)} />
                    )}
                    {hint && <FieldDescription className={cn(missing && "text-destructive")}>{hint}</FieldDescription>}
                  </Field>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* What the record fills in — read-only, so it stays folded away until someone wants to see it. */}
      <Collapsible open={showLocked} onOpenChange={setShowLocked} className="rounded-2xl bg-muted/40 ring-1 ring-border">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-2xl p-3 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
          <span className="flex items-center gap-2">
            <SectionIcon name="lock-2" tone="slate" />
            <span>
              <span className="block text-xs font-semibold">Auto-populated from Record</span>
              <span className="block text-[11px] text-muted-foreground">{policy.locked.length} system-controlled fields</span>
            </span>
          </span>
          <ChevronDown aria-hidden className={cn("size-4 text-muted-foreground transition-transform", showLocked && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-dashed border-border p-3">
            {profile.lockedNote && (
              <p className="m-0 mb-2 text-[11px] leading-snug text-muted-foreground">{profile.lockedNote}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {policy.locked.map((field) => (
                <Badge key={field} variant="outline" title={`Field: ${field}`}>
                  <Lock aria-hidden className="size-3" />
                  {fieldMeta(field).label}
                </Badge>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default DocumentPropertiesPanel;
