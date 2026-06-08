import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ProjectsMainTable from "../../project/ProjectsMainTable";
import { Dayjs } from "dayjs";

export const ProjectDialogModal = ({
  open,
  onClose,
  statusId,
  serviceId,
  categoryId,
  referralId,
  sourceId,
  subCategoryId,
  companyTypeId,
  topLeadsId,
  locationId,
  monthlyStatusName,
  monthlyStatusId,
  teamId,
  startDate,
  endDate,
  monthlyCompanyTypeId,
  projectCompanyTypeName,
  projectCompanyTypeId,
}: {
  open: boolean;
  onClose: () => void;
  statusId?: string;
  serviceId?: string;
  categoryId?: string;
  referralId?: string;
  sourceId?: string;
  subCategoryId?: string;
  companyTypeId?: string;
  topLeadsId?: string[];
  locationId?: string;
  monthlyStatusName?: string;
  monthlyStatusId?: string;
  teamId?: string;
  startDate?: Dayjs;
  endDate?: Dayjs;
  monthlyCompanyTypeId?: string;
  projectCompanyTypeName?:string;
  projectCompanyTypeId?:string;
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="lg"
    fullWidth
    sx={{
      "& .MuiDialog-paper": {
        borderRadius: "12px",
        maxWidth: "1200px", 
        width: "90%", 
        height: "auto",
        maxHeight: "85vh", 
      },
    }}
  >
    <DialogTitle
      sx={{
        m: 0,
        p: 0,
        backgroundColor: "#f5f5f5",
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
      <div className="flex flex-col w-full mx-auto rounded-2xl ">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] p-3 bg-white rounded-xl">
          <ProjectsMainTable
            statusId={statusId || undefined}
            serviceId={serviceId || undefined}
            categoryId={categoryId || undefined}
            referralId={referralId || undefined}
            sourceId={sourceId || undefined}
            subCategoryId={subCategoryId || undefined}
            companyTypeId={companyTypeId || undefined}
            topLeadsId={topLeadsId || undefined}
            locationId={locationId || undefined}
            monthlyStatusName={monthlyStatusName || undefined}
            monthlyStatusId={monthlyStatusId || undefined}
            teamId={teamId || undefined}
            startDate={startDate || undefined}
            endDate={endDate || undefined}
            monthlyCompanyTypeId={monthlyCompanyTypeId || undefined}
            projectCompanyTypeName={projectCompanyTypeName || undefined}
            projectCompanyTypeId={projectCompanyTypeId || undefined}
          />
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
