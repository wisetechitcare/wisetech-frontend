import { useState, useMemo, useEffect } from "react";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { Button } from "@/ds/ui/button";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { MRT_ColumnDef } from "material-react-table";
import Loader from "@app/modules/common/utils/Loader";

interface Reminder {
  id: string;
  date: string;
  day: string;
  sender: string;
  message: string;
  reference: string;
  referenceType: string;
}

type ReminderTab = "received" | "sent";

const RemindersTable = () => {
  const [activeTab, setActiveTab] = useState<ReminderTab>("received");
  const [isLoading, setIsLoading] = useState(false);

  // Sample data - replace with actual API call
  const sampleData: Reminder[] = [
    {
      id: "1",
      date: "12/2/2024",
      day: "Fri",
      sender: "Amit Singh",
      message: "Check the staging error from Turisom client",
      reference: "Image",
      referenceType: "image",
    },
    {
      id: "2",
      date: "12/2/2024",
      day: "Fri",
      sender: "Amit Singh",
      message: 'Reminder for tasks "Wireframe for XYZ"',
      reference: "Tasks",
      referenceType: "tasks",
    },
    {
      id: "3",
      date: "12/2/2024",
      day: "Fri",
      sender: "Amit Singh",
      message: "Reminder for review",
      reference: "Review",
      referenceType: "review",
    },
    {
      id: "4",
      date: "12/2/2024",
      day: "Fri",
      sender: "Amit Singh",
      message: "Reminder for attendance request",
      reference: "Attendance Request",
      referenceType: "attendance",
    },
    {
      id: "5",
      date: "12/2/2024",
      day: "Fri",
      sender: "Amit Singh",
      message: "Reminder for reimbursement request.",
      reference: "Request.",
      referenceType: "reimbursement",
    },
  ];

  const handleCompleted = (reminderId: string) => {
    console.log("Completed reminder:", reminderId);
    // TODO: Implement API call to mark reminder as completed
  };

  const handleDismiss = (reminderId: string) => {
    console.log("Dismissed reminder:", reminderId);
    // TODO: Implement API call to dismiss reminder
  };

  const handleReferenceClick = (reference: string, referenceType: string) => {
    console.log("Reference clicked:", reference, referenceType);
    // TODO: Implement navigation based on reference type
  };

  const handleNewReminder = () => {
    console.log("New Reminder clicked");
    // TODO: Implement modal/form for creating new reminder
  };

  const handleViewAll = () => {
    console.log("View All clicked");
    // TODO: Implement navigation to full reminders page
  };

  // TODO: Fetch reminders from API
  // Uncomment and implement when API is ready
  // useEffect(() => {
  //   const fetchReminders = async () => {
  //     try {
  //       setIsLoading(true);
  //       const response = await getAllReminders(activeTab);
  //       setReminders(response.data);
  //     } catch (error) {
  //       console.error("Error fetching reminders:", error);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };
  //
  //   fetchReminders();
  // }, [activeTab]);

  const columns = useMemo<MRT_ColumnDef<Reminder>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        size: 100,
        muiTableHeadCellProps: {
          sx: {
            color: "#7a8597",
            fontSize: "14px",
            fontWeight: 400,
          },
        },
        muiTableBodyCellProps: {
          sx: {
            fontSize: "14px",
            color: "#000",
          },
        },
      },
      {
        accessorKey: "day",
        header: "Day",
        size: 50,
        muiTableHeadCellProps: {
          sx: {
            color: "#7a8597",
            fontSize: "14px",
            fontWeight: 400,
          },
        },
        muiTableBodyCellProps: {
          sx: {
            fontSize: "14px",
            color: "#000",
          },
        },
      },
      {
        accessorKey: "sender",
        header: "Sender",
        size: 120,
        muiTableHeadCellProps: {
          sx: {
            color: "#7a8597",
            fontSize: "14px",
            fontWeight: 400,
          },
        },
        muiTableBodyCellProps: {
          sx: {
            fontSize: "14px",
            color: "#000",
          },
        },
      },
      {
        accessorKey: "message",
        header: "Message",
        size: 350,
        muiTableHeadCellProps: {
          sx: {
            color: "#7a8597",
            fontSize: "14px",
            fontWeight: 400,
          },
        },
        muiTableBodyCellProps: {
          sx: {
            fontSize: "14px",
            color: "#000",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "350px",
          },
        },
      },
      {
        accessorKey: "reference",
        header: "Reference",
        size: 150,
        muiTableHeadCellProps: {
          sx: {
            color: "#7a8597",
            fontSize: "14px",
            fontWeight: 400,
          },
        },
        Cell: ({ row }) => (
          <Button
            variant="link"
            size="xs"
            className="h-auto p-0"
            onClick={() =>
              handleReferenceClick(row.original.reference, row.original.referenceType)
            }
          >
            {row.original.reference}
          </Button>
        ),
      },
      {
        accessorKey: "action",
        header: "Action",
        size: 150,
        muiTableHeadCellProps: {
          sx: {
            color: "#7a8597",
            fontSize: "14px",
            fontWeight: 400,
          },
        },
        Cell: ({ row }) => (
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCompleted(row.original.id)}
            >
              <CheckCircleOutlineIcon
                data-icon="inline-start"
                sx={{ fontSize: "20px", color: "#2d8e7c" }}
              />
              <span style={{ color: "#2d8e7c", fontSize: "14px" }}>
                Completed
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDismiss(row.original.id)}
            >
              <CancelOutlinedIcon
                data-icon="inline-start"
                sx={{ fontSize: "20px", color: "#b22e2e" }}
              />
              <span style={{ color: "#b22e2e", fontSize: "14px" }}>
                Dismiss
              </span>
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "24px",
          padding: "16px 20px",
          boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
          minHeight: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader />
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "24px",
        padding: "16px 20px",
        boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header Section */}
      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 600,
              margin: 0,
              fontFamily: "Barlow, sans-serif",
            }}
          >
            Reminders
          </h2>
          <div style={{ display: "flex", gap: "12px" }}>
            {/* No destination exists yet (handleViewAll is a stub), so this stays a button. */}
            <Button variant="outline" onClick={handleViewAll}>
              View all
            </Button>
            <Button onClick={handleNewReminder}>
              New Reminder
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px" }} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "received"}
            onClick={() => setActiveTab("received")}
            style={{
              padding: "7px 12px",
              borderRadius: "323px",
              border:
                activeTab === "received"
                  ? "2px solid #1E3A8A"
                  : "1px solid #a0b4d2",
              backgroundColor: "white",
              fontSize: "14px",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              color: "#000",
            }}
          >
            Received
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "sent"}
            onClick={() => setActiveTab("sent")}
            style={{
              padding: "7px 12px",
              borderRadius: "323px",
              border:
                activeTab === "sent"
                  ? "2px solid #1E3A8A"
                  : "1px solid #a0b4d2",
              backgroundColor: "white",
              fontSize: "14px",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              color: "#000",
            }}
          >
            Sent
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          border: "1px solid #eeeeee",
          borderRadius: "12px",
          padding: "12px",
        }}
      >
        <MaterialTable
          columns={columns}
          data={sampleData}
          tableName="Reminders"
          isLoading={isLoading}
          hideFilters={true}
          hideExportCenter={true}
          hidePagination={false}
          enableSorting={false}
          enableColumnActions={false}
          enableFilters={false}
          enableGrouping={false}
          enableColumnDragging={false}
          enableColumnResizing={false}
          enableColumnPinning={false}
          enableExpandAll={false}
          enableHiding={false}
          enableFullScreenToggle={false}
          muiTableProps={{
            sx: {
              "& .MuiTableHead-root": {
                "& .MuiTableRow-root": {
                  "& .MuiTableCell-root": {
                    backgroundColor: "transparent",
                    borderBottom: "none",
                  },
                },
              },
              "& .MuiTableBody-root": {
                "& .MuiTableRow-root": {
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.02)",
                  },
                  "& .MuiTableCell-root": {
                    borderBottom: "none",
                    padding: "12px",
                  },
                },
              },
            },
          }}
          muiTablePaperStyle={{
            sx: {
              boxShadow: "none",
              border: "none",
            },
          }}
        />
      </div>
    </div>
  );
};

export default RemindersTable;
