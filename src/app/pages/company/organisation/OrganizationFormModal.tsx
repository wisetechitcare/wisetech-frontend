import { useEffect, useState } from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';
import { createCompanyOverview } from '@services/company';
import { uploadCompanyAsset } from '@services/uploader';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { GlassDialog, GlassHeader, WtButton, FiscalYearRangeField } from '@app/modules/common/components/ui';
import { IconBuilding, IconHierarchy, IconImage } from '@app/modules/common/components/icons/OrgIcons';
import { splitFiscalYearRange } from '@utils/fiscalYearRange';

/**
 * Create an organization, or a sub-organization under one.
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

const blank: FormState = { name: '', logo: '', workingHrs: '8', workingDays: '5', businessType: '', contactNumber: '', address: '' };

export default function OrganizationFormModal({ show, parentOrg, onCreated, onClose }: Props) {
  const [form, setForm] = useState<FormState>(blank);
  const [fiscalYear, setFiscalYear] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (show) {
      setForm(blank); setLogoPreview(''); setErrors({});
      setFiscalYear('');
    }
  }, [show]);

  const set = (k: keyof FormState, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  async function handleLogo(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { errorConfirmation('Please choose an image file (PNG or JPG).'); return; }
    if (file.size > 5 * 1024 * 1024) { errorConfirmation('Logo must be under 5MB.'); return; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res: any = await uploadCompanyAsset(fd);
      const path = res?.data?.path ?? res?.path;
      if (!path) throw new Error('Upload did not return a file path');
      set('logo', path);
      setLogoPreview(URL.createObjectURL(file));
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || err?.message || 'Failed to upload logo');
    }
    finally { setUploading(false); }
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
    if (fiscalYear.length > 64) {
      setErrors((e) => ({ ...e, fiscalYear: 'Fiscal year range is too long to save — pick calendar dates again' }));
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form, fiscalYear, ...(parentOrg ? { parentOrganizationId: parentOrg.id } : {}) };
      const res = await createCompanyOverview(payload);
      if (res && !res.hasError) {
        successConfirmation(parentOrg ? 'Sub-organization created.' : 'Organization created.');
        onCreated();
        onClose();
      } else {
        throw Object.assign(new Error(res?.message || 'Failed to create organization'), { response: { data: res } });
      }
    } catch (err: any) {
      const data = err?.response?.data ?? (err?.message && typeof err === 'object' ? err : null);
      const detail = typeof data?.detail === 'string' ? data.detail : '';
      const prismaCode = data?.prismaCode as string | undefined;
      if (prismaCode === 'P2002' || /unique/i.test(detail)) {
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
          (typeof data?.message === 'string' && data.message) ||
          (detail && detail !== 'A database error occurred' ? detail : '') ||
          'Failed to create organization';
        errorConfirmation(msg);
      }
    }
    finally { setSaving(false); }
  }

  return (
    <GlassDialog
      open={show} onClose={onClose} maxWidth="md" fullWidth
      preset="form"
      header={
        <GlassHeader
          title={parentOrg ? 'Add Sub-Organization' : 'New Organization'}
          subtitle={parentOrg ? `Under ${parentOrg.name}` : 'Create an organization and its working calendar'}
          icon={parentOrg ? <IconHierarchy size={22} /> : <IconBuilding size={22} />}
          onClose={onClose}
        />
      }
    >
      <Box sx={{ p: { xs: 2, sm: 2.75 } }}>
        <Stack direction="row" spacing={1.75} alignItems="center" sx={{ mb: 2.5 }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '12px', overflow: 'hidden', flexShrink: 0,
            border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
            display: 'grid', placeItems: 'center', color: 'text.disabled',
          }}>
            {logoPreview
              ? <Box component="img" src={logoPreview} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <IconImage size={26} />}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <WtButton
              inverted size="small" component="label" disabled={uploading}
              sx={{ mb: 0.5 }}
            >
              {uploading ? 'Uploading…' : logoPreview ? 'Change Logo' : 'Upload Logo'}
              <input type="file" accept="image/*" hidden onChange={e => handleLogo(e.target.files?.[0])} />
            </WtButton>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
              Optional. You can add a logo later from the profile.
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField
            label="Organization Name" required size="small" fullWidth
            sx={{ gridColumn: '1 / -1' }}
            placeholder="e.g. Wisetech Interiors Pvt. Ltd."
            value={form.name} onChange={e => set('name', e.target.value)}
            error={Boolean(errors.name)} helperText={errors.name}
          />

          <Box sx={{ gridColumn: '1 / -1' }}>
            <FiscalYearRangeField
              value={fiscalYear}
              onChange={(v) => {
                setFiscalYear(v);
                if (errors.fiscalYear) setErrors(e => { const n = { ...e }; delete n.fiscalYear; return n; });
              }}
              required
              error={Boolean(errors.fiscalYear)}
              helperText={errors.fiscalYear}
            />
          </Box>

          <TextField
            label="Business Type" size="small" fullWidth placeholder="e.g. Consultancy"
            value={form.businessType} onChange={e => set('businessType', e.target.value)}
          />
          <TextField
            label="Contact Number" size="small" fullWidth placeholder="+91 …"
            value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)}
          />
          <TextField
            label="Working Hours per Day" required type="number" size="small" fullWidth
            value={form.workingHrs} onChange={e => set('workingHrs', e.target.value)}
            error={Boolean(errors.workingHrs)} helperText={errors.workingHrs}
          />
          <TextField
            label="Working Days per Week" required type="number" size="small" fullWidth
            value={form.workingDays} onChange={e => set('workingDays', e.target.value)}
            error={Boolean(errors.workingDays)} helperText={errors.workingDays}
          />
          <TextField
            label="Address" size="small" fullWidth sx={{ gridColumn: '1 / -1' }}
            placeholder="Registered address"
            value={form.address} onChange={e => set('address', e.target.value)}
          />
        </Box>

        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 2 }}>
          GST, bank details, certificates and custom fields are filled in from the organization’s
          profile once it exists.
        </Typography>

        <Stack direction="row" spacing={1.25} justifyContent="flex-end" sx={{ mt: 2.5, flexWrap: 'wrap', gap: 1.25 }}>
          <WtButton ghost onClick={onClose}>Cancel</WtButton>
          <WtButton onClick={handleSubmit} disabled={saving || uploading}>
            {saving ? 'Creating…' : parentOrg ? 'Create Sub-Organization' : 'Create Organization'}
          </WtButton>
        </Stack>
      </Box>
    </GlassDialog>
  );
}
