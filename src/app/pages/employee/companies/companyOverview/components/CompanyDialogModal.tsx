import DrillDownDialog from "@app/modules/common/components/DrillDownDialog";
import ClientCompaniesMain from "../../companies/ClientCompaniesMain";
import ClientContactsMain from "../../contacts/ClientContactsMain";
import { Dayjs } from "dayjs";

export const CompanyDialogModal = ({
  open,
  onClose,
  statusId,
  companyTypeId,
  serviceId,
  subServiceId,
  locationId,
  contactByRolesId,
  startDate,
  endDate,
  isOthersView,
  top10Ids,
}: {
  open: boolean;
  onClose: () => void;
  statusId?: string;
  companyTypeId?: string;
  serviceId?: string;
  subServiceId?: string;
  locationId?: string;
  contactByRolesId?: string;
  startDate?: Dayjs;
  endDate?: Dayjs;
  isOthersView?: boolean;
  top10Ids?: string[];
}) => (
  <DrillDownDialog open={open} onClose={onClose} maxBodyHeight="70vh" bodyClassName="p-2">
    {contactByRolesId ? (
      <ClientContactsMain
        contactByRolesId={contactByRolesId}
        startDate={startDate}
        endDate={endDate}
      />
    ) : (
      <ClientCompaniesMain
        statusId={statusId || undefined}
        companyTypeId={companyTypeId || undefined}
        serviceId={serviceId || undefined}
        subServiceId={subServiceId || undefined}
        locationId={locationId || undefined}
        startDate={startDate}
        endDate={endDate}
        isOthersView={isOthersView}
        top10Ids={top10Ids}
      />
    )}
  </DrillDownDialog>
);

