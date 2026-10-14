import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  DialogActions,
  DialogContent,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { toast } from "react-toastify";
import { apiErrorMessage } from "@utils/apiError";
import PremiumButton from "@app/modules/common/components/PremiumButton";
import { AppIcon } from "@app/modules/common/components/ui/AppIcon";
import {
  GlassDialog,
  GlassHeader,
  InlineHint,
  WtButton,
} from "@app/modules/common/components/ui";
import { TRIO } from "@app/modules/common/components/ui/patterns";
import { FormSectionHead } from "@app/pages/employee/tasks/components/primitives";
import { GIFT_MANAGEMENT_BASE } from "../giftPaths";
import PersonPicker, { MemberListPanel, personKey } from "./PersonPicker";
import { DriveCreateModal } from "./DriveCreate";
import { getGroup, saveGroupToApi } from "../store/courtesyDeskStore";
import { useCourtesyDesk } from "../hooks/useCourtesyDesk";
import type { PersonRef } from "../types";

function membersEqual(a: PersonRef[], b: PersonRef[]) {
  if (a.length !== b.length) return false;
  const keys = new Set(a.map(personKey));
  return b.every((p) => keys.has(personKey(p)));
}

export default function PeopleGroupEditor() {
  useCourtesyDesk();
  const theme = useTheme();
  const { groupId } = useParams<{ groupId: string }>();
  const isNew = !groupId || groupId === "new";
  const existing = !isNew ? getGroup(groupId) : undefined;
  const navigate = useNavigate();

  const [name, setName] = useState(existing?.name || "");
  const [notes, setNotes] = useState(existing?.notes || "");
  const [members, setMembers] = useState<PersonRef[]>(existing?.members || []);
  const [baselineName, setBaselineName] = useState(existing?.name || "");
  const [baselineNotes, setBaselineNotes] = useState(existing?.notes || "");
  const [baselineMembers, setBaselineMembers] = useState<PersonRef[]>(
    existing?.members || [],
  );
  const [error, setError] = useState("");
  const [giftRunModalOpen, setGiftRunModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const g = !isNew && groupId ? getGroup(groupId) : undefined;
    const nextName = g?.name || "";
    const nextNotes = g?.notes || "";
    const nextMembers = g?.members || [];
    setName(nextName);
    setNotes(nextNotes);
    setMembers(nextMembers);
    setBaselineName(nextName);
    setBaselineNotes(nextNotes);
    setBaselineMembers(nextMembers);
    setError("");
  }, [groupId, isNew]);

  const counts = useMemo(() => {
    const contacts = members.filter((m) => m.memberType === "CONTACT").length;
    const employees = members.filter((m) => m.memberType === "EMPLOYEE").length;
    return { contacts, employees };
  }, [members]);

  const baselineKeys = useMemo(
    () => new Set(baselineMembers.map(personKey)),
    [baselineMembers],
  );

  const existingStillInGroup = useMemo(
    () => members.filter((m) => baselineKeys.has(personKey(m))),
    [members, baselineKeys],
  );

  const newlySelected = useMemo(
    () => members.filter((m) => !baselineKeys.has(personKey(m))),
    [members, baselineKeys],
  );

  const memberDiff = useMemo(() => {
    const currentKeys = new Set(members.map(personKey));
    const added = newlySelected.length;
    const removed = baselineMembers.filter(
      (m) => !currentKeys.has(personKey(m)),
    ).length;
    return { added, removed };
  }, [members, baselineMembers, newlySelected.length]);

  const hasChanges = useMemo(() => {
    if (isNew) return true;
    return (
      name.trim() !== baselineName.trim() ||
      notes !== baselineNotes ||
      !membersEqual(members, baselineMembers)
    );
  }, [
    isNew,
    name,
    notes,
    members,
    baselineName,
    baselineNotes,
    baselineMembers,
  ]);

  const changeLines = useMemo(() => {
    const lines: string[] = [];
    if (name.trim() !== baselineName.trim()) {
      lines.push(`Name changed to “${name.trim()}”`);
    }
    if (notes !== baselineNotes) {
      lines.push(notes.trim() ? "Notes updated" : "Notes cleared");
    }
    if (memberDiff.added > 0) {
      lines.push(
        `${memberDiff.added} ${memberDiff.added === 1 ? "person" : "people"} added`,
      );
    }
    if (memberDiff.removed > 0) {
      lines.push(
        `${memberDiff.removed} ${memberDiff.removed === 1 ? "person" : "people"} removed`,
      );
    }
    return lines;
  }, [
    name,
    notes,
    baselineName,
    baselineNotes,
    memberDiff.added,
    memberDiff.removed,
  ]);

  if (!isNew && !existing) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Group not found.</Alert>
        <Box sx={{ mt: 2 }}>
          <Button
            startIcon={<AppIcon name="bi-arrow-left" />}
            onClick={() => navigate(`${GIFT_MANAGEMENT_BASE}/people-groups`)}
          >
            Back to People Groups
          </Button>
        </Box>
      </Box>
    );
  }

  const persist = () => {
    setSaving(true);
    void saveGroupToApi({
      id: isNew ? undefined : existing!.id,
      name,
      notes,
      members,
    })
      .then(() => {
        setConfirmOpen(false);
        toast.success(
          isNew ? "Group created." : "Group updated — linked Gift Runs synced.",
        );
        navigate(`${GIFT_MANAGEMENT_BASE}/people-groups`);
      })
      .catch((err: unknown) => {
        const msg = apiErrorMessage(err, "Something went wrong");
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setSaving(false));
  };

  const onSave = () => {
    setError("");
    if (!name.trim()) {
      setError("Group name is required.");
      toast.error("Group name is required.");
      return;
    }
    if (!members.length) {
      setError("Select at least one person.");
      toast.error("Select at least one person.");
      return;
    }

    if (!isNew) {
      setConfirmOpen(true);
      return;
    }

    persist();
  };

  const summaryChip = (
    label: string,
    count: number,
    trio: (typeof TRIO)["blue"],
  ) => (
    <Chip
      label={`${count} ${label}`}
      sx={{
        fontWeight: 700,
        bgcolor: alpha(trio.c, theme.palette.mode === "dark" ? 0.22 : 0.12),
        color: trio.c,
        border: `1px solid ${alpha(trio.c, 0.35)}`,
      }}
    />
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1040 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
        flexWrap="wrap"
        useFlexGap
        spacing={1}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {isNew ? "New People Group" : "Update People Group"}
          </Typography>
          <Typography color="text.secondary">
            {isNew
              ? "Mix Contacts and Employees. Selected people appear once you tick them."
              : "Existing members are listed above. Newly selected people appear under Add people."}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<AppIcon name="bi-arrow-left" />}
            onClick={() => navigate(`${GIFT_MANAGEMENT_BASE}/people-groups`)}
          >
            Back
          </Button>
          {(isNew || hasChanges) && (
            <PremiumButton icon="bi-check-lg" onClick={onSave} disabled={saving}>
              {isNew ? "Save Group" : "Update Group"}
            </PremiumButton>
          )}
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2.5, mb: 2.5, borderRadius: 2 }}>
        <FormSectionHead
          icon="bi-card-text"
          title="Group details"
          hint="Name and optional notes for this reusable list."
          tone="blue"
        />
        <Stack spacing={2}>
          <TextField
            label="Group name"
            placeholder="e.g. Reza Peoples"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Notes (optional)"
            placeholder="e.g. Partners only"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {summaryChip("selected", members.length, TRIO.green)}
            {summaryChip("contacts", counts.contacts, TRIO.blue)}
            {summaryChip("employees", counts.employees, TRIO.cyan)}
            {!isNew && memberDiff.added > 0 && (
              summaryChip("new", memberDiff.added, TRIO.green)
            )}
            {!isNew && memberDiff.removed > 0 && (
              summaryChip("removed", memberDiff.removed, TRIO.amber)
            )}
          </Stack>
        </Stack>
      </Paper>

      {!isNew && (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 2.5, borderRadius: 2 }}>
          <FormSectionHead
            icon="profile-user"
            title="Existing members"
            hint="People already saved in this group. Remove anyone who should no longer belong."
            tone="blue"
          />
          {existingStillInGroup.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No existing members left — all previous members were removed, or
              add people below.
            </Typography>
          ) : (
            <MemberListPanel
              title="In this group"
              people={existingStillInGroup}
              tone={TRIO.blue}
              icon="profile-user"
              clearLabel="Remove all existing"
              onClear={() => setMembers(newlySelected)}
              onRemove={(person) =>
                setMembers((prev) =>
                  prev.filter((m) => personKey(m) !== personKey(person)),
                )
              }
              sx={{ mb: 0 }}
            />
          )}
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <FormSectionHead
          icon="people"
          title="Add people"
          hint={
            isNew
              ? "Search contacts or employees — the selected list appears once you tick someone."
              : "Search and tick to add. Newly selected people appear here in green."
          }
          tone="green"
        />
        <PersonPicker
          selected={members}
          onChange={setMembers}
          baselineSelected={isNew ? undefined : baselineMembers}
        />
      </Paper>

      {!isNew && existing && (
        <DriveCreateModal
          open={giftRunModalOpen}
          onClose={() => setGiftRunModalOpen(false)}
          presetGroupId={existing.id}
        />
      )}

      <GlassDialog
        open={confirmOpen}
        onClose={() => !saving && setConfirmOpen(false)}
        maxWidth="xs"
        header={
          <GlassHeader
            icon={<KTIcon iconName="information-5" className="fs-2" />}
            title="Confirm update"
            onClose={() => !saving && setConfirmOpen(false)}
          />
        }
      >
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Typography sx={{ fontSize: 14, lineHeight: 1.5 }}>
              Update{" "}
              <Box component="span" sx={{ fontWeight: 700 }}>
                {name.trim() || baselineName}
              </Box>
              ?
            </Typography>

            {changeLines.length > 0 && (
              <Box
                component="ul"
                sx={{
                  m: 0,
                  pl: 2.25,
                  py: 0,
                  "& li": {
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    color: "text.secondary",
                    mb: 0.5,
                    "&:last-child": { mb: 0 },
                  },
                }}
              >
                {changeLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </Box>
            )}

            <InlineHint>
              Linked Gift Runs will sync with this group after you confirm.
            </InlineHint>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <WtButton
            ghost
            onClick={() => setConfirmOpen(false)}
            disabled={saving}
          >
            Cancel
          </WtButton>
          <WtButton tone="primary" onClick={persist} disabled={saving}>
            {saving ? "Updating…" : "Update Group"}
          </WtButton>
        </DialogActions>
      </GlassDialog>
    </Box>
  );
}
