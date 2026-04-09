import React from "react";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { MRT_ColumnDef } from "material-react-table";
import { KTIcon } from "@metronic/helpers";
import { deleteConfirmation } from "@utils/modal";
import { deleteClientContact, getAllClientContacts } from "@services/companies";
import { useEffect, useMemo, useState } from "react";
import ClientContactsForm from "./components/ClientContactsForm";
import { useEventBus } from "@hooks/useEventBus";
import { getAllClientBranches } from "@services/lead";
import { getAllClientCompanies, getAllSubCompanies } from "@services/companies";
import eventBus from "@utils/EventBus";
import { useNavigate } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
interface Props {
  contactByRolesId?: string;
  startDate?: Dayjs;
  endDate?: Dayjs;
}
 
const ClientContactsMain = ({ contactByRolesId, startDate, endDate }: Props) => {
  const employeeId = useSelector(
    (state: RootState) => state.auth.currentUser?.id
  );
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);

  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [allContacts, setAllContacts] = useState<any>([]);
  const [allBranches, setAllBranches] = useState<any>([]);
  const [allCompanies, setAllCompanies] = useState<any>([]);
  const [allSubCompanies, setAllSubCompanies] = useState<any>([]);
  const [newContactModal, setNewContactModal] = useState(false);
  const loadAllContacts = async () => {
    try {
const contactsData = await getAllClientContacts();
const companiesData = await getAllClientCompanies();

const contacts = contactsData?.data?.contacts || [];
const companies = companiesData?.data?.companies || [];

// Map companyId → companyName
const companyMap = Object.fromEntries(
  companies.map((c: any) => [c.id, c.companyName])
);

// Sort contacts by company name (ascending)
const sortedContacts = contacts.sort((a: any, b: any) => {
  const nameA = companyMap[a.companyId] || "";
  const nameB = companyMap[b.companyId] || "";
  return nameA.localeCompare(nameB);
});

setAllContacts(sortedContacts);

// keep other states same
const branchesData = await getAllClientBranches();
setAllBranches(branchesData?.data?.leadBranches || []);

setAllCompanies(companies);

const subCompaniesData = await getAllSubCompanies();
setAllSubCompanies(subCompaniesData?.data?.subCompanies || []);
    } catch (error) {
      console.error("Error loading contacts:", error);
    }
  };

  const companyMap = useMemo(() => {
    const map = new Map();
    allCompanies.forEach((c: any) => map.set(c.id, c.companyName));
    return map;
  }, [allCompanies]);

  const branchMap = useMemo(() => {
    const map = new Map();
    allBranches.forEach((b: any) => map.set(b.id, b.name));
    return map;
  }, [allBranches]);

  const subCompanyMap = useMemo(() => {
    const map = new Map();
    allSubCompanies.forEach((s: any) => map.set(s.id, s));
    return map;
  }, [allSubCompanies]);
  
  useEventBus("clientContactUpdated", () => {
    loadAllContacts();
  });
  useEffect(() => {
    loadAllContacts();
  }, []);

  const handleEditClick = (id: string) => {
    setEditingContactId(id);
    setShowModal(true);
  };

  const addNewContact = (show: boolean) => {
    setNewContactModal(show);
  };

  const handleDelete = (contact: any) => {

    const deleteContact = async () => {
      try {
        const sure = await deleteConfirmation("Contact deleted successfully");
        if (!sure) return;
        await deleteClientContact(contact.id);
        eventBus.emit("clientContactUpdated");
      } catch (error) {
        console.error("Failed to delete contact", error);
      }
    };
    deleteContact();
  };

  const columns = useMemo<MRT_ColumnDef<any, any>[]>(
    () => [
      {
        accessorKey: "profile",
        header: "Profile",
        Cell: ({ row }) => {
          const { profilePhoto } = row.original;
          if(profilePhoto){
            return (
              <img
                src={profilePhoto}
                alt=""
                style={{ width: "33px", height: "33px", borderRadius: "50%" }}
              />
            );
          }
          return (
            <div
              className="rounded-circle bg-light d-flex align-items-center justify-content-center"
              style={{
                width: "33px",
                height: "33px",
                overflow: "hidden",
              }}
            > 
              <i className="fas fa-user text-muted fs-2"></i>
            </div>
          );
        },
      },
      {
        accessorKey: "fullName",
        header: "Full Name",
        Cell: ({ row }) =>{
          const { id } = row.original;

          return <button
            className="btn btn-link p-0 text-start text-decoration-none"
            style={{
              color: "inherit",
              fontWeight: "600",
              fontSize: "14px",
            }}
            onClick={() => {
              navigate(`/contacts/${id}`);
            }}
          >{row.original.fullName || 'NA'}</button>
        }
      },
      {
        accessorKey: "companyName",
        header: "Company Name",
        Cell: ({ row }) => {
          const { companyId, subCompanyId } = row.original;
          
          let companyName = companyMap.get(companyId);
          
          if (!companyName && subCompanyId) {
             const subCompany = subCompanyMap.get(subCompanyId);
             if (subCompany) {
                const mainCompName = companyMap.get(subCompany.mainCompanyId);
                companyName = `${mainCompName || "N/A"} (${subCompany.name})`;
             }
          }
          
          return companyName || 'NA';
        },
      },
      {
        accessorKey: "branch",
        header: "Branch",
        Cell: ({ row }) => {
          const { branch } = row.original;
          const branchName = branchMap.get(branch);
          return branchName || 'NA';
        },
      },
      {
        accessorKey: "roleInCompany",
        header: "Role in Company",
        Cell: ({ cell }) => cell.getValue<string>() || 'NA',
      },
      {
        accessorKey: "email",
        header: "Email",
        Cell: ({ cell }) => cell.getValue<string>() || 'NA',
      },
      {
        accessorKey: "phone",
        header: "Phone",
        Cell: ({ cell }) => cell.getValue<string>() || 'NA',
      },
      {
        accessorKey: "phone2",
        header: "Alternate Phone",
        Cell: ({ cell }) => cell.getValue<string>() || 'NA',
      },
      {
        accessorKey: "gender",
        header: "Gender",
        Cell: ({ cell }) => cell.getValue<string>() || 'NA',
      },
      {
        accessorKey: "dateOfBirth",
        header: "Date of Birth",
        Cell: ({ cell }) => {
          const date = cell.getValue() as string;
          return date ? new Date(date).toLocaleDateString() : 'NA';
        },
      },
      {
        accessorKey: "address",
        header: "Address",
        Cell: ({ row }) => {
          const { address, city, state, country, zipCode } = row.original;
          const parts = [address, city, state, country, zipCode].filter(Boolean);
          return parts.length ? parts.join(", ") : 'NA';
        },
      },
      {
        accessorKey: "note",
        header: "Note",
        Cell: ({ cell }) => cell.getValue<string>() || 'NA',
      },
      {
        accessorKey: "actions",
        header: "Actions",
        Cell: ({ row }) => {
          const handleWhatsAppShare = () => {
            const contact = row.original;
            const companyName = allCompanies.find((company: any) => company.id === contact.companyId)?.companyName || 'Unknown Company';
            const branchName = allBranches.find((branch: any) => branch.id === contact.branch)?.name || 'Unknown Branch';

            // Format address
            const { address, city, state, country, zipCode } = contact;
            const fullAddress = [address, city, state, country, zipCode].filter(Boolean).join(", ");

            // Create message with contact details
            const message = `Contact Information:
📋 Name: ${contact.fullName || 'N/A'}
🏢 Company: ${companyName}
🏪 Branch: ${branchName}
💼 Role: ${contact.roleInCompany || 'N/A'}
📧 Email: ${contact.email || 'N/A'}
📞 Phone: ${contact.phone || 'N/A'}
${contact.phone2 ? `📱 Alternate Phone: ${contact.phone2}` : ''}
🎂 Date of Birth: ${contact.dateOfBirth ? new Date(contact.dateOfBirth).toLocaleDateString() : 'N/A'}
📍 Address: ${fullAddress || 'N/A'}
${contact.note ? `📝 Note: ${contact.note}` : ''}`;

            // Create WhatsApp URL
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

            // Open WhatsApp
            window.open(whatsappUrl, '_blank');
          };

          return (
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                onClick={() => handleEditClick(row.original.id)}
                title="Edit Contact"
              >
                <KTIcon iconName="pencil" className="fs-3" />
              </button>
              <button
                className="btn btn-icon btn-bg-light btn-active-color-success btn-sm"
                onClick={handleWhatsAppShare}
                title="Share via WhatsApp"
              >
                <i className="fab fa-whatsapp fs-3 text-success"></i>
              </button>
              <button
                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                onClick={() => handleDelete(row.original)}
                title="Delete Contact"
              >
                <KTIcon iconName="trash" className="fs-3" />
              </button>
            </div>
          );
        },
      },
    ],
    [branchMap, companyMap, subCompanyMap, employeeId, allContacts]
  );

  const hideNewContactButton = contactByRolesId ? true : false;
  const startDates = useMemo(() => startDate ? dayjs(startDate).startOf("day") : null, [startDate]);
  const endDates = useMemo(() => endDate ? dayjs(endDate).endOf("day") : null, [endDate]);
  
  const filterData = useMemo(() => {
    const start = startDates;
    const end = endDates;
    return allContacts
      ?.filter((item: any) => {
        const createdAt = dayjs(item.createdAt);
        if (start && createdAt.isBefore(start)) return false;
        if (end && createdAt.isAfter(end)) return false;
        return true;
      })
      ?.filter((item: any) => {
        if (contactByRolesId) {
          return item.contactRoleId === contactByRolesId;
        }
        return true;
      });
  }, [allContacts, startDates, endDates, contactByRolesId]);
  

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-0">
        <div
          className=""
          style={{ fontFamily: "Barlow", fontWeight: "600", fontSize: "24px" }}
        >
           Contacts
        </div>
        
        { !hideNewContactButton && (
          <button className="btn btn-primary" onClick={() => addNewContact(true)}>
            Add New Contact
          </button>
        )}
      </div>
      <MaterialTable
        columns={columns}
        data={filterData}      
        tableName="Client Contacts"
        resource="CLIENT_CONTACTS"
        viewOwn={true}
        viewOthers={true}
        checkOwnWithOthers={true}
        employeeId={employeeId}
        muiTableProps={{
          sx: {
              borderCollapse: 'separate',
              borderSpacing: '0 20px !important', // 20px vertical spacing between rows

          },

          muiTableBodyRowProps: ({ row }) => ({
              // sx: {
              //     cursor: 'pointer',
              //     backgroundColor: `${row.original?.status?.color}`,
              //     // borderRadius: '8px',
              //     // margin:"20px !important"
              // },
              sx: {
                  cursor: 'pointer',
                  backgroundColor: `${row.original?.status?.color}30`,
                  // borderBottom:"5px solid red !important",
                  padding: '10px !important',
    
                  '& .MuiTableCell-root': {
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '14px',
                    fontFamily: 'Inter',
                    fontWeight: '400',
                    padding: '8px 16px !important',
                    borderBottom: "2px solid white",
                    borderTop: "2px solid white",
                    // borderLeft:"5px solid white"
                    // margin:"20px !important"
                  },
                  '& .MuiTableCell-root:first-of-type': {
                    borderTopLeftRadius: '12px',
                    borderBottomLeftRadius: '12px',
                    // marginTop:"40px !important"
                    borderLeft: "3px solid white"
    
                  },
                  '& .MuiTableCell-root:last-of-type': {
                    borderTopRightRadius: '12px',
                    borderBottomRightRadius: '12px',
                    borderRight: "3px solid white"
                  },
                  '&:hover': {
                    backgroundColor: `${row.original?.status?.color}99`,
                    '& td': {
                      color: 'black',
                    },
                  },
                },

              // onClick: () => {
              //     navigate(`/employee/lead/${row.original.id}`, {
              //         state: { leadData: row.original.id },
              //     });
              // },
          }),
      }}
      />
      <ClientContactsForm
        show={showModal}
        onClose={() => setShowModal(false)}
        contactId={editingContactId}
        initialData={
          editingContactId
            ? allContacts.find(
                (contact: any) => contact.id === editingContactId
              )
            : undefined
        }
      />


      <ClientContactsForm
        show={newContactModal}
        onClose={() => setNewContactModal(false)}
        contactId={null}
        key="add-new"
        initialData={undefined}
      />

    </div>
  );
};

export default ClientContactsMain;
