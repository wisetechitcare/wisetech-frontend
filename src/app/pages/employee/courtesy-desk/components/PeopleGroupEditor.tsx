import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { toast } from "react-toastify";
import { apiErrorMessage } from "@utils/apiError";
import PremiumButton from "@app/modules/common/components/PremiumButton";
import { AppIcon } from "@app/modules/common/components/ui/AppIcon";
import { TRIO } from "@app/modules/common/components/ui/patterns";
import { FormSectionHead } from "@app/pages/employee/tasks/components/primitives";
import { GIFT_MANAGEMENT_BASE } from "../giftPaths";
import PersonPicker from "./PersonPicker";
import { DriveCreateModal } from "./DriveCreate";
import { getGroup, saveGroupToApi } from "../store/courtesyDeskStore";
import { useCourtesyDesk } from "../hooks/useCourtesyDesk";
import type { PersonRef } from "../types";

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
  const [error, setError] = useState("");
  const [giftRunModalOpen, setGiftRunModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const g = !isNew && groupId ? getGroup(groupId) : undefined;
    setName(g?.name || "");
    setNotes(g?.notes || "");
    setMembers(g?.members || []);
    setError("");
  }, [groupId, isNew]);

  const counts = useMemo(() => {
    const contacts = members.filter((m) => m.memberType === "CONTACT").length;
    const employees = members.filter((m) => m.memberType === "EMPLOYEE").length;
    return { contacts, employees };
  }, [members]);

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
    setSaving(true);
    void saveGroupToApi({
      id: isNew ? undefined : existing!.id,
      name,
      notes,
      members,
    })
      .then(() => {
        toast.success(isNew ? "Group created." : "Group updated — linked Gift Runs synced.");
        navigate(`${GIFT_MANAGEMENT_BASE}/people-groups`);
      })
      .catch((err: unknown) => {
        const msg = apiErrorMessage(err, "Something went wrong");
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setSaving(false));
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
            Mix Contacts and Employees. Selected people stay pinned on top.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<AppIcon name="bi-arrow-left" />}
            onClick={() => navigate(`${GIFT_MANAGEMENT_BASE}/people-groups`)}
          >
            Back
          </Button>
          <PremiumButton icon="bi-check-lg" onClick={onSave} disabled={saving}>
            {isNew ? "Save Group" : "Update Group"}
          </PremiumButton>
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
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <FormSectionHead
          icon="people"
          title="Add people"
          hint="Search contacts or employees — selected list scrolls; green = added."
          tone="green"
        />
        <PersonPicker selected={members} onChange={setMembers} />
      </Paper>

      {!isNew && existing && (
        <DriveCreateModal
          open={giftRunModalOpen}
          onClose={() => setGiftRunModalOpen(false)}
          presetGroupId={existing.id}
        />
      )}
    </Box>
  );
}
