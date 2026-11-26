import { useEffect, useState } from 'react';
import { Building2, Network } from 'lucide-react';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/ds/ui/field';
import { Input } from '@/ds/ui/input';
import { NumberField } from '@/ds/ui/number-field';
import { FormDialog } from '@/ds/patterns/form-dialog';
import { ImageField } from '@/ds/patterns/image-field';
import { LocationFields } from '@/ds/patterns/location-fields';
import { createCompanyOverview } from '@services/company';
import { searchPlaces, toGeoPick } from '@services/geocoding';
import { uploadCompanyAsset } from '@services/uploader';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { FiscalYearRangeField } from '@app/modules/common/components/ui';
import { splitFiscalYearRange } from '@utils/fiscalYearRange';
import { PROVISION_LIMITS as L } from '@constants/provisionColumnLimits';

/**
 * Create a sub-organization under a parent — a kit Form Dialog.
 * Root (tenant) creation is a platform action (`scripts/provision_tenant.ts`), not this UI.
 *
 * Fiscal year uses the shared {@link FiscalYearRangeField} (ISO `"start to end"`),
 * the same control as prefix / org profile — not a one-off pair of date fields.
 */

interface Props {
  show: boolean;
  /** When provided, the new org is created as a sub-organization of this parent. */
  parentOrg?: { id: string; name: string } | null;
  onCreated: () => void;
  onClose: () => void;
}

interface FormState {
  name: string;
  logo: string;
  workingHrs: string;
  workingDays: string;
  businessType: string;
  contactNumber: string;
  address: string;
}

const FORM_ID = 'new-organization';
const blank: FormState = { name: '', logo: '', workingHrs: '8', workingDays: '5', businessType: '', contactNumber: '', address: '' };
/** Every image type the old `image/*` picker took that a logo realistically is. */
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];

/** A number field's value as the API's string, and back. */
const toNumber = (v: string) => (v.trim() === '' ? NaN : Number(v));
const fromNumber = (n: number) => (Number.isNaN(n) ? '' : String(n));

export default function OrganizationFormModal({ show, parentOrg, onCreated, onClose }: Props) {
  const [form, setForm] = useState<FormState>(blank);
  const [fiscalYear, setFiscalYear] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (show) {
      setForm(blank); setLogoPreview(''); setErrors({});
      setFiscalYear('');
    }
  }, [show]);

  const clearError = (k: string) => {
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };
  const set = (k: keyof FormState, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    clearError(k);
  };

  /** The Image Field's contract: upload, return what is stored (the asset path). */
  async function uploadLogo(file: File): Promise<string> {
    const fd = new FormData(); fd.append('file', file);
    const res: any = await uploadCompanyAsset(fd);
    const path = res?.data?.path ?? res?.path;
    if (!path) throw new Error('Upload did not return a file path');
    setLogoPreview(URL.createObjectURL(file));
    return path;
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Organization name is required';
    const { from, to } = splitFiscalYearRange(fiscalYear);
    if (!from || !to) e.fiscalYear = 'Fiscal year is required';
    else if (from > to) e.fiscalYear = 'The start date must be on or before the end date';
    if (!form.workingHrs.trim()) e.workingHrs = 'Required';
    if (!form.workingDays.trim()) e.workingDays = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    // A missing parent would mint a new tenant root — refused by the API as PLATFORM_ONLY.
    // Sub-orgs only from this screen; new tenants use scripts/provision_tenant.ts.
    if (!parentOrg?.id) {
      errorConfirmation('Pick a parent organization. A new top-level organization is a platform action.');
      return;
    }
    if (fiscalYear.length > 64) {
      setErrors((e) => ({ ...e, fiscalYear: 'Fiscal year range is too long to save — pick calendar dates again' }));
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form, fiscalYear, parentOrganizationId: parentOrg.id };
      const res = await createCompanyOverview(payload);
      if (res && !res.hasError) {
        successConfirmation('Sub-organization created.');
        onCreated();
        onClose();
      } else {
        throw Object.assign(new Error(res?.message || 'Failed to create organization'), { response: { data: res } });
      }
    } catch (err: any) {
      const data = err?.response?.data ?? (err?.message && typeof err === 'object' ? err : null);
      const detail = typeof data?.detail === 'string' ? data.detail : '';
      const code = data?.meta?.code as string | undefined;
      const prismaCode = data?.prismaCode as string | undefined;
      if (code === 'PLATFORM_ONLY') {
        errorConfirmation(detail || 'This is a KAIZNOVA platform action. Contact KAIZNOVA support.');
      } else if (prismaCode === 'P2002' || /unique/i.test(detail)) {
        errorConfirmation(`An organization named "${form.name.trim()}" already exists. Choose a different name.`);
      } else if (/fiscal_year/i.test(detail) || (/fiscal/i.test(detail) && /too long/i.test(detail))) {
        errorConfirmation('Fiscal year value is too long for the database. Pick the start and end dates again.');
      } else if (prismaCode === 'P2000' || /too long/i.test(detail)) {
        const fieldHint = detail.match(/`(\w+)`/)?.[1];
        errorConfirmation(
          fieldHint
            ? `The ${fieldHint.replace(/_/g, ' ')} value is too long. Shorten it and try again.`
            : (detail && detail !== 'A database error occurred'
              ? detail
              : 'One of the fields is too long for the database. Shorten it and try again.'),
        );
      } else if (data?.validationError?.length) {
        const first = data.validationError[0];
        const field = first?.field ? `${first.field}: ` : '';
        errorConfirmation(`${field}${(first?.errors || []).join(', ') || data.detail || 'Invalid organization details'}`);
      } else {
        const msg =
          (detail && detail !== 'A database error occurred' ? detail : '') ||
          (typeof data?.message === 'string' && data.message !== 'Forbidden' ? data.message : '') ||
          'Failed to create organization';
        errorConfirmation(msg);
      }
    }
    finally { setSaving(false); }
  }

  const dirty =
    fiscalYear !== '' ||
    (Object.keys(blank) as (keyof FormState)[]).some((k) => form[k] !== blank[k]);

  return (
    <FormDialog
      open={show}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title="Add organization"
      description={parentOrg ? `Under ${parentOrg.name}` : 'A parent organization is required'}
      icon={parentOrg ? <Network aria-hidden /> : <Building2 aria-hidden />}
      size="lg"
      formId={FORM_ID}
      submitLabel="Create organization"
      submitting={saving}
      dirty={dirty}
    >
      <form
        id={FORM_ID}
        noValidate
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
      >
        <FieldGroup>
          <ImageField
            id="org-logo"
            label="Logo"
            value={form.logo || null}
            previewUrl={logoPreview || null}
            onChange={(url) => { set('logo', url ?? ''); if (!url) setLogoPreview(''); }}
            upload={uploadLogo}
            accept={LOGO_TYPES}
            maxSizeMB={5}
            hint="Optional. You can add a logo later from the profile."
          />

          <Field data-invalid={Boolean(errors.name) || undefined}>
            <FieldLabel htmlFor="org-name">Organization name</FieldLabel>
            <Input
              id="org-name"
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              aria-invalid={Boolean(errors.name) || undefined}
              aria-describedby={errors.name ? 'org-name-error' : undefined}
            />
            {errors.name && <FieldError id="org-name-error">{errors.name}</FieldError>}
          </Field>

          <FiscalYearRangeField
            value={fiscalYear}
            onChange={(v) => { setFiscalYear(v); clearError('fiscalYear'); }}
            required
            error={Boolean(errors.fiscalYear)}
            helperText={errors.fiscalYear}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="org-business-type">Business type</FieldLabel>
              <Input id="org-business-type" value={form.businessType} onChange={(e) => set('businessType', e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="org-contact">Contact number</FieldLabel>
              <Input id="org-contact" type="tel" value={form.contactNumber} onChange={(e) => set('contactNumber', e.target.value)} />
            </Field>
            <NumberField
              label="Working hours per day"
              isRequired
              minValue={0}
              maxValue={24}
              value={toNumber(form.workingHrs)}
              onChange={(n) => set('workingHrs', fromNumber(n))}
              isInvalid={Boolean(errors.workingHrs)}
              errorMessage={errors.workingHrs}
            />
            <NumberField
              label="Working days per week"
              isRequired
              minValue={0}
              maxValue={7}
              value={toNumber(form.workingDays)}
              onChange={(n) => set('workingDays', fromNumber(n))}
              isInvalid={Boolean(errors.workingDays)}
              errorMessage={errors.workingDays}
            />
          </div>

          <LocationFields
            registeredAddressOnly
            addressLabel="Organization Address"
            addressMaxLength={L.organizationAddress}
            value={{
              countryId: '',
              stateId: '',
              cityId: '',
              postalCode: '',
              address: form.address,
              latitude: '',
              longitude: '',
            }}
            onChange={(patch) => {
              if (patch.address !== undefined) set('address', patch.address)
            }}
            suggestAddress={async (query) => {
              const rows = await searchPlaces(query, 5)
              return rows.map((raw, i) => {
                const pick = toGeoPick(raw)
                return {
                  id: String(raw?.place_id ?? `${pick.lat},${pick.lng},${i}`),
                  label: pick.formatted || pick.street || query,
                  address: (pick.street || pick.formatted || query).slice(0, L.organizationAddress),
                  latitude: String(pick.lat ?? ''),
                  longitude: String(pick.lng ?? ''),
                }
              })
            }}
          />
        </FieldGroup>
      </form>
    </FormDialog>
  );
}
