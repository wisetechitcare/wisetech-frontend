import React from "react";
import SmartAvatar from "@app/modules/common/components/SmartAvatar";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { MRT_ColumnDef } from "material-react-table";
import { KTIcon } from "@metronic/helpers";
import { deleteConfirmation } from "@utils/modal";
import { deleteClientContact, getAllClientContacts } from "@services/companies";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import ClientContactsForm from "./components/ClientContactsForm";
import { useEventBus } from "@hooks/useEventBus";
import { getAllClientBranches } from "@services/lead";
import eventBus from "@utils/EventBus";
import { useNavigate } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
import { can, canSection } from "@utils/can";
import { SegmentedControl, WtButton } from "@app/modules/common/components/ui";
import GoogleContactsImportDialog from "./components/GoogleContactsImportDialog";
import { toContactFormPrefill, type ContactFormPrefill, type GoogleContactCandidate } from "./components/googleContactPrefill";
import { useServerPagination } from "@hooks/useServerPagination";
import { fetchAllPages } from "@utils/fetchAllPages";

/**
 * "A2O Realty", or "A&O Realty (Vashi)" for a contact filed under a sub-company. Read off the
 * row: the server sends the names with it, so no company table has to be downloaded to say it.
 */
const companyLabel = (contact: any): string | undefined => {
  if (contact.company?.companyName) return contact.company.companyName;
  const sub = contact.subCompany;
  if (sub) return `${sub.mainCompany?.companyName || "N/A"} (${sub.subCompanyName})`;
  return undefined;
};

interface Props {
  contactByRolesId?: string;
  startDate?: Dayjs;
  endDate?: Dayjs;
  /**
   * Gender bucket to narrow the list to — MALE / FEMALE / OTHER, or UNSPECIFIED for
   * contacts saved without one. Set when a drill-down arrives from a chart that is
   * itself filtered by gender, so the list matches the count on the bar that opened it.
   */
  gender?: string;
}

const ClientContactsMain = ({
  contactByRolesId,
  startDate,
  endDate,
  gender,
}: Props) => {
  // Use the same id source as the (working) Companies table so table preferences
  // (column visibility, sorting, page size, …) persist across reloads/login.
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee?.id,
  );
  const currentUser = useSelector((state: RootState) => state.auth.currentUser);
  const allEmployees = useSelector((state: RootState) => state.allEmployees?.list);

  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // Seeded with the table's default sort, so the first request is already in that order.
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: "fullName", desc: false }]);
  /** Google-imported contacts, tenant-wide — sizes the source switch, so never filtered. */
  const [googleCount, setGoogleCount] = useState(0);
  const [allBranches, setAllBranches] = useState<any>([]);
  const [newContactModal, setNewContactModal] = useState(false);
  const [googleImportOpen, setGoogleImportOpen] = useState(false);
  // Imported rows carry `googleResourceId` (provenance only) — that is the whole filter.
  const [source, setSource] = useState<"ALL" | "GOOGLE">("ALL");
  /**
   * Opening values for a contact chosen out of Google.
   *
   * Feeds the EXISTING form rather than a Google-specific one, so validation, the company and
   * status selectors, and the save path are all the ones a hand-typed contact uses. Cleared
   * when that form closes, so the next plain "Add New Contact" opens empty.
   */
  const [googlePrefill, setGooglePrefill] = useState<ContactFormPrefill | null>(null);
  /** True while a review is in flight, so closing the form reopens the picker behind it. */
  const [resumeGoogleImport, setResumeGoogleImport] = useState(false);

  /**
   * Reviewing ONE Google contact in the existing form.
   *
   * The import dialog is HIDDEN, not closed: it keeps its fetched list, search and ticks, so
   * cancelling the form returns to the picker where it was. Closing it outright would make a
   * cancelled review cost a whole fresh Google authorization — for a misclick.
   */
  const handleGoogleReview = (candidate: GoogleContactCandidate) => {
    setGooglePrefill(toContactFormPrefill(candidate));
    setGoogleImportOpen(false);
    setResumeGoogleImport(true);
    setNewContactModal(true);
  };

  /** Leaving the contact form: back to the picker if that is where we came from. */
  const handleContactFormClose = () => {
    setNewContactModal(false);
    setGooglePrefill(null);
    if (resumeGoogleImport) {
      setResumeGoogleImport(false);
      setGoogleImportOpen(true);
    }
  };

  /**
   * Branch names for the Branch column — a short reference list (the organization's own
   * branches), loaded once. Only labels cells, so a failure must not blank the page. The
   * company names come with each row from the server.
   */
  useEffect(() => {
    getAllClientBranches()
      .then((branchesData) => setAllBranches(branchesData?.data?.leadBranches || []))
      .catch((e) => console.error("Error loading branches:", e));
  }, []);

  const branchMap = useMemo(() => {
    const map = new Map();
    allBranches.forEach((b: any) => map.set(b.id, b.name));
    return map;
  }, [allBranches]);

  // A cell lookup, not a list scan per cell — and a column-memo dependency, so the names
  // fill in once the employee list arrives instead of staying "N/A" from a stale closure.
  const employeeNameMap = useMemo(
    () => new Map<string, string>((allEmployees || []).map((e: any) => [e.employeeId, e.employeeName])),
    [allEmployees],
  );

  // ── Drill-down curated columns ────────────────────────────────────────────────
  // When drilled by contact role (contactByRolesId set), show lean columns.
  // Context: the role itself is shown since that's what was drilled.
  const isDrillDown = !!contactByRolesId;
  const hideNewContactButton = isDrillDown;
  const canWrite = canSection("crm.contacts", "write");
  const drillContextKey: string | null = isDrillDown ? "roleInCompany" : null;

  const drillVisibleKeys = useMemo(
    () =>
      new Set<string>([
        // Lean base: profile, name, company, phone, email
        "profile",
        "fullName",
        "companyName",
        "phone",
        "email",
        ...(drillContextKey ? [drillContextKey] : []),
      ]),
    [drillContextKey],
  );

  // Separate pref bucket so the drill keeps its own lean defaults.
  const drillTableName = `ContactDrill_${drillContextKey ?? "base"}`;

  /**
   * The server filters, sorts and pages (CONTACT_LIST_SPEC on the backend). The date window,
   * role, gender and Google switch each used to be a predicate over all ~6k contacts here.
   */
  // Primitives, so a re-reported but unchanged sort keeps the params' identity (no refetch).
  const sortBy = sorting[0]?.id;
  const sortDesc = sorting[0]?.desc;
  const listParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (sortBy) {
      params.sortBy = sortBy;
      params.sortOrder = sortDesc ? "desc" : "asc";
    }
    if (search) params.search = search;
    if (startDate) params.createdFrom = dayjs(startDate).startOf("day").toISOString();
    if (endDate) params.createdTo = dayjs(endDate).endOf("day").toISOString();
    if (contactByRolesId) params.contactRoleId = contactByRolesId;
    if (gender) params.gender = gender;
    if (source === "GOOGLE") params.source = "GOOGLE";
    return params;
  }, [sortBy, sortDesc, search, startDate, endDate, contactByRolesId, gender, source]);

  const fetchPage = useCallback(
    async (page: number, pageSize: number, summary = false) => {
      const res = await getAllClientContacts({ ...listParams, page, pageSize, ...(summary && { summary: 1 }) });
      const rows = res?.data?.contacts || [];
      if (summary && typeof res?.data?.googleCount === "number") {
        setGoogleCount(res.data.googleCount);
        googleCountKnownRef.current = true;
      }
      return { data: rows, totalRecords: res?.data?.total ?? rows.length };
    },
    [listParams],
  );

  // The Google count is tenant-wide and filter-independent: asked for with the first page, and
  // again only after a contact changes — not on every page turn or filter.
  const googleCountKnownRef = useRef(false);
  const fetchTablePage = useCallback(
    (page: number, pageSize: number) => fetchPage(page, pageSize, !googleCountKnownRef.current),
    [fetchPage],
  );

  const {
    data: contacts,
    pagination,
    setPagination,
    totalRecords,
    isLoading,
    refetch,
  } = useServerPagination<any>({
    fetchFunction: fetchTablePage,
    initialPageSize: 50,
    // A new filter, search or sort starts again from page 1.
    resetKey: JSON.stringify(listParams),
  });

  /** Export: every contact matching the current filters, not just this page. */
  const fetchAllRows = useCallback(
    () => fetchAllPages(async (page, pageSize) => {
      const { data, totalRecords: total } = await fetchPage(page, pageSize);
      return { rows: data, total };
    }),
    [fetchPage],
  );

  useEventBus("clientContactUpdated", () => {
    googleCountKnownRef.current = false;
    refetch();
  });

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
    () => {
      const columnsList: MRT_ColumnDef<any, any>[] = [
        {
          accessorKey: "profile",
          header: "Profile",
          enableSorting: false,
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
        Cell: ({ row }) => {
          const { id } = row.original;
          // The company in brackets next to the name, as in the Company Name column.
          const companyName = companyLabel(row.original);

          return (
            <button
              className="btn btn-link p-0 text-start text-decoration-none"
              style={{
                color: "inherit",
                fontWeight: "600",
                fontSize: "14px",
              }}
              onClick={() => {
                navigate(`/contacts/${id}`);
              }}
            >
              {row.original.fullName || "NA"}
              {companyName ? (
                <span style={{ color: "#9CA3AF", fontWeight: 500 }}>
                  {" "}
                  ({companyName})
                </span>
              ) : null}
            </button>
          );
        },
      },
      {
        accessorKey: "companyName",
        header: "Company Name",
        accessorFn: (row: any) => companyLabel(row) || "NA",
        Cell: ({ cell }) => cell.getValue<string>(),
      },
      {
        accessorKey: "branch",
        header: "Branch",
        enableSorting: false,
        accessorFn: (row: any) => branchMap.get(row.branch) || "NA",
        Cell: ({ cell }) => cell.getValue<string>(),
      },
      {
        accessorKey: "roleInCompany",
        header: "Role in Company",
        Cell: ({ cell }) => cell.getValue<string>() || "NA",
      },
      {
        accessorKey: "services",
        header: "Sub-services",
        enableSorting: false,
        // Flatten the serviceMappings relation into a plain comma-separated string so the
        // "Search in All Columns" global filter can match on it. (These Service rows are
        // the new "Sub-services" after the 4-level → 3-level flatten.)
        accessorFn: (row: any) =>
          (row.serviceMappings || [])
            .map((m: any) => m?.service?.name)
            .filter(Boolean)
            .join(", "),
        Cell: ({ cell }) => cell.getValue<string>() || "NA",
      },
      {
        accessorKey: "email",
        header: "Email",
        Cell: ({ cell }) => cell.getValue<string>() || "NA",
      },
      {
        accessorKey: "phone",
        header: "Phone",
        Cell: ({ cell }) => cell.getValue<string>() || "NA",
      },
      {
        accessorKey: "phone2",
        header: "Alternate Phone",
        Cell: ({ cell }) => cell.getValue<string>() || "NA",
      },
      {
        accessorKey: "gender",
        header: "Gender",
        Cell: ({ cell }) => cell.getValue<string>() || "NA",
      },
      {
        accessorKey: "dateOfBirth",
        header: "Date of Birth",
        Cell: ({ cell }) => {
          const date = cell.getValue() as string;
          return date ? new Date(date).toLocaleDateString() : "NA";
        },
      },
      {
        accessorKey: "address",
        header: "Address",
        Cell: ({ row }) => {
          const { address, city, state, country, zipCode } = row.original;
          const parts = [address, city, state, country, zipCode].filter(
            Boolean,
          );
          return parts.length ? parts.join(", ") : "NA";
        },
      },
      {
        accessorKey: "note",
        header: "Note",
        Cell: ({ cell }) => cell.getValue<string>() || "NA",
      },
      {
        accessorKey: "createdAt",
        header: "Created Date",
        meta: { defaultVisible: false },
        Cell: ({ cell }: any) =>
          cell.getValue() ? dayjs(cell.getValue()).format("DD-MM-YYYY") : "N/A",
      },
      {
        accessorKey: "createdById",
        header: "Created By",
        meta: { defaultVisible: false },
        Cell: ({ row }: any) => employeeNameMap.get(row.original.createdById) || "N/A",
      },
      {
        accessorKey: "updatedAt",
        header: "Last Edited Date",
        meta: { defaultVisible: false },
        Cell: ({ cell }: any) =>
          cell.getValue() ? dayjs(cell.getValue()).format("DD-MM-YYYY") : "N/A",
      },
      {
        accessorKey: "updatedById",
        header: "Last Edited By",
        meta: { defaultVisible: false },
        Cell: ({ row }: any) => employeeNameMap.get(row.original.updatedById) || "N/A",
      },
      {
        accessorKey: "actions",
        header: "Actions",
        Cell: ({ row }) => {
          const handleWhatsAppShare = () => {
            const contact = row.original;
            const companyName = companyLabel(contact) || "Unknown Company";
            const branchName = branchMap.get(contact.branch) || "Unknown Branch";

            // Format address
            const { address, city, state, country, zipCode } = contact;
            const fullAddress = [address, city, state, country, zipCode]
              .filter(Boolean)
              .join(", ");

            // Create message with contact details
            const message = `Contact Information:
📋 Name: ${contact.fullName || "N/A"}
🏢 Company: ${companyName}
🏪 Branch: ${branchName}
💼 Role: ${contact.roleInCompany || "N/A"}
📧 Email: ${contact.email || "N/A"}
📞 Phone: ${contact.phone || "N/A"}
${contact.phone2 ? `📱 Alternate Phone: ${contact.phone2}` : ""}
🎂 Date of Birth: ${contact.dateOfBirth ? new Date(contact.dateOfBirth).toLocaleDateString() : "N/A"}
📍 Address: ${fullAddress || "N/A"}
${contact.note ? `📝 Note: ${contact.note}` : ""}`;

            // Create WhatsApp URL
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

            // Open WhatsApp
            window.open(whatsappUrl, "_blank");
          };

          return (
            <div className="d-flex align-items-center gap-2">
              {canWrite && (
              <button
                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                onClick={() => handleEditClick(row.original.id)}
                title="Edit Contact"
              >
                <KTIcon iconName="pencil" className="fs-3" />
              </button>
              )}
              <button
                className="btn btn-icon btn-bg-light btn-active-color-success btn-sm"
                onClick={handleWhatsAppShare}
                title="Share via WhatsApp"
              >
                <i className="fab fa-whatsapp fs-3 text-success"></i>
              </button>
              {canWrite && (
              <button
                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                onClick={() => handleDelete(row.original)}
                title="Delete Contact"
              >
                <KTIcon iconName="trash" className="fs-3" />
              </button>
              )}
            </div>
          );
        },
        },
      ];

      // Full-page table: every column visible by default. Drill-down: only the
      // curated base + the role context column are visible by default.
      if (!isDrillDown) return columnsList;
      return columnsList.map((col: any) => ({
        ...col,
        meta: { ...(col.meta || {}), defaultVisible: drillVisibleKeys.has(col.accessorKey) },
      }));
    },
    [branchMap, employeeNameMap, employeeId, isDrillDown, drillVisibleKeys, canWrite],
  );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-0">
        <div
          className=""
          style={{ fontFamily: "Barlow", fontWeight: "600", fontSize: "24px" }}
        >
          Contacts
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* Shown once anything has been imported; a switch with an empty side is noise. */}
          {!isDrillDown && (googleCount > 0 || source === "GOOGLE") && (
            <SegmentedControl
              ariaLabel="Contact source"
              value={source}
              onChange={setSource}
              options={[
                { value: "ALL", label: "All", icon: <KTIcon iconName="people" className="fs-5" /> },
                { value: "GOOGLE", label: "Google imported", count: googleCount, icon: <KTIcon iconName="address-book" className="fs-5" /> },
              ]}
            />
          )}
          {/*
            * Gated on the SAME permission the backend enforces. This only hides the button —
            * the import endpoints check `crm.contacts.manage.all` themselves, so a user who
            * calls them directly is refused regardless of what the UI showed them.
            */}
          {!hideNewContactButton && can("crm.contacts.manage.all") && (
            <WtButton inverted onClick={() => setGoogleImportOpen(true)}>
              Import from Google
            </WtButton>
          )}
          {!hideNewContactButton && canWrite && (
            <button
              className="btn btn-primary"
              onClick={() => addNewContact(true)}
            >
              Add New Contact
            </button>
          )}
        </div>
      </div>
      <MaterialTable
        columns={columns}
        data={contacts}
        tableName={isDrillDown ? drillTableName : "Client-Contacts"}
        resource="CLIENT_CONTACTS"
        viewOwn={true}
        viewOthers={true}
        checkOwnWithOthers={true}
        employeeId={employeeId}
        defaultSorting={[{ id: "fullName", desc: false }]}
        // The server owns paging, sorting and search — all three together, or one of them
        // would act on the single page the browser holds while implying the whole list.
        manualPagination
        manualSorting
        manualFiltering
        rowCount={totalRecords}
        paginationState={pagination}
        onPaginationChange={setPagination}
        onSortingChange={setSorting}
        onSearchChange={setSearch}
        fetchAllRows={fetchAllRows}
        isLoading={isLoading}
        // Per-column filters and grouping would act on one page only.
        enableFilters={false}
        enableGrouping={false}
        // Only the rows in view are rendered, so 1000 rows per page costs what ~20 do.
        enableRowVirtualization
        muiTableProps={{

          muiTableBodyRowProps: ({ row }) => ({
            // sx: {
            //     cursor: 'pointer',
            //     backgroundColor: `${row.original?.status?.color}`,
            //     // borderRadius: '8px',
            //     // margin:"20px !important"
            // },
            sx: {
              cursor: "pointer",
              backgroundColor: `${row.original?.status?.color}30`,
              // The 20px gap between rows. It was `border-spacing` on the table, which a
              // virtualized table (CSS grid, not table layout) ignores; a transparent
              // border is measured into the row's height, so the virtualizer spaces for it.
              borderBottom: "20px solid transparent",
              backgroundClip: "padding-box",
              padding: "10px !important",

              "& .MuiTableCell-root": {
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: "14px",
                fontFamily: "Inter",
                fontWeight: "400",
                padding: "8px 16px !important",
                borderBottom: "2px solid white",
                borderTop: "2px solid white",
                // borderLeft:"5px solid white"
                // margin:"20px !important"
              },
              "& .MuiTableCell-root:first-of-type": {
                borderTopLeftRadius: "12px",
                borderBottomLeftRadius: "12px",
                // marginTop:"40px !important"
                borderLeft: "3px solid white",
              },
              "& .MuiTableCell-root:last-of-type": {
                borderTopRightRadius: "12px",
                borderBottomRightRadius: "12px",
                borderRight: "3px solid white",
              },
              "&:hover": {
                backgroundColor: `${row.original?.status?.color}99`,
                "& td": {
                  color: "black",
                },
              },
            },

            // onClick: () => {
            //     navigate(`/leads/${row.original.id}`, {
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
            // Edit is opened from a row, so the contact is on the page in hand.
            ? contacts.find(
                (contact: any) => contact.id === editingContactId,
              )
            : undefined
        }
      />

      <GoogleContactsImportDialog
        open={googleImportOpen}
        onClose={() => { setGoogleImportOpen(false); setResumeGoogleImport(false); }}
        onReview={handleGoogleReview}
        onImported={() => { eventBus.emit("clientContactUpdated"); }}
      />

      <ClientContactsForm
        show={newContactModal}
        onClose={handleContactFormClose}
        contactId={null}
        initialData={googlePrefill ?? undefined}
      />
    </div>
  );
};

export default ClientContactsMain;
