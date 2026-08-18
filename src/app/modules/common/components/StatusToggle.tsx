import { FC, useMemo } from "react";
import { SegmentedControl } from "@app/modules/common/components/ui";

type StatusType = "all" | "active" | "inactive";

interface StatusCounts {
  all: number;
  active: number;
  inactive: number;
}

interface StatusToggleProps {
  selectedStatus: StatusType;
  onStatusChange: (status: StatusType) => void;
  counts?: StatusCounts;
}

/**
 * All / Active / Inactive.
 *
 * Built on the kit's `SegmentedControl`, so it is the same control the period
 * selector uses (Monthly · Yearly · All Time · Custom) rather than a second look
 * for the same job. It was a row of large outlined `ToggleButton` pills — 36px
 * tall with a 2px border and a 20px radius — which sat above a toolbar of compact
 * filter chips and read as a heavier, unrelated control.
 *
 * The mobile branch is gone with it. A three-option exclusive choice is not worth
 * a full-width `Select` on a phone: the segmented control already fits, and
 * `fullWidth` lets the three share the row rather than collapsing into a dropdown
 * that costs a tap to see what is even selected.
 */
const StatusToggle: FC<StatusToggleProps> = ({ selectedStatus, onStatusChange, counts }) => {
  const options = useMemo(
    () => ([
      { value: "all" as const, label: "All", count: counts?.all },
      { value: "active" as const, label: "Active", count: counts?.active },
      { value: "inactive" as const, label: "Inactive", count: counts?.inactive },
    ]),
    [counts]
  );

  return (
    <SegmentedControl<StatusType>
      options={options}
      value={selectedStatus}
      onChange={onStatusChange}
      ariaLabel="Employee status filter"
      // Shares the row on a phone instead of overflowing it; on desktop the
      // control stays its natural width.
      sx={{ width: { xs: "100%", sm: "fit-content" } }}
    />
  );
};

export default StatusToggle;
