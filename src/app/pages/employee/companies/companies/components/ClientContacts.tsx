import React, { useEffect, useMemo, useState } from "react";
import { formatBirthday, isYearless } from "@utils/birthday";
import SmartAvatar from "@app/modules/common/components/SmartAvatar";
import { Link } from "react-router-dom";
import { Button } from "@/ds/ui/button";
import ClientContactsForm from "../../contacts/components/ClientContactsForm";
import { getClientContactsByCompanyId, deleteClientContact } from "@services/companies";
import { CRM_FORMER_COLOR } from "../../crmListRowSx";
import { DataTable, type ColumnDef } from '@/ds/patterns/data-table';
import { deleteConfirmation } from "@utils/modal";
import { canDelete, canSection } from "@utils/can";
import { getAllClientBranches } from "@services/lead";
import dayjs from "dayjs";
import { Box } from "@mui/material";
import { ActionIconButton, ToneChip } from "@app/modules/common/components/ui";

const ClientContacts = ({ companyId }: { companyId: string }) => {
  const canWrite = canSection("crm.companies", "write");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingContactData, setEditingContactData] = useState<any>(null); // Separate state for editing data
  const [contacts, setContacts] = useState<any[]>([]);
  // People who worked here and moved on — read-only, their current company owns them now.
  const [formerContacts, setFormerContacts] = useState<any[]>([]);
  const [allBranches, setAllBranches] = useState<any[]>([]);

  const fetchClientContacts = async () => {
    try {
      const response = await getClientContactsByCompanyId(companyId);
      setContacts(response.data?.contacts || []);
      setFormerContacts(response.data?.formerContacts || []);
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

  // Former contacts share the table, flagged by `__former` (their stint at THIS company):
  // the role is what they were here, and the branch belongs to their new employer, so blank.
  const rows = useMemo(
    () => [
      ...contacts,
      ...formerContacts.map((c) => {
        const stint = c.companyHistory?.[0];
        return { ...c, __former: stint, branch: null, roleInCompany: stint?.contactRole?.name || stint?.roleInCompany || "" };
      }),
    ],
    [contacts, formerContacts],
  );

  const columns = useMemo<ColumnDef<any, any>[]>(
    () => [
      {
        accessorKey: "profile",
        header: "Profile",
        cell: ({ row }) => (
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
        cell: ({ row }) => (
          // nowrap + no shrink: squeezed flex children wrapped one letter per line.
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, whiteSpace: "nowrap", "& > *": { flexShrink: 0 } }}>
            <Link
              to={`/contacts/${row.original.id}`}
              className="text-start text-decoration-none"
              style={{ color: "inherit", fontWeight: 600, fontSize: "14px", whiteSpace: "nowrap" }}
            >
              {row.original.fullName || "NA"}
            </Link>
            {row.original.__former && (
              <ToneChip dense color={CRM_FORMER_COLOR} label={`Former · left ${dayjs(row.original.__former.endDate).format("MMM YYYY")}`} />
            )}
          </Box>
        ),
      },
      {
        accessorKey: "branch",
        header: "Branch",
        cell: ({ row }) => {
          const { branch } = row.original;
          // A former contact's branch is their new employer's — say where they went instead.
          if (row.original.__former) {
            return row.original.company?.companyName ? `Now at ${row.original.company.companyName}` : "";
          }

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
        cell: ({ cell }) => {
          const date = cell.getValue() as string;
          // A birthday saved without its year shows as day + month only.
          return date ? (isYearless(date) ? formatBirthday(date) : new Date(date).toLocaleDateString()) : '';
        },
      },
      {
        accessorKey: "address",
        header: "Address",
        cell: ({ row }) => {
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
        // A former contact is edited from their current company, not from here.
        cell: ({ row }: any) => row.original.__former ? null : (
          <div className="d-flex align-items-center gap-2">
            <ActionIconButton iconName="pencil" title="Edit" size="sm" onClick={() => handleEditClick(row.original.id)} />
            {canDelete("crm.contacts") && <ActionIconButton iconName="trash" title="Delete" size="sm" tone="danger" onClick={() => handleDelete(row.original)} />}
          </div>
        ),
      }] : []),
    ],
    [allBranches, contacts, canWrite]
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

      <DataTable
        caption="Client Contacts"
        columns={columns}
        data={rows}
        getRowId={(r: any) => r.id}
        initialSorting={[{ id: "fullName", desc: false }]}
        stateKey="crm.companyContacts"
        groupableColumns={false}
        rowTone={(r: any) =>
          r.__former
            ? CRM_FORMER_COLOR
            : r.isContactActive === false
              ? "neutral"
              : "success"
        }
        searchPlaceholder="Search contacts…"
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