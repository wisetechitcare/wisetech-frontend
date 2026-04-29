import MaterialTable from "@app/modules/common/components/MaterialTable";
import { useMemo, useState, useEffect, useCallback } from "react";
import { MRT_ColumnDef } from "material-react-table";
import {
  deletePublicHolidayById,
  fetchCompanyOverview,
  fetchHolidays,
  fetchPublicHolidays,
  updatePublicHolidayById,
  updateHolidayOptionsById,
  deleteHolidayById,
} from "@services/company";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
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
}

function RenameHoliday({ getNotification }: { getNotification?: any }) {
  const dispatch = useDispatch();

  // Redux selectors
  const isAdmin = useSelector(
    (state: RootState) => state.auth.currentUser.isAdmin
  );

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
  const [holidayNameForEditMode, setHolidayNameForEditMode] =
    useState<string>("");
  const [currentYear, setCurrentYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
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
      const companyId = companyOverview[0]?.id;

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
        setHolidayNameForEditMode(holiday.name);
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
      } = await fetchHolidays(companyOverview[0].id);
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

  // Handle save holiday name
  const handleSaveHolidayName = useCallback(async () => {
    if (!currentEditHolidayData || !holidayNameForEditMode.trim()) {
      errorConfirmation("Please enter a valid holiday name!");
      return;
    }

    try {
      setLoading(true);

      // Use the existing updateHolidayById endpoint with complete payload
      const updatePayload = {
        name: holidayNameForEditMode.trim(),
        isFixed: currentEditHolidayData.isFixed,
        isActive: currentEditHolidayData.isActive
      };

      const res = await updateHolidayOptionsById(
        currentEditHolidayData.id,
        updatePayload
      );

      if (res && !res.hasError) {
        // Update local state
        const updatedName = holidayNameForEditMode.trim();

        setHolidays((prevHolidays) =>
          prevHolidays.map((holiday) =>
            holiday.id === currentEditHolidayData.id
              ? { ...holiday, name: updatedName }
              : holiday
          )
        );

        setRawHolidaysData((prevRaw) =>
          prevRaw.map((holiday) =>
            holiday.id === currentEditHolidayData.id
              ? { ...holiday, name: updatedName }
              : holiday
          )
        );

        eventBus.emit("holidayUpdated", { id: currentEditHolidayData.id });
        successConfirmation("Holiday name updated successfully!");

        // Close modal and reset state
        setShowEditModal(false);
        setCurrentEditHolidayData(null);
        setHolidayNameForEditMode("");

        // Trigger refetch to get latest data
        setRefetch((prev) => !prev);
      } else {
        throw new Error(res?.message || "Failed to update holiday name");
      }
    } catch (error) {
      console.error("Error updating holiday name:", error);
      errorConfirmation("Failed to update holiday name!");
    } finally {
      setLoading(false);
    }
  }, [currentEditHolidayData, holidayNameForEditMode]);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setShowEditModal(false);
    setCurrentEditHolidayData(null);
    setHolidayNameForEditMode("");
  }, []);

  // Define table columns
  const columns = useMemo<MRT_ColumnDef<PublicHoliday>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Holiday Name",
        size: 200,
        Cell: ({ renderedCellValue }) => renderedCellValue,
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

  return (
    <>
      <div className="px-lg-0 px-1">
        {loading && holidays.length === 0 ? (
          <div className="text-center py-5">
            {/* <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading holidays...</p> */}
          </div>
        ) : (
          <>
            <h2>Rename Holidays</h2>
            <MaterialTable
              columns={columns}
              data={[...holidays].sort((a, b) => a.name.localeCompare(b.name))}
              tableName="Public Holidays List"
              employeeId={employeeIdCurrent}
            />
          </>
        )}
      </div>

      {/* Edit Holiday Name Modal */}
      <Modal
        show={showEditModal}
        onHide={handleCloseModal}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Holiday Name</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label htmlFor="holidayName" className="form-label fw-bold">
              Holiday Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              id="holidayName"
              value={holidayNameForEditMode}
              onChange={(e) => setHolidayNameForEditMode(e.target.value)}
              placeholder="Enter holiday name"
              maxLength={100}
              autoFocus
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-light"
            onClick={handleCloseModal}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveHolidayName}
            disabled={!holidayNameForEditMode.trim() || loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default RenameHoliday;
