import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Box, Link, Stack, Typography } from "@mui/material";
import { fetchCurrentEmployeeByEmpId } from "@services/employee";
import { RootState } from "@redux/store";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import type { AppDispatch } from "@redux/store";
import Loader from "@app/modules/common/utils/Loader";
import ShowEmployeeDetailsById from "./ShowEmployeeDetailsById";
import SmartAvatar from "@app/modules/common/components/SmartAvatar";
import { resourceNameMapWithCamelCase, permissionConstToUseWithHasPermission } from "@constants/statistics";
import { hasPermission } from "@utils/authAbac";
import { canSection } from "@utils/can";
import { getEmployeeStatusString } from "@utils/employeeStatus";
import { formatPhoneWithCode } from "@utils/employeeFormat";
import EmployeeAccessTab from "./EmployeeAccessTab";
import EmployeeProject from "./EmployeeProject";
import AppSettingsModal from "./components/AppSettingsModal";
import MeetingsList from "@app/modules/common/components/MeetingsList";
import { useTabKeyRoute } from "@app/hooks/useTabRoute";
import { AppIcon, GlassSurface, UnderlineTabs, WhatsAppIcon, WtButton, WtIconButton } from "@app/modules/common/components/ui";
import AssignToProjectsDialog from "@app/modules/common/components/AssignToProjectsDialog";
import NoAccessPage from "@app/modules/common/components/NoAccessPage";

/** Tab keys in render order — they ARE the path segment. "access" is permission-gated,
 *  and opening its URL without the permission resolves to the first tab. */
const EMPLOYEE_TABS = [
  { key: "details", label: "Details", icon: "bi bi-person-vcard" },
  { key: "projects", label: "Projects", icon: "bi bi-kanban" },
  { key: "meetings", label: "Meetings", icon: "bi bi-camera-video" },
  { key: "access", label: "Access", icon: "bi bi-shield-lock" },
];
const EMPLOYEE_TAB_KEYS = EMPLOYEE_TABS.map((t) => t.key);

const ShowEmployeeDetailsToggle = () => {
  const canWrite = canSection("users", "write");
  const canEdit = hasPermission(resourceNameMapWithCamelCase.employee, permissionConstToUseWithHasPermission.editOthers);
  const { employeeId } = useParams<{ employeeId: string }>();
  const [employee, setEmployee] = useState<any>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // The tab is a path segment (/employees/<id>/projects) — shareable, survives a refresh,
  // and survives the remount the header does at the mobile breakpoint.
  const { activeKey: activeTab, setActiveKey: setActiveTab } = useTabKeyRoute(undefined, EMPLOYEE_TAB_KEYS);
  const [assignOpen, setAssignOpen] = useState(false);
  const [projectsReloadKey, setProjectsReloadKey] = useState(0);
  // ?openSettings=true (linked from elsewhere) opens App Settings once, then leaves the URL.
  const [showAppSettings, setShowAppSettings] = useState(
    () => new URLSearchParams(window.location.search).get("openSettings") === "true",
  );
  // Roles and per-section access are Admin / Super Admin only — the server refuses everyone else.
  const canManageAccess = useSelector((state: RootState) => (state as any).authz?.tier != null);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
    if (new URLSearchParams(window.location.search).has("openSettings")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [dispatch]);

  // Guard against a non-employee path segment (e.g. a stale/mismatched link)
  // landing on /employees/:employeeId — without this the page spins forever.
  const fetchEmployee = useCallback(async () => {
    try {
      setLoadFailed(false);
      const { data } = await fetchCurrentEmployeeByEmpId(employeeId!);
      if (data?.employee) setEmployee(data.employee);
      else setLoadFailed(true);
    } catch {
      setLoadFailed(true);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  if (loadFailed) {
    return (
      <NoAccessPage
        kind="record"
        title="You don't have access to this employee"
        message="The record may have moved, or your access doesn't include it. Ask an admin if you need it."
      />
    );
  }

  if (!employee) return <Loader />;

  const { users, designations, departments, branches, avatar, companyEmailId, companyPhoneNumber, companyPhoneExtension } = employee;
  const fullName = `${users.firstName} ${users.lastName}`.trim();
  const isActive = getEmployeeStatusString(employee) === "Active";
  const email = companyEmailId || users?.personalEmailId;
  const phone = companyPhoneNumber
    ? formatPhoneWithCode(companyPhoneNumber, companyPhoneExtension, "")
    : formatPhoneWithCode(users?.personalPhoneNumber, users?.personalPhoneNumberExtension, "");
  const tabs = EMPLOYEE_TABS.filter((t) => t.key !== "access" || canManageAccess);

  const handleWhatsAppShare = () => {
    const message = `CONTACT CARD

${fullName}
${designations?.role || "Employee"} | ${departments?.name || "Department"}
Email: ${companyEmailId || "N/A"}
Phone: ${companyPhoneNumber ? formatPhoneWithCode(companyPhoneNumber, companyPhoneExtension) : "N/A"}
Mobile: ${users.personalPhoneNumber ? formatPhoneWithCode(users.personalPhoneNumber, users.personalPhoneNumberExtension) : "N/A"}
Company: ${employee?.companyOverview?.name || "N/A"}
Branch: ${branches?.name || "N/A"}
Location: ${branches?.address || "N/A"}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleEditClick = () => {
    // Cancelling the wizard comes back HERE, not to the employee list.
    navigate(`/employees/edit/${employeeId}`, {
      state: { employeeId, returnTo: `${location.pathname}${location.search}` },
    });
  };

  return (
    <div className="p-2 md:p-4 max-w-[1600px] mx-auto">
      {/* Identity header — the same shape as a contact's: avatar carries active/inactive
          as its status ring, and the ways to reach the person are links, not just text. */}
      <GlassSurface
        variant="thin"
        radius={16}
        sx={{
          p: { xs: 2, md: 2.5 },
          mb: { xs: 2, md: 3 },
          display: "flex",
          alignItems: "flex-start",
          gap: { xs: 1.5, md: 2.5 },
          flexWrap: { xs: "wrap", lg: "nowrap" },
        }}
      >
        <WtIconButton
          onClick={() => navigate(-1)}
          title="Back"
          sx={{
            mt: 0.25, flexShrink: 0, width: 32, height: 32, borderRadius: "10px",
            bgcolor: "transparent", borderColor: "transparent", "& .fs-3": { fontSize: "1.05rem" },
          }}
        >
          <AppIcon name="arrow-left" className="fs-3" />
        </WtIconButton>

        <Box sx={{ flexShrink: 0 }}>
          <SmartAvatar
            name={fullName}
            id={employee?.id}
            imageUrl={avatar}
            size={84}
            shape="rounded"
            imageFit="cover"
            status={isActive ? "active" : "inactive"}
            enablePreview
          />
        </Box>

        <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {fullName}
          </Typography>

          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {designations?.role || "Role not specified"}
            </Typography>
            {departments?.name && (
              <Typography variant="body2" color="text.secondary">
                {departments.name}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              #{employee.employeeCode}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap" sx={{ pt: 0.25 }}>
            {phone && (
              <Link href={`tel:${phone.replace(/[^\d+]/g, "")}`} underline="hover" variant="body2" color="text.primary"
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                <AppIcon name="phone" className="fs-6" />
                {phone}
              </Link>
            )}
            {email && (
              <Link href={`mailto:${email}`} underline="hover" variant="body2" color="text.primary"
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                <AppIcon name="sms" className="fs-6" />
                <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>{email}</Box>
              </Link>
            )}
            {branches?.name && (
              <Typography variant="body2" color="text.secondary" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                <AppIcon name="geolocation" className="fs-6" />
                {branches.name}
              </Typography>
            )}
          </Stack>
        </Stack>

        <Stack direction="row" gap={1} flexWrap="wrap"
          sx={{ flexShrink: 0, width: { xs: "100%", lg: "auto" }, justifyContent: { lg: "flex-end" } }}>
          <WtButton inverted size="small" onClick={handleWhatsAppShare} startIcon={<WhatsAppIcon size={16} />} sx={{ whiteSpace: "nowrap" }}>
            Share details
          </WtButton>
          {canEdit && (
            <>
              <WtButton inverted size="small" onClick={() => setShowAppSettings(true)}
                startIcon={<AppIcon name="setting-2" className="fs-5" />} sx={{ whiteSpace: "nowrap" }}>
                App settings
              </WtButton>
              <WtButton size="small" onClick={handleEditClick}
                startIcon={<AppIcon name="pencil" className="fs-5" />} sx={{ whiteSpace: "nowrap" }}>
                Edit details
              </WtButton>
            </>
          )}
        </Stack>
      </GlassSurface>

      {/* The button rides the tab bar's own action slot, so it sits on the tabs' rule at
          tab height instead of a full-size CTA hanging below the row. */}
      <UnderlineTabs
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
        ariaLabel="Employee sections"
        actions={canWrite && activeTab === "projects" ? (
          <WtButton size="small" startIcon={<AppIcon name="plus" className="fs-5" />} onClick={() => setAssignOpen(true)} sx={{ whiteSpace: "nowrap" }}>
            Add to projects
          </WtButton>
        ) : undefined}
      />
      <AssignToProjectsDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        target={{ employeeId: employeeId! }}
        name={fullName}
        onAssigned={() => setProjectsReloadKey((k) => k + 1)}
      />

      <div className="tab-content">
        {activeTab === "details" && <ShowEmployeeDetailsById employee={employee} />}
        {activeTab === "projects" && <EmployeeProject employeeId={employeeId!} reloadKey={projectsReloadKey} />}
        {activeTab === "meetings" && <MeetingsList mode="employee" targetId={employeeId!} />}
        {activeTab === "access" && canManageAccess && <EmployeeAccessTab employeeId={employeeId!} />}
      </div>

      <AppSettingsModal
        show={showAppSettings}
        onClose={() => setShowAppSettings(false)}
        onSuccess={fetchEmployee}
        employeeId={employeeId!}
      />
    </div>
  );
};

export default ShowEmployeeDetailsToggle;
