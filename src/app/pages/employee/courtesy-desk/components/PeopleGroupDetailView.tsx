import { Box, Paper, Stack, Typography } from "@mui/material";
import PremiumButton from "@app/modules/common/components/PremiumButton";
import { AppIcon } from "@app/modules/common/components/ui/AppIcon";
import { FormSectionHead } from "@app/pages/employee/tasks/components/primitives";
import { MemberListPanel } from "./PersonPicker";
import GiftHistoryButton from "./GroupActivityLog";
import PeopleGroupHeader from "./PeopleGroupHeader";
import type { PersonRef } from "../types";
import { WtIconButton, WtButton } from '@app/modules/common/components/ui/buttons';

export default function PeopleGroupDetailView({
  title,
  memberLabel,
  mixedHint,
  previewNames,
  members,
  groupId,
  onBack,
  onEdit,
}: {
  title: string;
  memberLabel: string;
  mixedHint?: string;
  previewNames?: string;
  members: PersonRef[];
  groupId: string;
  onBack: () => void;
  onEdit: () => void;
}) {
  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2, md: 3 },
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <PeopleGroupHeader
        title={title}
        memberLabel={memberLabel}
        mixedHint={mixedHint}
        previewNames={previewNames}
        onBack={onBack}
        mobileTrailing={
          <Stack direction="row" alignItems="center" spacing={0.25}>
            <GiftHistoryButton kind="group" id={groupId} />
            <WtIconButton color="var(--primary)" size="medium" onClick={onEdit} aria-label="Edit">
              <AppIcon name="bi-pencil" className="fs-3" />
            </WtIconButton>
          </Stack>
        }
        desktopActions={
          <Stack direction="row" spacing={1} alignItems="center">
            <WtButton variant="text"
              startIcon={<AppIcon name="bi-arrow-left" />}
              onClick={onBack}
            >
              Back
            </WtButton>
            <GiftHistoryButton kind="group" id={groupId} />
            <PremiumButton icon="bi-pencil" onClick={onEdit}>
              Edit
            </PremiumButton>
          </Stack>
        }
      />

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1.5, sm: 2.5 },
          borderRadius: { xs: 0, sm: 2 },
          mx: { xs: -1.5, sm: 0 },
          borderLeft: { xs: "none", sm: undefined },
          borderRight: { xs: "none", sm: undefined },
        }}
      >
        <Box sx={{ display: { xs: "none", sm: "block" } }}>
          <FormSectionHead icon="profile-user" title="Members" tone="blue" />
        </Box>
        {members.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No members in this group.
          </Typography>
        ) : (
          <MemberListPanel people={members} searchable sx={{ mb: 0 }} />
        )}
      </Paper>
    </Box>
  );
}
