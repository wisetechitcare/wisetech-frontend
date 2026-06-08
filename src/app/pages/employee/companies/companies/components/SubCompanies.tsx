
import { useEffect, useMemo, useState } from "react";
import { Button, Spinner } from "react-bootstrap";
import { fetchSubCompaniesByCompanyId, deleteSubCompany } from "@services/company";
import SubCompanyForm from "./SubCompanryForm";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { MRT_ColumnDef } from "material-react-table";
import { KTIcon } from "@metronic/helpers";
import { RootState } from "@redux/store";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import { deleteConfirmation } from "@utils/modal";
import Loader from "@app/modules/common/utils/Loader";

interface SubCompanyType {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SubCompany {
  id: string;
  mainCompanyId: string;
  logo: string | null;
  subCompanyName: string;
  subCompanyTypeId: string;
  subClientTypeId: string | null;
  status: string;
  overallRating: string;
  phone: string | null;
  phone2: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  country: string | null;
  zipCode: string | null;
  area: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  longitude: string | null;
  latitude: string | null;
  gmbProfileUrl: string | null;
  googleMapsLink: string | null;
  blacklisted: boolean;
  visibility: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  subCompanyType: SubCompanyType | null;
  subClientType: any;
}

const SubCompanies = ({companyId, companyTypeId}: {companyId: string; companyTypeId?: string}) => {
  const [showModal, setShowModal] = useState(false);
  const [subCompanies, setSubCompanies] = useState<SubCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSubCompanyId, setEditingSubCompanyId] = useState<string | null>(null);
  const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);

  const fetchSubCompanies = async () => {
    try {
      setIsLoading(true);
      const response = await fetchSubCompaniesByCompanyId(companyId);

      // Handle the response data structure based on the API response provided
      let subCompaniesData = [];

      if (response.data?.subCompanies) {
        subCompaniesData = response.data.subCompanies;
      } else if (response.subCompanies) {
        subCompaniesData = response.subCompanies;
      } else if (Array.isArray(response.data)) {
        subCompaniesData = response.data;
      } else if (Array.isArray(response)) {
        subCompaniesData = response;
      }

      setSubCompanies(subCompaniesData);
    } catch (error) {
      console.error("Failed to fetch sub-companies", error);
      setSubCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubCompanies();
  }, [companyId]);

  const handleEditSubCompany = (subCompanyId: string) => {
    setEditingSubCompanyId(subCompanyId);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSubCompanyId(null);
  };

  const handleSuccess = () => {
    fetchSubCompanies();
    handleCloseModal();
  };

  const handleDelete = async (subCompany: SubCompany) => {
    try {
      const sure = await deleteConfirmation("Sub-company deleted successfully");
      if (!sure) return;
      await deleteSubCompany(subCompany.id);
      fetchSubCompanies();
    } catch (error) {
      console.error("Failed to delete sub-company", error);
    }
  };

  const columns = useMemo<MRT_ColumnDef<SubCompany, any>[]>(
    () => [
        {
        accessorKey: "logo",
        header: "Logo",
        Cell: ({ row }) => (
          <div style={{ width: "50px", height: "50px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {row.original.logo ? (
              <img
                src={row.original.logo}
                alt="Company Logo"
                style={{
                  width: "50px",
                  height: "50px",
                  objectFit: "cover",
                  borderRadius: "50%",
                  border: "2px solid #e9ecef"
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Ccircle cx='25' cy='25' r='24' fill='%23f8f9fa' stroke='%23e9ecef' stroke-width='2'/%3E%3Ctext x='25' y='29' text-anchor='middle' fill='%236c757d' font-family='Arial' font-size='10'%3ELogo%3C/text%3E%3C/svg%3E";
                }}
              />
            ) : (
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  backgroundColor: "#f8f9fa",
                  border: "2px solid #e9ecef",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "9px",
                  color: "#6c757d",
                  textAlign: "center",
                  lineHeight: "1"
                }}
              >
                Logo
              </div>
            )}
          </div>
        ),
        },
      {
        accessorKey: "subCompanyName",
        header: "Name",
        Cell: ({ row }) => (
          <span>{row.original.subCompanyName || "N/A"}</span>
        ),
      },
      {
        accessorKey: "subCompanyType",
        header: "Company Type",
        Cell: ({ row }) => (
          <span>{row.original.subCompanyType?.name || "N/A"}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ row }) => (
          <span className={`badge ${row.original.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        Cell: ({ row }) => (
          <span>{row.original.email || "N/A"}</span>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        Cell: ({ row }) => (
          <span>{row.original.phone || "N/A"}</span>
        ),
      },
      // {
      //   accessorKey: "overallRating",
      //   header: "Rating",
      //   Cell: ({ row }) => (
      //     <div className="d-flex align-items-center gap-1">
      //       <KTIcon iconName="star" className="fs-6 text-warning" />
      //       <span>{row.original.overallRating || "0"}</span>
      //     </div>
      //   ),
      // },
      {
        accessorKey: "createdAt",
        header: "Created",
        Cell: ({ row }) => (
          <div className="d-flex align-items-center gap-2">
            <span>{dayjs(row.original.createdAt.split("T")[0]).format("DD-MM-YYYY")}</span>
          </div>
        ),
      },
      {
        accessorKey: "address",
        header: "Address",
        Cell: ({ row }) => (
          <span>{row.original.address || "N/A"}</span>
        ),
      },
      {
        accessorKey: "country",
        header: "Country",
        Cell: ({ row }) => (
          <span>{row.original.country || "N/A"}</span>
        ),
      },
      {
        accessorKey: "state",
        header: "State",
        Cell: ({ row }) => (
          <span>{row.original.state || "N/A"}</span>
        ),
      },
      {
        accessorKey: "city",
        header: "City",
        Cell: ({ row }) => (
          <span>{row.original.city || "N/A"}</span>
        ),
      },
      {
        accessorKey: "blacklisted",
        header: "Blacklisted",
        Cell: ({ row }) => (
          <span className={`badge ${row.original.blacklisted ? 'badge-danger' : 'badge-success'}`}>
            {row.original.blacklisted ? 'Yes' : 'No'}
          </span>
        ),
      },
      {
        accessorKey: "actions",
        header: "Actions",
        Cell: ({ row }) => (
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
              onClick={() => handleEditSubCompany(row.original.id)}
              title="Edit Sub-Company"
            >
              <KTIcon iconName="pencil" className="fs-3" />
            </button>
            <button
              className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
              onClick={() => handleDelete(row.original)}
              title="Delete Sub-Company"
            >
              <KTIcon iconName="trash" className="fs-3" />
            </button>
          </div>
        ),
      },
    ],
    [handleEditSubCompany]
  );

  if (isLoading) {
    return <Loader/>
  }

  // Debug log to see what data we're passing to the table

  return (
    <div className="p-4">
      <div className="d-flex justify-content-end align-items-center mb-4">
        {/* <h5 className="mb-0">Sub-Companies ({subCompanies.length})</h5> */}
        <Button variant="primary" onClick={() => setShowModal(true)}>
          Add New Sub-Company
        </Button>
      </div>

      <MaterialTable
        columns={columns}
        data={subCompanies}
        tableName="SubCompanies"
        employeeId={employeeIdCurrent}
        resource="SUB_COMPANIES"
        viewOwn={true}
        viewOthers={true}
        checkOwnWithOthers={true}
      />

      <SubCompanyForm
        show={showModal}
        onClose={handleSuccess}
        editingSubCompanyId={editingSubCompanyId}
        mainCompanyId={companyId}
        companyTypeId={companyTypeId}
      />
    </div>
  );
};

export default SubCompanies;