import { resolveActiveOrgId } from '@utils/activeOrg';
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { useMemo, useState, useEffect, useCallback } from "react";
import { MRT_ColumnDef } from "material-react-table";
import {
  deletePublicHolidayById,
  fetchCompanyOverview,
  fetchHolidays,
  fetchPublicHolidays,
  updatePublicHolidayById,
  deleteHolidayById,
} from "@services/company";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { usePermission } from "@hooks/usePermission";
import { KTIcon } from "@metronic/helpers";
import {
  errorConfirmation,
  successConfirmation,
  deleteConfirmation,
} from "@utils/modal";
import { Modal } from "react-bootstrap";
import { IPublicHolidayUpdate } from "@models/company";
import { hasPermission } from "@utils/authAbac";
import {
  permissionConstToUseWithHasPermission,
  resourceNameMapWithCamelCase,
} from "@constants/statistics";
import eventBus from "../../../../../utils/EventBus";
import { ConfigSectionCard, KEYFRAMES } from "@app/modules/configuration";
import Holiday from "@pages/company/Holiday";
import { T } from "@app/modules/common/components/ui/tokens";

// Interface for the transformed holiday data displayed in the table
interface PublicHoliday {
  id: string;
  date: string;
  day: string;
  name: string;
  type: string;
}

// Interface for holiday dropdown options
interface HolidayOption {
  label: string;
  value: string;
}

// Interface for raw holiday data from API
interface RawHolidayData {
  id: string;
  name: string;
  isFixed: boolean;
  isActive: boolean;
  companyId: string;
  colorCode?: string;
}

function RenameHoliday({ getNotification }: { getNotification?: any }) {
  const dispatch = useDispatch();

  // Redux selectors
  const isAdmin = usePermission('settings.manage.all');

  const employeeIdCurrent = useSelector((state: RootState) => state.employee?.currentEmployee?.id);

  // State management
  const [refetch, setRefetch] = useState<boolean>(false);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [rawHolidaysData, setRawHolidaysData] = useState<RawHolidayData[]>([]);
  const [publicHolidaysData, setPublicHolidaysData] = useState<
    IPublicHolidayUpdate[]
  >([]);
  const [currentEditHolidayData, setCurrentEditHolidayData] =
    useState<RawHolidayData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentYear, setCurrentYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [holidaysList, setHolidaysList] = useState<HolidayOption[]>([]);

  const country = "India";

  // Transform raw holiday data to display format
  const transformHolidayData = useCallback(
    (
      rawHolidays: RawHolidayData[],
      publicHolidays: IPublicHolidayUpdate[] = []
    ): PublicHoliday[] => {
      return rawHolidays.map((holiday) => {
        // Try to find matching public holiday data for additional info
        const publicHoliday = publicHolidays.find(
          (ph) => ph.holidayId === holiday.id
        );

        return {
          id: holiday.id,
          name: holiday.name,
          date: publicHoliday?.date
            ? dayjs(publicHoliday.date).format("YYYY-MM-DD")
            : "",
          day: publicHoliday?.date
            ? dayjs(publicHoliday.date).format("dddd")
            : "",
          type: holiday.isFixed ? "Fixed" : "Variable",
        };
      });
    },
    []
  );

  // Fetch all holidays data
  const fetchAllHolidays = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch company overview to get company ID
      const {
        data: { companyOverview },
      } = await fetchCompanyOverview();
      const companyId = (resolveActiveOrgId(companyOverview) ?? '');

      if (!companyId) {
        throw new Error("Company ID not found");
      }

      // Fetch holidays list
      const {
        data: { holidays: rawHolidays },
      } = await fetchHolidays(companyId);
      setRawHolidaysData(rawHolidays);

      // Fetch public holidays for additional data (dates, etc.)
      try {
        const publicHolidaysResponse = await fetchPublicHolidays(
          currentYear,
          country
        );
        const publicHolidays =
          publicHolidaysResponse?.data?.publicHolidays || [];
        setPublicHolidaysData(publicHolidays);

        // Transform and set display data
        const transformedHolidays = transformHolidayData(
          rawHolidays,
          publicHolidays
        );
        setHolidays(transformedHolidays);
      } catch (publicHolidayError) {
        console.warn(
          "Failed to fetch public holidays, using holidays data only:",
          publicHolidayError
        );

        // Transform with just basic holiday data
        const transformedHolidays = transformHolidayData(rawHolidays);
        setHolidays(transformedHolidays);
      }
    } catch (error) {
      console.error("Error fetching holidays:", error);
      errorConfirmation("Failed to fetch holidays data!");
    } finally {
      setLoading(false);
    }
  }, [currentYear, country, transformHolidayData]);

  // Handle edit action
  const handleEdit = useCallback(
    (row: PublicHoliday) => {
      setShowEditModal(true);
      const { id } = row;
      const holiday = rawHolidaysData.find((holiday) => holiday.id === id);

      if (holiday) {
        setCurrentEditHolidayData(holiday);
      }
    },
    [rawHolidaysData]
  );

  // Handle delete action
  const handleDelete = useCallback(async (row: PublicHoliday) => {
    try {
      const confirmed = await deleteConfirmation(
        "Are you sure you want to delete this holiday?"
      );

      if (confirmed) {
        setLoading(true);
        const res = await deleteHolidayById(row.id);

        if (!res?.hasError) {
          // Update local state by removing the deleted holiday
          setHolidays((prevHolidays) =>
            prevHolidays.filter((h) => h.id !== row.id)
          );
          setRawHolidaysData((prevRaw) =>
            prevRaw.filter((h) => h.id !== row.id)
          );

        //   successConfirmation("Holiday deleted successfully!");
          eventBus.emit("holidayDeleted", { id: row.id });
        } else {
          throw new Error(res?.message || "Failed to delete holiday");
        }
      }
    } catch (error) {
      console.error("Error deleting holiday:", error);
      errorConfirmation("Failed to delete public holiday!");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh holiday list for dropdown
  const refreshHolidayList = useCallback(async () => {
    try {
      const {
        data: { companyOverview },
      } = await fetchCompanyOverview();
      const {
        data: { holidays },
      } = await fetchHolidays((resolveActiveOrgId(companyOverview) ?? ''));
      const transformedRes = holidays.map((holiday: RawHolidayData) => ({
        label: holiday.name,
        value: holiday.id,
      }));
      setHolidaysList(transformedRes);
    } catch (error) {
      console.error("Failed to refresh holiday list:", error);
    }
  }, []);

  // Fetch holidays on component mount and when dependencies change
  useEffect(() => {
    fetchAllHolidays();
  }, [fetchAllHolidays, refetch]);

  // Refresh holiday list on mount
  useEffect(() => {
    refreshHolidayList();
  }, [refreshHolidayList]);

  // Shared post-save refresh for both Add and Edit: refetches the table + the
  // holiday-name dropdown list. Edit additionally emits "holidayUpdated" so
  // other holiday views (e.g. PublicHolidayListTwo's own listener) pick up the
  // rename/re-type/re-color immediately instead of showing stale data.
  const handleAddSaved = useCallback(() => {
    refreshHolidayList();
    setRefetch((prev) => !prev);
  }, [refreshHolidayList]);

  const handleEditSaved = useCallback(() => {
    if (currentEditHolidayData) {
      eventBus.emit("holidayUpdated", { id: currentEditHolidayData.id });
    }
    refreshHolidayList();
    setRefetch((prev) => !prev);
  }, [currentEditHolidayData, refreshHolidayList]);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setShowEditModal(false);
    setCurrentEditHolidayData(null);
  }, []);

  // Define table columns
  const columns = useMemo<MRT_ColumnDef<PublicHoliday>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Holiday Name",
        size: 250,
        Cell: ({ renderedCellValue }) => (
          <span style={{ fontWeight: 600, color: '#1B2230' }}>
            {renderedCellValue}
          </span>
        ),
      },
      {
        accessorKey: "date",
        header: "Date",
        size: 150,
        Cell: ({ renderedCellValue }) => renderedCellValue || "-",
      },
      {
        accessorKey: "day",
        header: "Day",
        size: 150,
        Cell: ({ renderedCellValue }) => renderedCellValue || "-",
      },
      {
        accessorKey: "type",
        header: "Type",
        size: 150,
        Cell: ({ renderedCellValue }) => {
          const isFixed = renderedCellValue === 'Fixed';
          return (
            <span style={{
              backgroundColor: isFixed ? '#F0F4FF' : '#FFF3CD',
              color: isFixed ? '#1E3A8A' : '#856404',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
            }}>
              {renderedCellValue}
            </span>
          );
        }
      },
      ...(isAdmin
        ? [
            {
              accessorKey: "actions" as keyof PublicHoliday,
              header: "Actions",
              size: 120,
              enableSorting: false,
              Cell: ({ row }: { row: { original: PublicHoliday } }) => {
                const allowEdit = hasPermission(
                  resourceNameMapWithCamelCase.holiday,
                  permissionConstToUseWithHasPermission.editOthers
                );
                const allowDelete = hasPermission(
                  resourceNameMapWithCamelCase.holiday,
                  permissionConstToUseWithHasPermission.deleteOthers
                );

                if (!allowEdit && !allowDelete) {
                  return <span className="text-muted">Not Allowed</span>;
                }

                return (
                  <div>
                    {allowEdit && (
                      <button
                        className="btn btn-icon btn-active-color-primary btn-sm"
                        onClick={() => handleEdit(row.original)}
                        title="Edit Holiday"
                        disabled={loading}
                      >
                        <KTIcon iconName="pencil" className="fs-4" />
                      </button>
                    )}
                    {allowDelete && (
                      <button
                        className="btn btn-icon btn-active-color-danger btn-sm"
                        onClick={() => handleDelete(row.original)}
                        title="Delete Holiday"
                        disabled={loading}
                      >
                        <KTIcon iconName="trash" className="fs-4" />
                      </button>
                    )}
                  </div>
                );
              },
            } as MRT_ColumnDef<PublicHoliday>,
          ]
        : []),
    ],
    [isAdmin, loading, handleEdit, handleDelete]
  );

  // Check if user has permission to view holidays
  const canViewHolidays = hasPermission(
    resourceNameMapWithCamelCase.holiday,
    permissionConstToUseWithHasPermission.readOthers
  );

  if (!canViewHolidays) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">
          You don't have permission to view holidays.
        </p>
      </div>
    );
  }

const PREMIUM_TABLE_CSS = `
  .prem-table-container {
    background: #ffffff;
    border: 1px solid #E6E9EE;
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(27, 34, 48, 0.03);
    overflow: hidden;
    margin-bottom: 24px;
  }
  .prem-table-header {
    padding: 24px;
    border-bottom: 1px solid #E6E9EE;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
  }
  .prem-icon-box {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F4F6FB;
    color: #1E3A8A;
    font-size: 22px;
    flex-shrink: 0;
  }
  .prem-badge {
    background: #F4F6FB;
    color: #1E3A8A;
    border-radius: 20px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
    margin-left: 8px;
    display: inline-block;
    vertical-align: middle;
  }
  
  /* Overrides for MaterialTable to look more premium */
  .prem-table-container .MuiPaper-root {
    box-shadow: none !important;
    border-radius: 0 !important;
  }
  .prem-table-container .MuiTableHead-root .MuiTableRow-root .MuiTableCell-head {
    background-color: #F8FAFC !important;
    color: #5A6573 !important;
    font-weight: 700 !important;
    font-size: 12px !important;
    letter-spacing: 0.05em !important;
    border-bottom: 1px solid #E6E9EE !important;
    text-transform: uppercase;
  }
  .prem-table-container .MuiTableBody-root .MuiTableRow-root:hover {
    background-color: #F8FAFC !important;
  }
  .prem-table-container .MuiTableCell-body {
    border-bottom: 1px solid #F1F3F5 !important;
    color: #1B2230 !important;
    font-size: 14px !important;
  }
  
  /* Overrides for Add Holiday Modal */
  .prem-holiday-modal .btn-primary, 
  .prem-holiday-modal button[type="submit"] {
    background: linear-gradient(180deg, #1E3A8A 0%, #152960 100%) !important;
    border: none !important;
    box-shadow: 0 4px 12px rgba(30, 58, 138, 0.4) !important;
    color: #fff !important;
    font-weight: 600 !important;
    opacity: 1 !important;
  }
  .prem-holiday-modal .btn-primary:disabled,
  .prem-holiday-modal button[type="submit"]:disabled {
    opacity: 0.6 !important;
    box-shadow: none !important;
  }
  
  /* Toggle buttons in the modal */
  .prem-holiday-modal .btn-check:checked + .btn,
  .prem-holiday-modal .btn.active,
  .prem-holiday-modal .bg-primary,
  .prem-holiday-modal [class*="bg-[#"] {
    background-color: #1E3A8A !important;
    border-color: #1E3A8A !important;
    color: #fff !important;
  }
`;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <style>{PREMIUM_TABLE_CSS}</style>

      <div className="prem-table-container cfg-fade-in">
        <div className="prem-table-header">
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="prem-icon-box">
              <i className="bi bi-calendar-heart" />
            </div>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: '18px', color: '#1B2230', margin: '0 0 4px 0', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center' }}>
                Public Holidays
                <span className="prem-badge">{holidays.length}</span>
              </h2>
              <p style={{ fontSize: '13.5px', color: '#5A6573', margin: 0, fontWeight: 400 }}>
                Rename holidays as they appear on the company calendar
              </p>
            </div>
          </div>
          
          <div>
            {hasPermission(resourceNameMapWithCamelCase.holiday, permissionConstToUseWithHasPermission.create) && (
              <button
                type="button"
                className="btn btn-sm text-white fw-bold d-flex align-items-center gap-2 border-0"
                style={{
                  background: `linear-gradient(180deg, ${T.color.brand} 0%, ${T.color.brandHover} 100%)`,
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  boxShadow: `0 4px 12px ${T.color.brand}40`,
                }}
                onClick={() => setShowAddModal(true)}
              >
                <i className="bi bi-plus-lg" style={{ fontSize: 14 }} />
                Add Holiday
              </button>
            )}
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          {(loading && holidays.length === 0) && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.7)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="spinner-border text-primary" />
            </div>
          )}
          <MaterialTable
            columns={columns}
            data={[...holidays].sort((a, b) => a.name.localeCompare(b.name))}
            tableName="Public Holidays List"
            employeeId={employeeIdCurrent}
          />
        </div>
      </div>

      {/* Edit Holiday Modal — same name/type/status/color fields as Add Holiday
          (both render the shared <Holiday> form), just pre-filled and pointed at
          the update endpoint via isEditMode/editData. Previously this only exposed
          a bare name field, so renaming a holiday couldn't touch its type/status/
          color even though Add could set all of them from the start. */}
      <Modal
        show={showEditModal}
        onHide={handleCloseModal}
        centered
        backdrop="static"
        fullscreen="md-down"
        contentClassName="rounded-4 border-0 shadow-lg prem-holiday-modal"
      >
        <Modal.Header closeButton style={{ border: 'none', padding: '22px 24px 6px' }}>
          <div className="d-flex align-items-center gap-3">
            <div
              style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `linear-gradient(135deg, ${T.color.brand}1F, ${T.color.brand}0D)`,
                color: T.color.brand,
              }}
            >
              <KTIcon iconName="pencil" className="fs-3" />
            </div>
            <div>
              <Modal.Title style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px', margin: 0 }}>
                Edit Holiday
              </Modal.Title>
              <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 1 }}>Update this holiday's details</div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: '10px 24px 24px' }}>
          {currentEditHolidayData && (
            <Holiday
              isEditMode
              editData={{
                id: currentEditHolidayData.id,
                name: currentEditHolidayData.name,
                isFixed: currentEditHolidayData.isFixed,
                isActive: currentEditHolidayData.isActive,
                colorCode: currentEditHolidayData.colorCode ?? '',
              }}
              onCloseHolidayForm={handleCloseModal}
              refreshHolidayList={handleEditSaved}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* Add Holiday Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered backdrop="static" fullscreen="md-down" contentClassName="rounded-4 border-0 shadow-lg prem-holiday-modal">
        <Modal.Header closeButton style={{ border: 'none', padding: '22px 24px 6px' }}>
          <div className="d-flex align-items-center gap-3">
            <div
              style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `linear-gradient(135deg, ${T.color.brand}1F, ${T.color.brand}0D)`,
                color: T.color.brand,
              }}
            >
              <KTIcon iconName="plus" className="fs-3" />
            </div>
            <div>
              <Modal.Title style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px', margin: 0 }}>
                Add Holiday
              </Modal.Title>
              <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 1 }}>Add a new holiday to the master list</div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: '10px 24px 24px' }}>
          <Holiday
            onCloseHolidayForm={() => setShowAddModal(false)}
            refreshHolidayList={handleAddSaved}
          />
        </Modal.Body>
      </Modal>
    </>
  );
}

export default RenameHoliday;
