import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal } from 'react-bootstrap';
import { Box, Stack, Typography, IconButton } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
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
 * Renders the same editable Organization Profile used for the default org, scoped
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

      {/* Branches modal for this organization.
          enforceFocus/restoreFocus disabled: the nested MUI Dialogs (device &
          branch-form modals) portal to <body>, outside this modal's DOM — with
          react-bootstrap's focus-trap on, it would steal focus back and you
          couldn't type in those dialogs' fields. */}
      <Modal show={showBranches} onHide={() => setShowBranches(false)} size="xl" centered enforceFocus={false} restoreFocus={false} contentClassName="org-branches-modal-content">
        <style>{`
          .org-branches-modal-content{border:none;border-radius:18px;overflow:hidden;box-shadow:0 28px 70px rgba(8,10,18,.30);}
          .org-branches-scroll::-webkit-scrollbar{width:10px;}
          .org-branches-scroll::-webkit-scrollbar-thumb{background:#D4D8E0;border-radius:8px;border:3px solid transparent;background-clip:content-box;}
          .org-branches-scroll::-webkit-scrollbar-thumb:hover{background:#B7BECB;background-clip:content-box;}
        `}</style>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, px: 2.75, py: 1.75, background: 'linear-gradient(135deg, #172554 0%, #1E3A8A 100%)', borderBottom: '3px solid #C0392B', color: '#fff' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 42, height: 42, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)', flexShrink: 0 }}>
              <KTIcon iconName="bank" className="fs-1" />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 750, fontSize: 17, color: '#fff', lineHeight: 1.2 }}>Branches</Typography>
              <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)' }}>Manage this organization’s locations</Typography>
            </Box>
          </Stack>
          <IconButton onClick={() => setShowBranches(false)} size="small" aria-label="Close" sx={{ color: '#fff' }}><IconClose size={16} /></IconButton>
        </Box>

        {/* Body */}
        <Box className="org-branches-scroll" sx={{ bgcolor: '#F6F7F9', maxHeight: '76vh', overflowY: 'auto', pb: 3 }}>
          <Branches key={`branches-${orgId}`} companyId={orgId} embedded hideHeading />
        </Box>
      </Modal>
    </>
  );
}
