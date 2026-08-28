import { useNavigate, useParams } from "react-router-dom";
import { Box } from "@mui/material";
import { WtButton, AppIcon } from "@app/modules/common/components/ui";
import DocumentVaultView from "./DocumentVaultView";

/**
 * HR's view of ONE employee's documents, reached from the directory.
 *
 * Access is decided server-side by the caller's users.view scope, so this route can
 * be linked or typed directly without becoming a way around the directory's gate.
 */
const EmployeeDocumentsPage: React.FC = () => {
  const { employeeId = "" } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();

  return (
    <Box sx={{ maxWidth: 1600, mx: "auto", p: { xs: 1.5, sm: 2.5 } }}>
      <DocumentVaultView
        employeeId={employeeId}
        leading={
          <Box>
            <WtButton
              ghost
              size="small"
              startIcon={<AppIcon name="bi-arrow-left" aria-hidden />}
              onClick={() => navigate("/employee/documents")}
            >
              All Employees
            </WtButton>
          </Box>
        }
        emptyMessage="Nothing has been uploaded for this employee yet."
      />
    </Box>
  );
};

export default EmployeeDocumentsPage;
