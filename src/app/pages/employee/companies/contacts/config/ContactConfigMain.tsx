import React, { useState } from "react";
import CompanyConfigForm from "../../companyConfig/components/CompanyConfigForm";
import FormerContactsSetting from "./FormerContactsSetting";
import { useContactConfig } from "@hooks/useContactConfig";
import {
  ConfigPageLayout,
  ConfigSectionCard,
  C,
  FONT,
  SP,
  KEYFRAMES,
} from '@app/modules/configuration';
import { AppIcon, ConfigColorChip, ConfigChipGrid } from '@app/modules/common/components/ui';

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ textAlign: 'center', padding: '28px 16px', color: C.textMuted, fontFamily: FONT.body, fontSize: '13px' }}>
    <AppIcon name="bi-inbox" className="fs-2qx" style={{ display: 'block', marginBottom: '8px', opacity: 0.4 }} />
    No {label} configured yet
  </div>
);

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
      <ConfigPageLayout>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>

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
                <ConfigChipGrid>
                  {[...contactRoleTypes]
                    .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
                    .map((contactRoleType: any) => (
                      <ConfigColorChip
                        key={contactRoleType.id}
                        name={contactRoleType.name}
                        color={contactRoleType.color}
                        onEdit={() => handleReferralTypeEdit(contactRoleType)}
                        action={{
                          icon: 'bi-trash',
                          title: `Delete ${contactRoleType.name}`,
                          danger: true,
                          onClick: () => handleContactRoleTypeDelete(contactRoleType.id),
                        }}
                      />
                    ))}
                </ConfigChipGrid>
              )
            }
          </ConfigSectionCard>

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
                <ConfigChipGrid>
                  {[...contactStatuses]
                    .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
                    .map((contactStatus: any) => (
                      <ConfigColorChip
                        key={contactStatus.id}
                        name={contactStatus.name}
                        color={contactStatus.color}
                        onEdit={() => handleContactStatusEdit(contactStatus)}
                        action={{
                          icon: 'bi-trash',
                          title: `Delete ${contactStatus.name}`,
                          danger: true,
                          onClick: () => handleContactStatusDelete(contactStatus.id),
                        }}
                      />
                    ))}
                </ConfigChipGrid>
              )
            }
          </ConfigSectionCard>

          <FormerContactsSetting />
        </div>
      </ConfigPageLayout>

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
