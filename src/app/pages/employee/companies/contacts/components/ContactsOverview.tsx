import React, { useEffect, useState } from "react";
import { getContactCountByRoles } from "@services/companies";
import CustomBarChart from "../../../projects/commonComponents/BarChart";
import { CompanyDialogModal } from "../../companyOverview/components/CompanyDialogModal";
import Loader from "@app/modules/common/utils/Loader";

interface RoleDatum {
  id: string;
  name: string;
  contactCount: number;
  color?: string;
}

// Contacts → Overview tab: the "Contacts By Roles" chart (moved here from the
// Companies overview). Clicking a bar opens the role-filtered contacts list.
const ContactsOverview: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [rolesData, setRolesData] = useState<RoleDatum[]>([]);
  const [chartData, setChartData] = useState<{ label: string; value: number; color: string }[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [contactByRolesId, setContactByRolesId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      // No date range here → all-time counts (the endpoint accepts neither-or-both dates).
      const res = await getContactCountByRoles();
      const raw: RoleDatum[] = res?.contactCountByRole || [];
      setRolesData(raw);
      setChartData(
        raw.map((item) => ({
          label: item.name,
          value: item.contactCount,
          color: item.color || "#3B82F6",
        }))
      );
    } catch (e) {
      console.error("Error loading contacts by roles:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChartClick = (selectedLabel: string) => {
    const found = rolesData.find((r) => r.name === selectedLabel);
    setContactByRolesId(found?.id || selectedLabel);
    setOpenModal(true);
  };

  if (loading) return <Loader />;

  return (
    <div className="row g-4">
      <div className="col-12">
        <CustomBarChart
          data={chartData}
          title="Contacts By Roles"
          height={400}
          showFilter={false}
          onChartClick={handleChartClick}
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
