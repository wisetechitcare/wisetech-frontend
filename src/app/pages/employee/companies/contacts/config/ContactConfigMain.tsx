import React, { useState } from "react";
import PrefixSettingsForm from "@app/modules/common/components/PrefixSettingsForm";
import CompanyConfigForm from "../../companyConfig/components/CompanyConfigForm";
import { useContactConfig } from "@hooks/useContactConfig";
import {
  ConfigPageLayout,
  ConfigSectionCard,
  C,
  FONT,
  SP,
  RADIUS,
  KEYFRAMES,
} from '@app/modules/configuration';

// ─── ColorChip ────────────────────────────────────────────────────────────────

interface ColorChipProps {
  name: string;
  color: string;
  onEdit: () => void;
  onDelete: () => void;
}

const ColorChip: React.FC<ColorChipProps> = ({ name, color, onEdit, onDelete }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: hov ? '#ffffff' : '#f7f8fa',
        border: `1px solid ${hov ? '#d1d5e0' : '#eaecf0'}`,
        borderRadius: RADIUS.lg,
        padding: '9px 12px 9px 16px',
        transition: 'all 0.15s ease',
        boxShadow: hov ? '0 4px 14px rgba(24,28,50,0.09)' : '0 1px 3px rgba(24,28,50,0.04)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0,
        width: '3px', backgroundColor: color || '#ccc',
        borderRadius: '3px 0 0 3px', opacity: 0.8,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          backgroundColor: color || '#ccc', flexShrink: 0,
          boxShadow: `0 0 0 2px ${color ? color + '30' : '#ccc'}`,
        }} />
        <span style={{
          fontFamily: FONT.body, fontWeight: 500, fontSize: '13px',
          color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0, opacity: hov ? 1 : 0.35, transition: 'opacity 0.15s ease' }}>
        <button
          onClick={onEdit}
          style={{ background: hov ? '#eff6ff' : 'transparent', border: 'none', borderRadius: RADIUS.sm, padding: '4px 7px', cursor: 'pointer', color: '#4f82c4', display: 'flex', alignItems: 'center', transition: 'background 0.15s ease' }}
        >
          <i className="bi bi-pencil" style={{ fontSize: '11px' }} />
        </button>
        <button
          onClick={onDelete}
          style={{ background: hov ? '#fff5f8' : 'transparent', border: 'none', borderRadius: RADIUS.sm, padding: '4px 7px', cursor: 'pointer', color: C.danger, display: 'flex', alignItems: 'center', transition: 'background 0.15s ease' }}
        >
          <i className="bi bi-trash" style={{ fontSize: '11px' }} />
        </button>
      </div>
    </div>
  );
};

const ChipGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: SP.sm, marginTop: SP.md }}>
    {children}
  </div>
);

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ textAlign: 'center', padding: '28px 16px', color: C.textMuted, fontFamily: FONT.body, fontSize: '13px' }}>
    <i className="bi bi-inbox" style={{ fontSize: '28px', display: 'block', marginBottom: '8px', opacity: 0.4 }} />
    No {label} configured yet
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const ContactConfigMain = () => {
  const {
    loading,
    contactRoleTypes,
    contactStatuses,
    fetchContactRoleTypes,
    fetchContactStatuses,
    handleContactRoleTypeDelete,
    handleContactStatusDelete,
    contactRoleTypeDeleteConfirmation,
  } = useContactConfig();

  const [showCompanyRoleTypeModal, setShowCompanyRoleTypeModal] = useState(false);
  const [editingCompanyRoleType, setEditingCompanyRoleType] = useState<any | null>(null);
  const [showContactStatusModal, setShowContactStatusModal] = useState(false);
  const [editingContactStatus, setEditingContactStatus] = useState<any | null>(null);

  const handleReferralTypeModalOpen = () => setShowCompanyRoleTypeModal(true);
  const handleReferralTypeModalClose = () => { setShowCompanyRoleTypeModal(false); setEditingCompanyRoleType(null); };
  const handleReferralTypeEdit = (contactRoleType: any) => { setEditingCompanyRoleType(contactRoleType); setShowCompanyRoleTypeModal(true); };

  const handleContactStatusModalOpen = () => setShowContactStatusModal(true);
  const handleContactStatusModalClose = () => { setShowContactStatusModal(false); setEditingContactStatus(null); };
  const handleContactStatusEdit = (contactStatus: any) => { setEditingContactStatus(contactStatus); setShowContactStatusModal(true); };

  return (
    <>
      <style>{KEYFRAMES}</style>
      <ConfigPageLayout
        title="Contact Configuration"
        subtitle="Manage contact role types and status definitions"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>

          {/* Contact Roles */}
          <ConfigSectionCard
            title="Contact Roles"
            description="Define the roles that contacts can hold within your organization."
            icon="bi-person-badge"
            iconColor="blue"
            primaryAction={{ label: 'New Role Type', icon: 'bi-plus-lg', onClick: handleReferralTypeModalOpen, variant: 'primary' }}
            loading={loading}
          >
            {contactRoleTypes.length === 0
              ? <EmptyState label="contact role types" />
              : (
                <ChipGrid>
                  {[...contactRoleTypes]
                    .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
                    .map((contactRoleType: any) => (
                      <ColorChip
                        key={contactRoleType.id}
                        name={contactRoleType.name}
                        color={contactRoleType.color}
                        onEdit={() => handleReferralTypeEdit(contactRoleType)}
                        onDelete={() => handleContactRoleTypeDelete(contactRoleType.id)}
                      />
                    ))}
                </ChipGrid>
              )
            }
          </ConfigSectionCard>

          {/* Contact Status */}
          <ConfigSectionCard
            title="Contact Status"
            description="Configure the status values that describe a contact's current state."
            icon="bi-circle-half"
            iconColor="teal"
            primaryAction={{ label: 'New Status', icon: 'bi-plus-lg', onClick: handleContactStatusModalOpen, variant: 'primary' }}
            loading={loading}
          >
            {contactStatuses.length === 0
              ? <EmptyState label="contact statuses" />
              : (
                <ChipGrid>
                  {[...contactStatuses]
                    .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
                    .map((contactStatus: any) => (
                      <ColorChip
                        key={contactStatus.id}
                        name={contactStatus.name}
                        color={contactStatus.color}
                        onEdit={() => handleContactStatusEdit(contactStatus)}
                        onDelete={() => handleContactStatusDelete(contactStatus.id)}
                      />
                    ))}
                </ChipGrid>
              )
            }
          </ConfigSectionCard>
        </div>
      </ConfigPageLayout>

      {/* ── Modals ──────────────────────────────────────────────────────────────── */}

      <CompanyConfigForm
        show={showCompanyRoleTypeModal}
        onClose={handleReferralTypeModalClose}
        onSuccess={fetchContactRoleTypes}
        initialData={editingCompanyRoleType}
        isEditing={!!editingCompanyRoleType}
        type="contact-role-type"
        title="Contact Role Type"
      />
      <CompanyConfigForm
        show={showContactStatusModal}
        onClose={handleContactStatusModalClose}
        onSuccess={fetchContactStatuses}
        initialData={editingContactStatus}
        isEditing={!!editingContactStatus}
        type="contact-status"
        title="Contact Status"
      />

      {contactRoleTypeDeleteConfirmation.DeleteModal}
    </>
  );
};

export default ContactConfigMain;
