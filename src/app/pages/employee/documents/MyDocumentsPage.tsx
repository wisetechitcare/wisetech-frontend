import { Box } from "@mui/material";
import { ListHeader } from "@app/modules/common/components/ui";
import DocumentVaultView from "./DocumentVaultView";

/**
 * The employee's OWN documents.
 *
 * The previous screen listed rows from `employee_documents` for whichever employee id
 * it happened to be holding, which is why an HR user saw a wall of paperwork that was
 * not theirs — the page had no notion of "mine", only of "an employee's". This asks
 * the server for `"me"`, so what comes back is resolved from the auth token and is
 * always and only this person's own file: their onboarding uploads, their identity
 * proofs, their certificates, their bank proof and the signature from their profile.
 */
const MyDocumentsPage: React.FC = () => (
  <Box sx={{ maxWidth: 1400, mx: "auto", p: { xs: 1.5, sm: 2.5 }, display: "flex", flexDirection: "column", gap: 2 }}>
    <ListHeader
      title="My Documents"
      subtitle="Everything the company holds on file for you."
    />
    {/* The identity block is redundant here — the viewer knows who they are. */}
    <DocumentVaultView
      employeeId="me"
      showIdentity={false}
      emptyMessage="You have no documents on file yet."
    />
  </Box>
);

export default MyDocumentsPage;
