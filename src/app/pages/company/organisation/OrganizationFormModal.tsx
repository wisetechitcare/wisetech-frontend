import { useEffect, useState } from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { createCompanyOverview } from '@services/company';
import { uploadCompanyAsset } from '@services/uploader';
import { dateFormatter } from '@utils/date';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { GlassDialog, GlassHeader, WtButton, WtDateField } from '@app/modules/common/components/ui';
import { IconBuilding, IconHierarchy, IconImage } from '@app/modules/common/components/icons/OrgIcons';

/**
 * Create an organization, or a sub-organization under one.
 *
 * REBUILT ON THE KIT. What this file used to be, and why none of it survived:
 *
 *  • a react-bootstrap <Modal> with an inline <style> block — banned, because it
 *    leaks global CSS and targets a class name from inside a component;
 *  • its own seven-colour palette (`const C = { brand: '#1E3A8A', … }`) and a
 *    white panel, so the whole dialog stayed light-mode whatever the theme said;
 *  • hand-styled <label> + <input> pairs via `labelStyle`/`inputStyle` objects,
 *    which is precisely what made this form look like a different application
 *    from every other form in the app;
 *  • two hand-rolled <button>s and a third close button of its own;
 *  • a sibling .responsive.css file to re-do what a breakpoint object does.
 *
 * The behaviour is unchanged: same validation, same upload, and the fiscal year
 * is still stored as "<start> to <end>" in `dateFormatter`'s format, which is
 * what the API and the profile screen read.
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
  // The fiscal year is a RANGE. Held as two wire-format dates and composed on
  // submit, so the picker is the app's own date field instead of Flatpickr's.
  const [fiscalFrom, setFiscalFrom] = useState('');
  const [fiscalTo, setFiscalTo] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (show) {
      setForm(blank); setLogoPreview(''); setErrors({});
      setFiscalFrom(''); setFiscalTo('');
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
    if (!fiscalFrom || !fiscalTo) e.fiscalYear = 'Fiscal year is required';
    else if (fiscalFrom > fiscalTo) e.fiscalYear = 'The start date must be on or before the end date';
    if (!form.workingHrs.trim()) e.workingHrs = 'Required';
    if (!form.workingDays.trim()) e.workingDays = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      // Same string the old Flatpickr range produced — the API and the profile
      // screen both parse this shape, so it is not ours to modernise here.
      const fiscalYear = `${dateFormatter.format(dayjs(fiscalFrom).toDate())} to ${dateFormatter.format(dayjs(fiscalTo).toDate())}`;
      const payload: any = { ...form, fiscalYear, ...(parentOrg ? { parentOrganizationId: parentOrg.id } : {}) };
      const res = await createCompanyOverview(payload);
      if (res && !res.hasError) {
        successConfirmation(parentOrg ? 'Sub-organization created successfully' : 'Organization created successfully');
        onCreated();
        onClose();
      } else throw new Error();
    } catch { errorConfirmation('Failed to create organization'); }
    finally { setSaving(false); }
  }

  return (
    <GlassDialog
      open={show} onClose={onClose} maxWidth="md" fullWidth
      header={
        <GlassHeader
          title={parentOrg ? 'Add Sub-Organization' : 'New Organization'}
          subtitle={parentOrg ? `Under ${parentOrg.name}` : 'Create an organization and its working calendar'}
          icon={parentOrg ? <IconHierarchy size={22} /> : <IconBuilding size={22} />}
          onClose={onClose}
        />
      }
    >
      <Box sx={{ p: { xs: 2, sm: 2.75 }, maxHeight: '66vh', overflowY: 'auto' }}>
        {/* Logo */}
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
            {/* The upload control is a real button that happens to wrap a file
                input — `component="label"` keeps the native picker without a
                second button style existing anywhere in the app. */}
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

          {/* Two fields, not a range picker: the app has one date control, and it
              is the one that renders the company format and stays themed. */}
          <WtDateField
            label="Fiscal Year Start" value={fiscalFrom}
            onChange={(v: string) => { setFiscalFrom(v); if (errors.fiscalYear) setErrors(e => { const n = { ...e }; delete n.fiscalYear; return n; }); }}
            maxDate={fiscalTo || undefined}
          />
          <WtDateField
            label="Fiscal Year End" value={fiscalTo}
            onChange={(v: string) => { setFiscalTo(v); if (errors.fiscalYear) setErrors(e => { const n = { ...e }; delete n.fiscalYear; return n; }); }}
            minDate={fiscalFrom || undefined}
          />
          {errors.fiscalYear && (
            <Typography sx={{ gridColumn: '1 / -1', mt: -1, fontSize: 12, color: 'error.main' }}>{errors.fiscalYear}</Typography>
          )}

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
