import { useEffect, useMemo, useState } from "react";
import { Button, Table, Spinner } from "react-bootstrap";
import { deleteClientBranch, getAllClientBranches, getClientBranchesByCompanyId } from "@services/lead";
import CompaniesBranchForm from "./CompaniesBranchForm";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { MRT_ColumnDef } from "material-react-table";
import { KTIcon } from "@metronic/helpers";
import { RootState } from "@redux/store";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import { fetchAllCountries, fetchAllStates, fetchAllCities } from "@services/options";
import { deleteConfirmation } from "@utils/modal";
import { getAllClientContacts } from "@services/companies";
import Loader from "@app/modules/common/utils/Loader";

interface Branch {
  id: string;
  name: string;
  type: string;
  address: string;
  country: string;
  state: string;
  city: string;
  zipCode: string;
  area: string;
  createdAt: string;
  contactId: string;
  email: string;
  phone: string;
}

const CompaniesBranch = ({companyId}: {companyId: string}) => {
  const [showModal, setShowModal] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  const fetchBranches = async () => {
    try {    
        
      const countriesResponse = await fetchAllCountries();
      setCountries(countriesResponse || []);
      const response = await getClientBranchesByCompanyId(companyId);
      setBranches(response.leadBranches || []);
      const contactsResponse = await getAllClientContacts();
      setContacts(contactsResponse?.data?.contacts || []);
    } catch (error) {
      console.error("Failed to fetch branches", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [companyId]);

  const handleEditBranch = (branchId: string) => {
    setEditingBranchId(branchId);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBranchId(null);
  };

  const handleSuccess = () => {
    fetchBranches();
    handleCloseModal();
  };

  const handleDelete = async (branch: Branch) => {
    try {
      const sure = await deleteConfirmation("Branch deleted successfully");
      if (!sure) return;
      await deleteClientBranch(branch.id);
      fetchBranches();
    } catch (error) {
      console.error("Failed to delete branch", error);
    }
  };


  const columns = useMemo<MRT_ColumnDef<Branch, any>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Branch Name",
      },
      {
        accessorKey: "contactId",
        header: "Contact Person",
        Cell: ({ row }) => (
          <div className="d-flex align-items-center gap-2">
            <span>{contacts.find((contact) => contact.id === row.original.contactId)?.fullName}</span>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
      },
      {
        accessorKey: "phone",
        header: "Phone",
      },
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
      },
      {
        accessorKey: "country",
        header: "Country",
      },
      {
        accessorKey: "state",
        header: "State",
      },
      {
        accessorKey: "city",
        header: "City",
      },
      {
        accessorKey: "zipCode",
        header: "ZIP Code",
      },
      {
        accessorKey: "area",
        header: "Area",
      },
      {
        accessorKey: "actions",
        header: "Actions",
        Cell: ({ row }) => (
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
              onClick={() => handleEditBranch(row.original.id)}
            >
              <KTIcon iconName="pencil" className="fs-3" />
            </button>
            <button
              className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
              onClick={() => handleDelete(row.original)}
            >
              <KTIcon iconName="trash" className="fs-3" />
            </button>
          </div>
        ),
      },
    ],
    [handleEditBranch, contacts]
  );



  if (isLoading) {
    return <Loader/>
  }


  return (
    <div className="p-4">
      <div className="d-flex justify-content-end align-items-center mb-4">
        <Button variant="primary" onClick={() => setShowModal(true)}>
          Add New Branch
        </Button>
      </div>

      <MaterialTable
        columns={columns}
        data={branches}
        tableName="ClientBranches"
        employeeId={employeeIdCurrent}
        resource="BRANCHES"
        viewOwn={true}
        viewOthers={true}
        checkOwnWithOthers={true}
      />

      <CompaniesBranchForm
        show={showModal}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        editingBranchId={editingBranchId}
        selectedCompanyId={companyId}
      />
    </div>
  );
};

export default CompaniesBranch;