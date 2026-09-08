import React, { useEffect, useMemo, useState } from "react";
import { Box } from "@mui/material";
import { getContactCountByRoles } from "@services/companies";
import CustomBarChart from "../../../projects/commonComponents/BarChart";
import { CompanyDialogModal } from "../../companyOverview/components/CompanyDialogModal";
import Loader from "@app/modules/common/utils/Loader";
import { StatTile, ToolbarFilterSelect, TRIO } from "@app/modules/common/components/ui";

interface RoleDatum {
  id: string;
  name: string;
  contactCount: number;
  color?: string;
  /** Per-gender counts for this role; keys are MALE / FEMALE / OTHER / UNSPECIFIED. */
  contactCountByGender?: Record<string, number>;
}

/**
 * Gender buckets, in the order they read on the toolbar. UNSPECIFIED is its own option
 * rather than being folded into OTHER: "Other" is a gender someone stated, "Not specified"
 * is a field nobody filled in, and merging them would quietly overstate the former.
 */
const GENDERS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "UNSPECIFIED", label: "Not specified" },
];

// Contacts → Overview tab: the "Contacts By Roles" chart (moved here from the
// Companies overview). Clicking a bar opens the role-filtered contacts list.
const ContactsOverview: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [rolesData, setRolesData] = useState<RoleDatum[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [contactByRolesId, setContactByRolesId] = useState("");
  const [gender, setGender] = useState("ALL");

  const fetchData = async () => {
    setLoading(true);
    try {
      // No date range here → all-time counts (the endpoint accepts neither-or-both dates).
      const res = await getContactCountByRoles();
      setRolesData(res?.contactCountByRole || []);
    } catch (e) {
      console.error("Error loading contacts by roles:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /** The count for one role under the active gender — the whole role when unfiltered. */
  const countFor = (r: RoleDatum, g: string) =>
    g === "ALL" ? r.contactCount : r.contactCountByGender?.[g] ?? 0;

  const chartData = useMemo(
    () =>
      rolesData.map((r) => ({
        label: r.name,
        value: countFor(r, gender),
        color: r.color || "#3B82F6",
      })),
    [rolesData, gender]
  );

  // Totals per bucket, so each option can carry its own count and the filter answers
  // "how many women" without being switched to first.
  const totals = useMemo(() => {
    const t: Record<string, number> = { ALL: 0 };
    rolesData.forEach((r) => {
      t.ALL += r.contactCount;
      GENDERS.forEach(({ value }) => {
        t[value] = (t[value] ?? 0) + (r.contactCountByGender?.[value] ?? 0);
      });
    });
    return t;
  }, [rolesData]);

  const activeLabel = GENDERS.find((g) => g.value === gender)?.label;

  const handleChartClick = (selectedLabel: string) => {
    const found = rolesData.find((r) => r.name === selectedLabel);
    setContactByRolesId(found?.id || selectedLabel);
    setOpenModal(true);
  };

  if (loading) return <Loader />;

  const header = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
      <Box sx={{ minWidth: 150 }}>
        <StatTile
          label={activeLabel ? `${activeLabel} contacts` : "Contacts"}
          value={(totals[gender] ?? 0).toLocaleString("en-IN")}
          trio={TRIO.blue}
          icon="profile-user"
        />
      </Box>
      <Box sx={{ minWidth: 130 }}>
        <StatTile
          label="Roles"
          value={rolesData.length}
          trio={TRIO.purple}
          icon="briefcase"
        />
      </Box>
      <Box sx={{ ml: { sm: "auto" } }}>
        <ToolbarFilterSelect
          label="Gender"
          icon="bi-people"
          value={gender}
          onChange={setGender}
          minWidth={190}
          options={[
            { value: "ALL", label: `All genders (${totals.ALL ?? 0})` },
            ...GENDERS.map((g) => ({ value: g.value, label: `${g.label} (${totals[g.value] ?? 0})` })),
          ]}
        />
      </Box>
    </Box>
  );

  return (
    <div className="row g-4">
      <div className="col-12">
        <CustomBarChart
          data={chartData}
          title="Contacts By Roles"
          height={400}
          showFilter={false}
          sortMode="count"
          showValueAnnotation={false}
          persistKey="contactsByRoles"
          onChartClick={handleChartClick}
          headerExtra={header}
        />
      </div>

      <CompanyDialogModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        contactByRolesId={contactByRolesId}
      />
    </div>
  );
};

export default ContactsOverview;
