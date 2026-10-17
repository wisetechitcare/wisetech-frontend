import { useRef } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { useFormikContext } from "formik";
import { FileCheck2, FileText } from "lucide-react";
import { KTIcon } from "@metronic/helpers";
import FileInput from "@app/modules/common/inputs/FileInput";
import {
  FormSection, FORM_SPACE, TRIO, WtButton, WtEmptyState, WtFieldFormik, InlineNotice,
} from "@app/modules/common/components/ui";
import type { OnboardingSectionsProps } from "../forms/onboarding/OnboardingSections";
import type { CandidateFormValues } from "./candidateProfile";

/**
 * Candidate Documents leaf — Resume + identity docs (recruitment-local kit).
 * Identity number uses WtFieldFormik — does not render shared Documents.tsx TextInput.
 */

interface DocFieldRow {
  id: string;
  fieldName: string;
  hasIdentityNumber?: boolean;
}

interface Props extends OnboardingSectionsProps {
  resumeFile: File | null;
  onResumeFile: (file: File | null) => void;
  existingResumeName?: string | null;
  disabled?: boolean;
}

function CandidateIdentityDocRow({
  docField,
  index,
  setFile,
  removeFile,
  disabled,
}: {
  docField: DocFieldRow;
  index: number;
  setFile: OnboardingSectionsProps["setFile"];
  removeFile?: OnboardingSectionsProps["removeFile"];
  disabled?: boolean;
}) {
  const { values, setFieldValue } = useFormikContext<CandidateFormValues>();
  const documentInfo = Array.isArray(values.documentInfo) ? values.documentInfo : [];

  let documentInfoIndex = documentInfo.findIndex((doc) => doc.documentId === docField.id);
  if (documentInfoIndex === -1) documentInfoIndex = index;

  const element = documentInfo[documentInfoIndex];
  const { id, fieldName, hasIdentityNumber } = docField;
  const isAttached = Boolean(element?.path || element?.fileName);
  const identityFieldPath = `documentInfo[${documentInfoIndex}].identityNumber`;

  const handleSelect = (docId: string, file: File) => {
    void setFieldValue(`documentInfo[${documentInfoIndex}].fileName`, file.name);
    setFile(docId, file);
  };

  const handleRemove = () => {
    void setFieldValue(`documentInfo[${documentInfoIndex}].path`, "");
    void setFieldValue(`documentInfo[${documentInfoIndex}].fileName`, "");
    removeFile?.(id);
  };

  return (
    <Box
      className="ob-doc-card"
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
        mb: 1.5,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
        <Box sx={{ color: isAttached ? "success.main" : "text.secondary", display: "grid", placeItems: "center" }} aria-hidden>
          {isAttached ? <FileCheck2 size={16} /> : <FileText size={16} />}
        </Box>
        <Typography sx={{ flex: 1, fontWeight: 700, fontSize: 13.5, minWidth: 0 }} noWrap>
          {fieldName}
        </Typography>
        <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: isAttached ? "success.main" : "text.disabled" }}>
          {isAttached ? "Attached" : "Not attached"}
        </Typography>
      </Stack>

      <Stack spacing={1.25}>
        {hasIdentityNumber && (
          <WtFieldFormik
            name={identityFieldPath}
            label="Document Number"
            placeholder="Enter number"
            fullWidth
            disabled={disabled}
          />
        )}
        <FileInput
          placeholder="Document"
          documentId={id}
          setFile={handleSelect}
          onRemove={handleRemove}
          existingDocument={element}
          fieldName={fieldName}
          onboardingStyle
        />
      </Stack>
    </Box>
  );
}

export function CandidateDocumentsSection({
  resumeFile,
  onResumeFile,
  existingResumeName,
  disabled,
  setFile,
  removeFile,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { values } = useFormikContext<CandidateFormValues>();
  const documentFields = (Array.isArray(values.documentFields) ? values.documentFields : []) as DocFieldRow[];

  return (
    <Stack spacing={FORM_SPACE.stackGap}>
      <FormSection tone={TRIO.slate} icon="document" title="Resume" desc="PDF, DOC or DOCX — max 5 MB (server-enforced).">
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
          <input
            ref={fileRef}
            id="candidate-resume-upload"
            type="file"
            accept=".pdf,.doc,.docx,application/pdf"
            hidden
            aria-label="Attach resume"
            onChange={(e) => onResumeFile(e.target.files?.[0] ?? null)}
          />
          <WtButton
            ghost
            size="small"
            disabled={disabled}
            startIcon={<KTIcon iconName="cloud-add" className="fs-5" />}
            onClick={() => {
              if (fileRef.current) fileRef.current.value = "";
              fileRef.current?.click();
            }}
            aria-controls="candidate-resume-upload"
          >
            {resumeFile ? "Choose a different resume" : existingResumeName ? "Replace resume" : "Attach resume"}
          </WtButton>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", minWidth: 0, flex: 1 }} noWrap>
            {resumeFile?.name ?? existingResumeName ?? "No file chosen yet"}
          </Typography>
        </Stack>
      </FormSection>

      <FormSection tone={TRIO.blue} icon="folder" title="Identity documents" desc="Aadhaar, PAN and other types from Onboarding Docs — optional until offer.">
        {documentFields.length === 0 ? (
          <WtEmptyState
            dense
            icon="folder"
            title="No documents requested"
            hint="Nothing is configured for this company yet. Add document types under Organization → Onboarding Docs and they will appear here."
          />
        ) : (
          <Stack spacing={FORM_SPACE.fieldGap} sx={{ pt: FORM_SPACE.fieldGap / 2 }}>
            <InlineNotice icon="information-5">
              Please upload PDF files only — other file types such as images will not be accepted.
            </InlineNotice>
            {documentFields.map((field, index) => (
              <CandidateIdentityDocRow
                key={field?.id ?? `documentFields-${index}`}
                docField={field}
                index={index}
                setFile={setFile}
                removeFile={removeFile}
                disabled={disabled}
              />
            ))}
          </Stack>
        )}
      </FormSection>
    </Stack>
  );
}

export default CandidateDocumentsSection;
