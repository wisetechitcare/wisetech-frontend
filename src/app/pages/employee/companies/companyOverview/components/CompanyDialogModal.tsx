import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ClientCompaniesMain from "../../companies/ClientCompaniesMain";
import ClientContactsMain from "../../contacts/ClientContactsMain";
import { Dayjs } from "dayjs";

export const CompanyDialogModal = ({
  open,
  onClose,
  statusId,
  companyTypeId,
  locationId,
  contactByRolesId,
  startDate,
  endDate,
}: {
  open: boolean;
  onClose: () => void;
  statusId?: string;
  companyTypeId?: string;
  locationId?: string;
  contactByRolesId?: string;
  startDate?: Dayjs;
  endDate?: Dayjs;
}) => (
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
      <div className="flex flex-col w-full max-w-4xl mx-auto p-2 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
        <div className="overflow-y-auto max-h-[70vh]">
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
              locationId={locationId || undefined}
              startDate={startDate}
              endDate={endDate}
            />
          )}
        </div>
      </div>
    </DialogContent>
  </Dialog>
);   