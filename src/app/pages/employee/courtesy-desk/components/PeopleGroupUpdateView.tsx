import {
  Alert,
  Box,
  Button,
  Chip,
  DialogActions,
  DialogContent,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import PremiumButton from "@app/modules/common/components/PremiumButton";
import { AppIcon } from "@app/modules/common/components/ui/AppIcon";
import {
  ConfirmDialog,
  GlassDialog,
  GlassHeader,
  InlineHint,
} from "@app/modules/common/components/ui";
import { TRIO } from "@app/modules/common/components/ui/patterns";
import { FormSectionHead } from "@app/pages/employee/tasks/components/primitives";
import PersonPicker, { MemberListPanel } from "./PersonPicker";
import PeopleGroupHeader from "./PeopleGroupHeader";
import type { PersonRef } from "../types";

export default function PeopleGroupUpdateView({
  isNew,
  title,
  memberLabel,
  mixedHint,
  previewNames,
  name,
  notes,
  members,
  existingMembers,
  newlySelected,
  baselineMembers,
  error,
  saving,
  hasChanges,
  memberDiff,
  changeLines,
  confirmName,
  addPeopleOpen,
  confirmOpen,
  onNameChange,
  onNotesChange,
  onMembersChange,
  onRemoveMember,
  onBack,
  onCancel,
  onSave,
  onOpenAddPeople,
  onCloseAddPeople,
  onCloseConfirm,
  onConfirmPersist,
}: {
  isNew: boolean;
  title: string;
  memberLabel: string;
  mixedHint?: string;
  previewNames?: string;
  name: string;
  notes: string;
  members: PersonRef[];
  existingMembers: PersonRef[];
  newlySelected: PersonRef[];
  baselineMembers: PersonRef[];
  error: string;
  saving: boolean;
  hasChanges: boolean;
  memberDiff: { added: number; removed: number };
  changeLines: string[];
  confirmName: string;
  addPeopleOpen: boolean;
  confirmOpen: boolean;
  onNameChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onMembersChange: (v: PersonRef[]) => void;
  onRemoveMember: (person: PersonRef) => void;
  onBack: () => void;
  onCancel: () => void;
  onSave: () => void;
  onOpenAddPeople: () => void;
  onCloseAddPeople: () => void;
  onCloseConfirm: () => void;
  onConfirmPersist: () => void;
}) {
  const theme = useTheme();
  const membersForList = isNew ? members : existingMembers;
  const saveDisabled = saving || (!isNew && !hasChanges);

  const summaryChip = (
    label: string,
    count: number,
    trio: (typeof TRIO)["blue"],
  ) => (
    <Chip
      label={`${count} ${label}`}
      size="small"
      sx={{
        fontWeight: 700,
        bgcolor: alpha(trio.c, theme.palette.mode === "dark" ? 0.22 : 0.12),
        color: trio.c,
        border: `1px solid ${alpha(trio.c, 0.35)}`,
      }}
    />
  );

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
          <>
            {!isNew && (
              <IconButton
                onClick={onCancel}
                disabled={saving}
                aria-label="Cancel"
              >
                <AppIcon name="bi-x-lg" className="fs-3" />
              </IconButton>
            )}
            <IconButton
              onClick={onSave}
              disabled={saveDisabled}
              aria-label={isNew ? "Save Group" : "Update Group"}
              color="primary"
            >
              <AppIcon name="bi-check-lg" className="fs-2" />
            </IconButton>
          </>
        }
        desktopActions={
          <Stack direction="row" spacing={1}>
            <Button
              startIcon={<AppIcon name="bi-arrow-left" />}
              onClick={onBack}
            >
              Back
            </Button>
            {!isNew && (
              <Button onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
            )}
            <PremiumButton
              icon="bi-check-lg"
              onClick={onSave}
              disabled={saveDisabled}
            >
              {isNew ? "Save Group" : "Update Group"}
            </PremiumButton>
          </Stack>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1.5, sm: 2.5 },
          mb: { xs: 1.75, md: 2.5 },
          borderRadius: { xs: 0, sm: 2 },
          mx: { xs: -1.5, sm: 0 },
          borderLeft: { xs: "none", sm: undefined },
          borderRight: { xs: "none", sm: undefined },
        }}
      >
        <Box sx={{ display: { xs: "none", sm: "block" } }}>
          <FormSectionHead
            icon="bi-card-text"
            title="Group details"
            hint="Name and optional notes for this reusable list."
            tone="blue"
          />
        </Box>
        <Stack spacing={2}>
          <TextField
            label="Group name"
            placeholder="e.g. Engineering Team"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            fullWidth
            required
            size="small"
          />
          <TextField
            label="Notes (optional)"
            placeholder="e.g. Partners only"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            size="small"
          />
          {!isNew && (memberDiff.added > 0 || memberDiff.removed > 0) && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {memberDiff.added > 0 &&
                summaryChip("new", memberDiff.added, TRIO.green)}
              {memberDiff.removed > 0 &&
                summaryChip("removed", memberDiff.removed, TRIO.amber)}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Stack spacing={{ xs: 1.75, md: 2.5 }}>
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
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
            sx={{ mb: 0.5 }}
          >
            <Box sx={{ display: { xs: "none", sm: "block" }, flex: 1 }}>
              <FormSectionHead
                icon={isNew ? "people" : "profile-user"}
                title="Members"
                hint={
                  isNew
                    ? "Add members to this group, then save."
                    : "Remove members or add more, then update."
                }
                tone={isNew ? "green" : "blue"}
              />
            </Box>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ display: { xs: "block", sm: "none" }, flex: 1 }}
            >
              Members
            </Typography>
            {/* Mobile: icon add; desktop: labeled button */}
            <IconButton
              color="primary"
              onClick={onOpenAddPeople}
              aria-label="Add people"
              sx={{ display: { xs: "inline-flex", sm: "none" } }}
            >
              <AppIcon name="bi-plus-lg" className="fs-2" />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AppIcon name="bi-people" />}
              onClick={onOpenAddPeople}
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                flexShrink: 0,
              }}
            >
              Add people
            </Button>
          </Stack>

          {membersForList.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {isNew
                ? "No members yet — tap Add people to search contacts or employees."
                : "No existing members left — add people with the button above."}
            </Typography>
          ) : (
            <MemberListPanel
              people={membersForList}
              searchable
              selectable
              onRemove={onRemoveMember}
              sx={{ mb: 0 }}
            />
          )}
        </Paper>

        {!isNew && newlySelected.length > 0 && (
          <Paper
            variant="outlined"
            sx={{ p: { xs: 1.75, sm: 2.5 }, borderRadius: 2 }}
          >
            <FormSectionHead
              icon="people"
              title="Newly selected"
              hint="Added in this session — save the group to keep them."
              tone="green"
            />
            <MemberListPanel
              people={newlySelected}
              searchable
              selectable
              onRemove={onRemoveMember}
              sx={{ mb: 0 }}
            />
          </Paper>
        )}
      </Stack>

      <GlassDialog
        open={addPeopleOpen}
        onClose={onCloseAddPeople}
        maxWidth="md"
        plain
        header={
          <GlassHeader
            icon={<KTIcon iconName="people" className="fs-2" />}
            title="Add people"
            onClose={onCloseAddPeople}
          />
        }
      >
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Search contacts or employees and tick to add. People already in this
            group stay locked.
          </Typography>
          <PersonPicker
            selected={members}
            onChange={onMembersChange}
            baselineSelected={isNew ? undefined : baselineMembers}
            hideSelectedPanels
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <PremiumButton onClick={onCloseAddPeople}>Done</PremiumButton>
        </DialogActions>
      </GlassDialog>

      <ConfirmDialog
        open={confirmOpen}
        variant="confirm"
        title="Confirm Group Update"
        message={`Are you sure you want to update this group? Once updated, this will update the group and all linked gift runs.`}
        confirmLabel="Save"
        loading={saving}
        loadingLabel="Updating…"
        onClose={onCloseConfirm}
        onConfirm={onConfirmPersist}
      ></ConfirmDialog>
    </Box>
  );
}
