import { useEffect, useState } from "react";
import { useFormikContext } from "formik";
import { Box, Typography } from "@mui/material";
import { WtChoiceField } from "@app/modules/common/components/ui";
import AppRoleField from "./AppRoleField";
import { fetchRoles } from "@services/roles";
import { useParams } from "react-router-dom";
import ApprovalSettings, { emptyApprovalChains } from "@app/components/ApprovalSettings";

function SettingChoice({ field, label, helperText }: { field: string; label: string; helperText?: string }) {
    return <WtChoiceField name={field} label={label} helperText={helperText} variant="switch" />;
}

function AppSettings() {
    const { employeeId } = useParams<{ employeeId: string }>();
    const { values, touched, setFieldValue } = useFormikContext<any>();
    const [roles, setRoles] = useState<any[]>([]);

    useEffect(() => {
        const fetchAllRoles = async () => {
            // The roles endpoint is permission-gated (`users.view.all`) and can answer 403 or
            // an envelope with no list. Either way that is an empty picker, never a thrown
            // read on `undefined` that takes the whole step down with it.
            const response = await fetchRoles().catch((err) => {
                console.error('Failed to load app roles:', err);
                return null;
            });
            const rolesData = Array.isArray(response?.data) ? response.data : [];
            setRoles(rolesData);
        };
        fetchAllRoles();
    }, []);

    return (
        <>
            {/* Row 1: Show App Settings, Is Employee Active, Allow Over Time,
                Exempt from Site & Hybrid Attendance Approval */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <SettingChoice field="isAdmin" label="App settings access" helperText="Can open the mobile/web app settings screen." />
                <SettingChoice field="isEmployeeActive" label="Active employee" helperText="Inactive employees cannot sign in or be assigned work." />
                <SettingChoice field="allowOverTime" label="Overtime allowed" helperText="Extra hours are counted toward overtime pay." />
                {/* Escape hatch for the company-wide "Require Approval for Site & Hybrid
                    Attendance" setting (Attendance Settings). Yes = this employee's
                    On-site/Hybrid punches are marked immediately and never enter the
                    approval queue. No effect when the company setting is off, the default. */}
                <SettingChoice field="exemptFromSiteHybridApproval" label="Skip site/hybrid attendance approval" helperText="Site and hybrid check-ins will not need a manager's approval." />
            </div>

            {/* Row 2: App Role */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <AppRoleField employeeId={employeeId} roles={roles} />
                </div>
            </div>

            {/* Approval Settings — shared component, loads its own data.
                Required: an employee with no Level 1 approver has nowhere to route
                their attendance/leave/reimbursement requests, so every chain needs
                one.

                This used to render ONLY when `employeeId` existed, i.e. never during
                onboarding — so a brand-new employee was created with no approval
                chains at all and nobody was told. The chains now ride along in the
                form in BOTH modes and are written by the wizard's single save. */}
            <div className="mt-6">
                <Typography variant="h6" sx={{ mb: 0.5 }}>Approval Settings</Typography>
                <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
                    Each request type needs a Level 1 approver. These are saved with the employee.
                </Typography>
                {/* One mode for create and edit alike: the chains are ordinary form fields
                    that the wizard's single save persists. `employeeId` only tells the
                    component whose saved chains to load and who to exclude from the
                    approver list — it no longer switches on a self-saving variant. */}
                <ApprovalSettings
                    employeeId={employeeId}
                    value={values.approvalChains ?? emptyApprovalChains()}
                    onChange={(next) => setFieldValue("approvalChains", next)}
                    // Errors appear once the section has been touched — which the
                    // wizard does when a blocked Continue is attempted. Arriving on
                    // an empty section is not skipping it.
                    showErrors={Boolean(touched?.approvalChains)}
                />
            </div>
        </>
    );
}

export default AppSettings;
