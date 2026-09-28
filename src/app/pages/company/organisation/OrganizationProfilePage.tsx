import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { PageTitle, PageLink } from '@metronic/layout/core';
import { GlassDialog, GlassHeader } from '@app/modules/common/components/ui';
import OrganisationProfileForm from './OrganisationProfileForm';
import Branches from '../Branches';

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
        onBack={() => navigate(-1)}
        onBranchesClick={() => setShowBranches(true)}
      />

      {/* Branches modal for this organization.
          enforceFocus/restoreFocus disabled: the nested MUI Dialogs (device &
          branch-form modals) portal to <body>, outside this modal's DOM — with
          react-bootstrap's focus-trap on, it would steal focus back and you
          couldn't type in those dialogs' fields. */}
      {/* The kit's dialog, not react-bootstrap's.
          What stood here was a <Modal> carrying an inline <style> block (banned —
          it leaks global CSS and styles by class name from inside a component), a
          FOURTH copy of GlassHeader's gradient and accent rule, a second close
          button, and two hardcoded light-mode colours: the #F6F7F9 body and a
          #D4D8E0 scrollbar. Those are why this dialog stayed pale in dark mode and
          why its heading missed the app-wide uppercase change — it never went
          through the kit.

          enforceFocus/restoreFocus are gone with react-bootstrap: the nested
          dialogs they were disabled for (device and branch-form) are MUI dialogs,
          and MUI hands focus to the topmost one on its own. */}
      <GlassDialog
        open={showBranches}
        onClose={() => setShowBranches(false)}
        maxWidth="xl"
        fullWidth
        header={
          <GlassHeader
            title="Branches"
            subtitle="Manage this organization’s locations"
            icon={<KTIcon iconName="bank" className="fs-1" />}
            onClose={() => setShowBranches(false)}
          />
        }
      >
        <Box sx={{ bgcolor: 'background.default', maxHeight: '76vh', overflowY: 'auto', pb: 3 }}>
          <Branches key={`branches-${orgId}`} companyId={orgId} embedded hideHeading />
        </Box>
      </GlassDialog>
    </>
  );
}
