import { useRef } from "react";
import { Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
  FormSection, FORM_SPACE, TRIO, WtButton,
} from "@app/modules/common/components/ui";
import * as S from "../forms/onboarding/OnboardingSections";
import type { OnboardingSectionsProps } from "../forms/onboarding/OnboardingSections";

/**
 * Candidate Documents leaf — Resume (ATS upload) + onboarding identity doc types.
 * Resume stays on host state / uploadApplicantResume; identity docs use documentInfo.
 */
interface Props extends OnboardingSectionsProps {
  resumeFile: File | null;
  onResumeFile: (file: File | null) => void;
  existingResumeName?: string | null;
  disabled?: boolean;
}

export function CandidateDocumentsSection({
  resumeFile,
  onResumeFile,
  existingResumeName,
  disabled,
  ...sectionProps
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);

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
        <S.DocumentsSection {...sectionProps} />
      </FormSection>
    </Stack>
  );
}

export default CandidateDocumentsSection;
