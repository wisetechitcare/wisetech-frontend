import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button } from "@mui/material";
import { toast } from "react-toastify";
import { apiErrorMessage } from "@utils/apiError";
import { AppIcon } from "@app/modules/common/components/ui/AppIcon";
import { GIFT_MANAGEMENT_BASE } from "../giftPaths";
import { personKey } from "./PersonPicker";
import PeopleGroupDetailView from "./PeopleGroupDetailView";
import PeopleGroupUpdateView from "./PeopleGroupUpdateView";
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
  const [editing, setEditing] = useState(isNew);
  const [error, setError] = useState("");
  const [giftRunModalOpen, setGiftRunModalOpen] = useState(false);
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
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
    setEditing(isNew);
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

  const previewNames = useMemo(() => {
    const names = members
      .map((m) => m.fullName?.trim())
      .filter(Boolean) as string[];
    if (!names.length) return "";
    const shown = names.slice(0, 4);
    const more = names.length - shown.length;
    return more > 0 ? `${shown.join(", ")}, +${more}` : shown.join(", ");
  }, [members]);

  const goBack = () => navigate(`${GIFT_MANAGEMENT_BASE}/people-groups`);

  if (!isNew && !existing) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Group not found.</Alert>
        <Box sx={{ mt: 2 }}>
          <Button
            startIcon={<AppIcon name="bi-arrow-left" />}
            onClick={goBack}
          >
            Back to People Groups
          </Button>
        </Box>
      </Box>
    );
  }

  const cancelEdit = () => {
    setName(baselineName);
    setNotes(baselineNotes);
    setMembers(baselineMembers);
    setEditing(false);
    setError("");
    setAddPeopleOpen(false);
  };

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
        goBack();
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

  const removeMember = (person: PersonRef) =>
    setMembers((prev) =>
      prev.filter((m) => personKey(m) !== personKey(person)),
    );

  const isMixed = counts.contacts > 0 && counts.employees > 0;
  const memberLabel =
    members.length === 1 ? "1 member" : `${members.length} members`;
  const mixedHint = isMixed
    ? `${counts.contacts} contacts, ${counts.employees} employees`
    : undefined;
  const title = isNew ? "New People Group" : name.trim() || "People Group";

  const shared = {
    title,
    memberLabel,
    mixedHint,
    previewNames: previewNames || undefined,
  };

  if (!editing) {
    return (
      <>
        <PeopleGroupDetailView
          {...shared}
          groupId={groupId!}
          members={existingStillInGroup}
          onBack={goBack}
          onEdit={() => setEditing(true)}
        />
        {existing && (
          <DriveCreateModal
            open={giftRunModalOpen}
            onClose={() => setGiftRunModalOpen(false)}
            presetGroupId={existing.id}
          />
        )}
      </>
    );
  }

  return (
    <>
      <PeopleGroupUpdateView
        {...shared}
        isNew={isNew}
        name={name}
        notes={notes}
        members={members}
        existingMembers={existingStillInGroup}
        newlySelected={newlySelected}
        baselineMembers={baselineMembers}
        error={error}
        saving={saving}
        hasChanges={hasChanges}
        memberDiff={memberDiff}
        changeLines={changeLines}
        confirmName={name.trim() || baselineName}
        addPeopleOpen={addPeopleOpen}
        confirmOpen={confirmOpen}
        onNameChange={setName}
        onNotesChange={setNotes}
        onMembersChange={setMembers}
        onRemoveMember={removeMember}
        onBack={goBack}
        onCancel={cancelEdit}
        onSave={onSave}
        onOpenAddPeople={() => setAddPeopleOpen(true)}
        onCloseAddPeople={() => setAddPeopleOpen(false)}
        onCloseConfirm={() => setConfirmOpen(false)}
        onConfirmPersist={persist}
      />
      {!isNew && existing && (
        <DriveCreateModal
          open={giftRunModalOpen}
          onClose={() => setGiftRunModalOpen(false)}
          presetGroupId={existing.id}
        />
      )}
    </>
  );
}
