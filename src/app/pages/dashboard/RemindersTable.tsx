import { useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/ds/ui/button";
import { DataTable, type ColumnDef } from "@/ds/patterns/data-table";
import Loader from "@app/modules/common/utils/Loader";
import { cn } from "@/ds/lib/utils";

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

const SAMPLE: Reminder[] = [
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

const RemindersTable = () => {
  const [activeTab, setActiveTab] = useState<ReminderTab>("received");
  const [isLoading] = useState(false);

  const handleCompleted = (reminderId: string) => {
    console.log("Completed reminder:", reminderId);
  };

  const handleDismiss = (reminderId: string) => {
    console.log("Dismissed reminder:", reminderId);
  };

  const handleReferenceClick = (reference: string, referenceType: string) => {
    console.log("Reference clicked:", reference, referenceType);
  };

  const columns = useMemo<ColumnDef<Reminder>[]>(
    () => [
      { accessorKey: "date", meta: { label: "Date", wrap: false }, header: "Date" },
      { accessorKey: "day", meta: { label: "Day", wrap: false }, header: "Day" },
      { accessorKey: "sender", meta: { label: "Sender" }, header: "Sender" },
      {
        accessorKey: "message",
        meta: { label: "Message" },
        header: "Message",
        cell: ({ getValue }) => (
          <span className="block max-w-xs truncate">{String(getValue() ?? "")}</span>
        ),
      },
      {
        accessorKey: "reference",
        meta: { label: "Reference" },
        header: "Reference",
        cell: ({ row }) => (
          <Button
            type="button"
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
        id: "action",
        meta: { label: "Action", export: false, pin: "end", wrap: false },
        enableSorting: false,
        enableHiding: false,
        header: "Action",
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => handleCompleted(row.original.id)}>
              <CheckCircle2 className="text-success-foreground" data-icon="inline-start" aria-hidden />
              Completed
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleDismiss(row.original.id)}>
              <XCircle className="text-destructive" data-icon="inline-start" aria-hidden />
              Dismiss
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-100 items-center justify-center rounded-3xl bg-card p-5 shadow-sm">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-3xl bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Reminders</h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => console.log("View All")}>
            View all
          </Button>
          <Button type="button" onClick={() => console.log("New Reminder")}>
            New Reminder
          </Button>
        </div>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Reminder folder">
        {(["received", "sent"] as const).map((tab) => (
          <Button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            size="sm"
            variant={activeTab === tab ? "default" : "outline"}
            className={cn(activeTab === tab && "pointer-events-none")}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "received" ? "Received" : "Sent"}
          </Button>
        ))}
      </div>

      <DataTable
        caption={`Reminders ${activeTab}`}
        columns={columns}
        data={SAMPLE}
        getRowId={(r) => r.id}
        stateKey={`dashboard.reminders.${activeTab}`}
        tools={false}
        groupableColumns={false}
        reorderableColumns={false}
        pinnableColumns={false}
      />
    </div>
  );
};

export default RemindersTable;
