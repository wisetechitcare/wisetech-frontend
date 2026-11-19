import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { PageTitle, PageLink } from '@metronic/layout/core';
import { FormDialog } from '@/ds/patterns/form-dialog';
import OrganizationProfileForm from './OrganizationProfileForm';
import Branches from '../Branches';

const breadcrumbs: Array<PageLink> = [
  { title: 'Company', path: '#', isSeparator: false, isActive: false },
  { title: '', path: '', isSeparator: true, isActive: false },
  { title: 'Organizations', path: '/company/organization-profile', isSeparator: false, isActive: false },
  { title: '', path: '', isSeparator: true, isActive: false },
];

/**
 * Routed profile page for a single organization (`/company/organization-profile/:orgId`).
 * Renders the same editable Organization Profile used for the default org, scoped
 * to the selected organization. The org's branches open in a modal from the
 * "Branches" button beside Download PDF.
 *
 * Deep-link from the org tree: `?openBranches=1&branchId=<id>` opens the Branches
 * modal and auto-loads that branch's edit form.
 */
export default function OrganizationProfilePage() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showBranches, setShowBranches] = useState(false);
  const [editBranchId, setEditBranchId] = useState<string | undefined>();

  useEffect(() => {
    const wantBranches = searchParams.get('openBranches') === '1';
    const branchId = searchParams.get('branchId') || undefined;
    if (!wantBranches && !branchId) return;
    setShowBranches(true);
    if (branchId) setEditBranchId(branchId);
    // Consume the query so refresh / back doesn't keep re-opening the edit form.
    const next = new URLSearchParams(searchParams);
    next.delete('openBranches');
    next.delete('branchId');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <>
      <PageTitle breadcrumbs={breadcrumbs}>Organization Profile</PageTitle>

      <OrganizationProfileForm
        key={orgId}
        organizationId={orgId}
        onBack={() => navigate(-1)}
        onBranchesClick={() => setShowBranches(true)}
      />

      {/* The kit Form Dialog (read-only: one Close). Everything Branches opens from here is kit too — the branch
          form, Employees, Biometric devices — so the dialogs stack and share one focus trap. */}
      <FormDialog
        open={showBranches}
        onOpenChange={(open) => { if (!open) { setShowBranches(false); setEditBranchId(undefined); } }}
        title="Branches"
        description="Manage this organization’s locations"
        icon={<Building2 aria-hidden />}
        tone="cyan"
        size="xl"
      >
        <Branches
          key={`branches-${orgId}`}
          companyId={orgId}
          embedded
          hideHeading
          editBranchId={editBranchId}
          onEditBranchConsumed={() => setEditBranchId(undefined)}
        />
      </FormDialog>
    </>
  );
}
