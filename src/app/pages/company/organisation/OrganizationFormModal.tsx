import { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import Flatpickr from 'react-flatpickr';
import { createCompanyOverview } from '@services/company';
import { uploadCompanyAsset } from '@services/uploader';
import { dateFormatter } from '@utils/date';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { IconBuilding, IconHierarchy, IconImage, IconClose } from '@app/modules/common/components/icons/OrgIcons';
import './OrganizationFormModal.responsive.css';

const C = { brand: '#1E3A8A', brandSoft: '#FBEEEE', brandBorder: '#EBD2D2', ink: '#1F2430', inkSoft: '#5A6172', line: '#E7E9EF', panel: '#F7F7F9' };

interface Props {
  show: boolean;
  /** When provided, the new org is created as a sub-organization of this parent. */
  parentOrg?: { id: string; name: string } | null;
  onCreated: () => void;
  onClose: () => void;
}

interface FormState {
  name: string;
  fiscalYear: string;
  logo: string;
  workingHrs: string;
  workingDays: string;
  businessType: string;
  contactNumber: string;
  address: string;
}

const blank: FormState = { name: '', fiscalYear: '', logo: '', workingHrs: '8', workingDays: '5', businessType: '', contactNumber: '', address: '' };

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: C.inkSoft, display: 'block', marginBottom: 5, letterSpacing: '.3px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13.5, border: `1px solid ${C.line}`, background: '#fff', outline: 'none' };

export default function OrganizationFormModal({ show, parentOrg, onCreated, onClose }: Props) {
  const [form, setForm] = useState<FormState>(blank);
  const [logoPreview, setLogoPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (show) { setForm(blank); setLogoPreview(''); setErrors({}); }
  }, [show]);

  const set = (k: keyof FormState, v: string) => { setForm(p => ({ ...p, [k]: v })); if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n; }); };

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
    if (!form.fiscalYear) e.fiscalYear = 'Fiscal year is required';
    if (!form.workingHrs.trim()) e.workingHrs = 'Required';
    if (!form.workingDays.trim()) e.workingDays = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: any = { ...form, ...(parentOrg ? { parentOrganizationId: parentOrg.id } : {}) };
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
    <Modal show={show} onHide={onClose} centered size="lg" contentClassName="org-form-modal-content">
      <style>{`.org-form-modal-content{border:none;border-radius:16px;overflow:hidden;box-shadow:0 30px 80px rgba(8,10,18,.4);}`}</style>

      <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.line}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.brandSoft, border: `1px solid ${C.brandBorder}`, display: 'grid', placeItems: 'center', color: C.brand }}>{parentOrg ? <IconHierarchy size={20} /> : <IconBuilding size={20} />}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: C.ink }}>{parentOrg ? 'Add Sub-Organization' : 'New Organization'}</div>
            {parentOrg && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 1 }}>under <b>{parentOrg.name}</b></div>}
          </div>
        </div>
        <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.line}`, background: '#fff', color: C.inkSoft, cursor: 'pointer', display: 'grid', placeItems: 'center' }}><IconClose size={16} /></button>
      </div>

      <div style={{ padding: 24, background: C.panel, maxHeight: '66vh', overflowY: 'auto' }}>
        {/* Logo */}
        <div style={{ marginBottom: 18, display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.line}`, background: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            {logoPreview ? <img src={logoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <IconImage size={26} color="#C4C9D4" />}
          </div>
          <div>
            <span style={labelStyle}>Logo <span style={{ color: '#98A0B0', fontWeight: 500 }}>(optional)</span></span>
            <label style={{ display: 'inline-block', background: C.brand, color: '#fff', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {uploading ? 'Uploading…' : logoPreview ? 'Change Logo' : 'Upload Logo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleLogo(e.target.files?.[0])} />
            </label>
            <div style={{ fontSize: 11.5, color: '#98A0B0', marginTop: 5 }}>You can add a logo later from the profile.</div>
          </div>
        </div>

        <div className="org-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Organization Name <span style={{ color: C.brand }}>*</span></label>
            <input style={{ ...inputStyle, borderColor: errors.name ? '#F3B4B4' : C.line }} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Wisetech Interiors Pvt. Ltd." />
            {errors.name && <div style={{ fontSize: 11.5, color: '#D14343', marginTop: 4 }}>{errors.name}</div>}
          </div>

          <div>
            <label style={labelStyle}>Fiscal Year <span style={{ color: C.brand }}>*</span></label>
            <Flatpickr
              value={form.fiscalYear ? [new Date(form.fiscalYear.split(' to ')[0]), new Date(form.fiscalYear.split(' to ')[1])] : []}
              className="form-control" style={inputStyle as any} placeholder="Set fiscal year"
              onChange={(dates: Date[]) => { if (dates.length === 2) set('fiscalYear', `${dateFormatter.format(dates[0])} to ${dateFormatter.format(dates[1])}`); }}
              options={{ dateFormat: 'Y-m-d', altInput: true, altFormat: 'F j, Y', mode: 'range' }}
            />
            {errors.fiscalYear && <div style={{ fontSize: 11.5, color: '#D14343', marginTop: 4 }}>{errors.fiscalYear}</div>}
          </div>

          <div>
            <label style={labelStyle}>Business Type</label>
            <input style={inputStyle} value={form.businessType} onChange={e => set('businessType', e.target.value)} placeholder="e.g. Consultancy" />
          </div>

          <div>
            <label style={labelStyle}>Working Hours / day <span style={{ color: C.brand }}>*</span></label>
            <input type="number" style={{ ...inputStyle, borderColor: errors.workingHrs ? '#F3B4B4' : C.line }} value={form.workingHrs} onChange={e => set('workingHrs', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Working Days / week <span style={{ color: C.brand }}>*</span></label>
            <input type="number" style={{ ...inputStyle, borderColor: errors.workingDays ? '#F3B4B4' : C.line }} value={form.workingDays} onChange={e => set('workingDays', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Contact Number</label>
            <input style={inputStyle} value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} placeholder="+91 …" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Registered address" />
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: '#98A0B0', marginTop: 14 }}>You can fill the remaining details (GST, bank, certificates, custom fields) from the organization’s profile after it’s created.</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: `1px solid ${C.line}`, background: '#fff' }}>
        <button type="button" onClick={onClose} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 8, padding: '9px 22px', fontWeight: 600, color: C.inkSoft, cursor: 'pointer' }}>Cancel</button>
        <button type="button" onClick={handleSubmit} disabled={saving || uploading} style={{ background: C.brand, border: 'none', borderRadius: 8, padding: '9px 26px', fontWeight: 700, color: '#fff', cursor: saving ? 'wait' : 'pointer', opacity: saving || uploading ? 0.7 : 1 }}>
          {saving ? 'Creating…' : parentOrg ? 'Create Sub-Org' : 'Create Organization'}
        </button>
      </div>
    </Modal>
  );
}
