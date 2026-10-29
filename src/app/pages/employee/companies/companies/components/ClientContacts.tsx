import React, { useEffect, useMemo, useState } from "react";
import SmartAvatar from "@app/modules/common/components/SmartAvatar";
import { Link } from "react-router-dom";
import { Button } from "@/ds/ui/button";
import ClientContactsForm from "../../contacts/components/ClientContactsForm";
import { getClientContactsByCompanyId, deleteClientContact } from "@services/companies";
import { crmListRowSx } from "../../crmListRowSx";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { MRT_ColumnDef } from "material-react-table";
import { KTIcon } from "@metronic/helpers";
import { deleteConfirmation } from "@utils/modal";
import { canSection } from "@utils/can";
import { getAllClientBranches } from "@services/lead";

const ClientContacts = ({ companyId }: { companyId: string }) => {
  const canWrite = canSection("crm.companies", "write");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingContactData, setEditingContactData] = useState<any>(null); // Separate state for editing data
  const [contacts, setContacts] = useState<any[]>([]);
  const [allBranches, setAllBranches] = useState<any[]>([]);
  const employeeId = useSelector((state: RootState) => state.auth.currentUser?.id);

  const fetchClientContacts = async () => {
    try {
      const response = await getClientContactsByCompanyId(companyId);
      setContacts(response.data?.contacts || []);
      const branchesResponse = await getAllClientBranches();
      setAllBranches(branchesResponse?.data?.leadBranches || []);
    } catch (error) {
      console.error("Failed to fetch contacts", error);
    }
  };

  useEffect(() => {
    fetchClientContacts();
  }, [companyId]);

  const handleEditClick = (contactId: string) => {
    const contactToEdit = contacts.find(contact => contact.id === contactId);
    setEditingContactId(contactId);
    setEditingContactData(contactToEdit || null);
    setShowEditModal(true);
  };

  const handleAddNewClick = () => {
    // Clear any previous editing state
    setEditingContactId(null);
    setEditingContactData(null);
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    // Clear the editing state when closing add modal
    setEditingContactId(null);
    setEditingContactData(null);
    fetchClientContacts(); // Refresh data if needed
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingContactId(null);
    setEditingContactData(null);
    fetchClientContacts(); // Refresh data if needed
  };

  const handleDelete = async (contact: any) => {
    try {
      const sure = await deleteConfirmation("Contact deleted.");
      if (!sure) return;
      const response = await deleteClientContact(contact.id);
      fetchClientContacts();
    } catch (error) {
      console.error("Failed to delete contact", error);
    }
  };

  const columns = useMemo<MRT_ColumnDef<any, any>[]>(
    () => [
      {
        accessorKey: "profile",
        header: "Profile",
        Cell: ({ row }) => (
          <SmartAvatar
            name={row.original.fullName}
            id={row.original.id}
            imageUrl={row.original.profilePhoto}
            size={42}
            imageFit="cover"
            status={row.original.isContactActive === false ? "inactive" : "active"}
          />
        ),
      },
      {
        accessorKey: "fullName",
        header: "Full Name",
        Cell: ({ row }) => (
          <Link
            to={`/contacts/${row.original.id}`}
            className="text-start text-decoration-none"
            style={{ color: "inherit", fontWeight: 600, fontSize: "14px" }}
          >
            {row.original.fullName || "NA"}
          </Link>
        ),
      },
      {
        accessorKey: "branch",
        header: "Branch",
        Cell: ({ row }) => {
          const { branch } = row.original;

          const branchName = allBranches.find((branchs: any) => branchs.id === branch)?.name;

          return branchName;
        },
      },
      {
        accessorKey: "roleInCompany",
        header: "Role in Company",
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
        accessorKey: "phone2",
        header: "Alternate Phone",
      },
      {
        accessorKey: "gender",
        header: "Gender",
      },
      {
        accessorKey: "dateOfBirth",
        header: "Date of Birth",
        Cell: ({ cell }) => {
          const date = cell.getValue() as string;
          return date ? new Date(date).toLocaleDateString() : '';
        },
      },
      {
        accessorKey: "address",
        header: "Address",
        Cell: ({ row }) => {
          const { address, city, state, country, zipCode } = row.original;
          return [address, city, state, country, zipCode].filter(Boolean).join(', ');
        },
      },
      {
        accessorKey: "note",
        header: "Note",
      },
      ...(canWrite ? [{
        accessorKey: "actions",
        header: "Actions",
        Cell: ({ row }: any) => (
          <div className="d-flex align-items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit contact"
              onClick={() => handleEditClick(row.original.id)}
            >
              <KTIcon iconName="pencil" className="fs-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete contact"
              onClick={() => handleDelete(row.original)}
            >
              <KTIcon iconName="trash" className="fs-3" />
            </Button>
          </div>
        ),
      }] : []),
    ],
    [allBranches, contacts, employeeId, canWrite]
  );

  return (
    <div>
      {canWrite && (
      <div className="d-flex justify-content-end align-items-center mb-4">
        <Button onClick={handleAddNewClick}>
          Add New Contact
        </Button>
      </div>
      )}

      <MaterialTable
        columns={columns}
        data={contacts}
        employeeId={employeeId}
        tableName="Client Contacts"
        resource="CLIENT_CONTACTS"
        viewOwn={true}
        viewOthers={true}
        checkOwnWithOthers={true}
        defaultSorting={[{ id: "fullName", desc: false }]}
        muiTableProps={{
          muiTableBodyRowProps: ({ row }) => ({
            sx: crmListRowSx(row.original.isContactActive !== false),
          }),
        }}
      />

      {/* Form for adding new contacts */}
      <ClientContactsForm
        show={showAddModal}
        onClose={handleCloseAddModal}
        contactId={null}
        initialData={undefined}
        selectedCompanyId={companyId}
        key="add-new"
      />

      {/* Form for editing existing contacts */}
      <ClientContactsForm
        show={showEditModal}
        onClose={handleCloseEditModal}
        contactId={editingContactId}
        clearContactId={() => setEditingContactId(null)}
        initialData={editingContactData}
        selectedCompanyId={companyId}
        key="edit"
      />
    </div>
  );
};

export default ClientContacts;