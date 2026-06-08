import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal } from 'react-bootstrap';
import { PageTitle, PageLink } from '@metronic/layout/core';
import OrganisationProfileForm from './OrganisationProfileForm';
import Branches from '../Branches';
import { IconClose } from '@app/modules/common/components/icons/OrgIcons';

const breadcrumbs: Array<PageLink> = [
  { title: 'Company', path: '#', isSeparator: false, isActive: false },
  { title: '', path: '', isSeparator: true, isActive: false },
  { title: 'Organizations', path: '/company/organisation-profile', isSeparator: false, isActive: false },
  { title: '', path: '', isSeparator: true, isActive: false },
];

/**
 * Routed profile page for a single organization (`/company/organisation-profile/:orgId`).
 * Renders the same editable Organisation Profile used for the default org, scoped
 * to the selected organization. The org's branches open in a modal from the
 * "Branches" button beside Download PDF.
 */
export default function OrganizationProfilePage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [showBranches, setShowBranches] = useState(false);

  return (
    <>
      <PageTitle breadcrumbs={breadcrumbs}>Organization Profile</PageTitle>

      <OrganisationProfileForm
        key={orgId}
        organizationId={orgId}
        onBack={() => navigate('/company/organisation-profile')}
        onBranchesClick={() => setShowBranches(true)}
      />

      {/* Branches modal for this organization */}
      <Modal show={showBranches} onHide={() => setShowBranches(false)} size="xl" centered contentClassName="org-branches-modal-content">
        <style>{`.org-branches-modal-content{border:none;border-radius:16px;overflow:hidden;box-shadow:0 30px 80px rgba(8,10,18,.4);}`}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', borderBottom: '1px solid #ECEEF3', background: '#fff' }}>
          <div style={{ fontFamily: 'Barlow', fontWeight: 700, fontSize: 18, color: '#1F2430' }}>Branches</div>
          <button type="button" onClick={() => setShowBranches(false)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #ECEEF3', background: '#fff', color: '#5A6172', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <IconClose size={16} />
          </button>
        </div>
        <div style={{ background: '#f7f9fc', maxHeight: '78vh', overflowY: 'auto' }}>
          <Branches key={`branches-${orgId}`} companyId={orgId} embedded hideHeading />
        </div>
      </Modal>
    </>
  );
}
