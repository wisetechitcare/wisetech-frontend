import {
  FilterSheet,
  FormSection,
  TRIO,
  WtField,
  type WtFieldOption,
} from "@app/modules/common/components/ui";
import { EMPTY_GIFT_RUN_FILTERS, type GiftRunFilters } from "./giftRunFilters";

interface GiftRunFilterSheetProps {
  open: boolean;
  value: GiftRunFilters;
  visibleCount: number;
  totalCount: number;
  statusOptions: WtFieldOption[];
  modeOptions: WtFieldOption[];
  genderOptions: WtFieldOption[];
  designationOptions: WtFieldOption[];
  areaOptions: WtFieldOption[];
  assigneeOptions: WtFieldOption[];
  /** The run's People Groups; "Individual" is added here. */
  groupOptions: WtFieldOption[];
  onClose: () => void;
  onApply: (filters: GiftRunFilters) => void;
}

export default function GiftRunFilterSheet({
  open,
  value,
  visibleCount,
  totalCount,
  statusOptions,
  modeOptions,
  genderOptions,
  designationOptions,
  areaOptions,
  assigneeOptions,
  groupOptions,
  onClose,
  onApply,
}: GiftRunFilterSheetProps) {
  return (
    <FilterSheet
      open={open}
      value={value}
      empty={EMPTY_GIFT_RUN_FILTERS}
      title="Filter Gift Run recipients"
      description={`${visibleCount.toLocaleString()} of ${totalCount.toLocaleString()} recipients currently shown`}
      onClose={onClose}
      onApply={onApply}
    >
      {(draft, set) => (
        <>
          <FormSection
            tone={TRIO.green}
            icon="delivery"
            title="Delivery"
            desc="Narrow the list by progress and handover method."
          >
            <WtField
              label="Delivery status"
              value={draft.status}
              onChange={(next) => set("status", next)}
              options={statusOptions}
              fullWidth
            />
            <WtField
              label="Delivery mode"
              value={draft.mode}
              onChange={(next) => set("mode", next)}
              options={modeOptions}
              fullWidth
            />
          </FormSection>

          <FormSection
            tone={TRIO.cyan}
            icon="people"
            title="Recipient"
            desc="Filter by the person’s source and profile details."
          >
            <WtField
              label="People From Groups"
              value={draft.via}
              onChange={(next) => set("via", next)}
              options={[
                { value: "ALL", label: "All" },
                ...groupOptions,
                { value: "INDIVIDUAL", label: "Individual (this run only)" },
              ]}
              fullWidth
            />
            <WtField
              label="Source"
              value={draft.source}
              onChange={(next) =>
                set("source", next as GiftRunFilters["source"])
              }
              options={[
                { value: "ALL", label: "All" },
                { value: "CONTACT", label: "Contacts" },
                { value: "EMPLOYEE", label: "Employees" },
              ]}
              fullWidth
            />
            <WtField
              label="Gender"
              value={draft.gender}
              onChange={(next) => set("gender", next)}
              options={genderOptions}
              fullWidth
            />
            <WtField
              label="Designation"
              value={draft.designation}
              onChange={(next) => set("designation", next)}
              options={designationOptions}
              searchable
              fullWidth
            />
            <WtField
              label="Area"
              value={draft.area}
              onChange={(next) => set("area", next)}
              options={areaOptions}
              searchable
              fullWidth
            />
          </FormSection>

          <FormSection
            tone={TRIO.purple}
            icon="profile-user"
            title="Assigned Person"
            desc="Find recipients assigned to a specific employee."
          >
            <WtField
              label="Assignee"
              value={draft.assignee}
              onChange={(next) => set("assignee", next)}
              options={assigneeOptions}
              searchable
              fullWidth
            />
          </FormSection>
        </>
      )}
    </FilterSheet>
  );
}
