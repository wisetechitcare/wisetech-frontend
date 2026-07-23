import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EntityTablePage from "@pages/employee/entity/EntityTablePage";
import dayjs from "dayjs";
import { useEffect } from "react";
import eventBus from "@utils/EventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { useEventBus } from "@hooks/useEventBus";

export const ChartDialogModal = ({
  open,
  onClose,
  title,
  statusId,
  serviceId,
  categoryId,
  referralId,
  sourceId,
  subCategoryId,
  companyTypeId,
  teamId,
  externalCompanyTypeId,
  externalCompanyId,
  externalContactId,
  referralCompanyTypeId,
  referralCompanyId,
  referralContactId,
  topLeadsId,
  locationId,
  locationCountryId,
  locationCountryName,
  locationStateId,
  locationStateName,
  locationCityId,
  locationCityName,
  locationLocalityId,
  locationLocalityName,
  monthlyStatusName,
  monthlyStatusId,
  startDate,
  endDate,
  receivedOnly,
  entityScope = "lead",
}: {
  open: boolean;
  onClose: () => void;
  /** Human label for the clicked slice, shown as the dialog heading (e.g. "Category · Mall"). */
  title?: string;

  statusId?: string;
  serviceId?: string;
  categoryId?: string;
  referralId?: string;
  sourceId?: string;
  subCategoryId?: string;
  companyTypeId?: string;
  /** Internal (execution) team id — Projects by Internal Team drill-down. */
  teamId?: string;
  /** External-team drill-downs (project_external_teams). */
  externalCompanyTypeId?: string;
  externalCompanyId?: string;
  externalContactId?: string;
  /** Client Analysis drill-downs (LeadReferral — referring company/contact). */
  referralCompanyTypeId?: string;
  referralCompanyId?: string;
  referralContactId?: string;
  topLeadsId?: string[];
  locationId?: string;
  /** Geographic Distribution drill-downs (country/state/city ids, or "__NA__"; locality has no master table so its "id" is the raw name). */
  locationCountryId?: string;
  locationCountryName?: string;
  locationStateId?: string;
  locationStateName?: string;
  locationCityId?: string;
  locationCityName?: string;
  locationLocalityId?: string;
  locationLocalityName?: string;
  monthlyStatusName?: string;
  monthlyStatusId?: string;
  startDate?: dayjs.Dayjs;
  endDate?: dayjs.Dayjs;
  // Project section drill-down: restrict the table to received/project leads.
  receivedOnly?: boolean;
  // Which entity the drill-down ids refer to. "project" makes status/service/category/
  // company-type match the project fields (execution.projectStatus, projectServiceId, …)
  // instead of the lead fields. Defaults to "lead" for the lead-overview drill-downs.
  entityScope?: "lead" | "project";
}) => {
  // Listen for the closeChartDialogModal event
  useEventBus(EVENT_KEYS.closeChartDialogModal, onClose);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          m: 0,
          p: 0,
          position: "relative",
        }}
      >
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent className="!p-0 !shadow-none">
        <div className="flex flex-col w-full max-w-4xl mx-auto p-0 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
          <div className="overflow-y-auto max-h-[50vh]">
            <EntityTablePage
              entityScope={entityScope}
              drillTitle={title || undefined}
              statusId={statusId || undefined}
              serviceId={serviceId || undefined}
              categoryId={categoryId || undefined}
              referralId={referralId || undefined}
              sourceId={sourceId || undefined}
              subCategoryId={subCategoryId || undefined}
              companyTypeId={companyTypeId || undefined}
              teamId={teamId || undefined}
              externalCompanyTypeId={externalCompanyTypeId || undefined}
              externalCompanyId={externalCompanyId || undefined}
              externalContactId={externalContactId || undefined}
              referralCompanyTypeId={referralCompanyTypeId || undefined}
              referralCompanyId={referralCompanyId || undefined}
              referralContactId={referralContactId || undefined}
              topLeadsId={topLeadsId || undefined}
              locationId={locationId || undefined}
              locationCountryId={locationCountryId || undefined}
              locationCountryName={locationCountryName || undefined}
              locationStateId={locationStateId || undefined}
              locationStateName={locationStateName || undefined}
              locationCityId={locationCityId || undefined}
              locationCityName={locationCityName || undefined}
              locationLocalityId={locationLocalityId || undefined}
              locationLocalityName={locationLocalityName || undefined}
              monthlyStatusName={monthlyStatusName || undefined}
              monthlyStatusId={monthlyStatusId || undefined}
              startDate={startDate || undefined}
              endDate={endDate || undefined}
              receivedOnly={receivedOnly || undefined}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};