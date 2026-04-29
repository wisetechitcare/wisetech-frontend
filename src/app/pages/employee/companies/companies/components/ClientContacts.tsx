import React, { useEffect, useMemo, useState } from "react";
import { Button } from "react-bootstrap";
import ClientContactsForm from "../../contacts/components/ClientContactsForm";
import { getClientContactsByCompanyId, deleteClientContact } from "@services/companies";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { MRT_ColumnDef } from "material-react-table";
import { KTIcon } from "@metronic/helpers";
import { deleteConfirmation } from "@utils/modal";
import { getAllClientBranches } from "@services/lead";

const ClientContacts = ({ companyId }: { companyId: string }) => {
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
        const sure = await deleteConfirmation("Contact deleted successfully");
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
          Cell: ({ row }) => {
            const { profilePhoto, fullName } = row.original;
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
              fullName || "User"
            )}&background=eeeeee&color=888888&size=50&rounded=true`;

            return (
              <img
                src={profilePhoto || fallbackAvatar}
                alt=""
                style={{ width: "50px", height: "50px", borderRadius: "50%" }}
              />
            );
          },
        },
        {
          accessorKey: "fullName",
          header: "Full Name",
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
        {
          accessorKey: "actions",
          header: "Actions",
          Cell: ({ row }) => (
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                onClick={() => handleEditClick(row.original.id)}
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
      [allBranches, contacts, employeeId]
    );

    return (
        <div>
             <div className="d-flex justify-content-end align-items-center mb-4">
        <Button variant="primary" onClick={handleAddNewClick}>
          Add New Contact
        </Button>
      </div>

      <MaterialTable
        columns={columns}
        data={contacts}
        employeeId={employeeId}
        tableName="Client Contacts"
        resource="CLIENT_CONTACTS"
        viewOwn={true}
        viewOthers={true}
        checkOwnWithOthers={true}
      />

    {/* Form for adding new contacts */}
    <ClientContactsForm 
      show={showAddModal} 
      onClose={handleCloseAddModal}
      contactId={null} 
      initialData={undefined} 
      key="add-new"
    />
    
    {/* Form for editing existing contacts */}
    <ClientContactsForm 
      show={showEditModal} 
      onClose={handleCloseEditModal}
      contactId={editingContactId} 
      clearContactId={() => setEditingContactId(null)}
      initialData={editingContactData} 
      key="edit"
    />
        </div>
    );
};

export default ClientContacts;