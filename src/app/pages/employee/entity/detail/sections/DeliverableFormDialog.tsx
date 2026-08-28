import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Autocomplete, Box, DialogActions, DialogContent, InputAdornment,
  MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassDialog, GlassHeader, WtButton, WtSwitchField } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import {
  getDeliverableCategories,
  type ProjectDeliverable, type DeliverablePayload, type DeliverablePriority,
} from "@services/projectExecution";

const NAME_MAX = 100;
const CATEGORY_MAX = 80;

const PRIORITIES: { value: DeliverablePriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export interface DeliverableFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: DeliverablePayload) => void;
  saving?: boolean;
  serverError?: string | null;
  /** Row being edited, or null to create. */
  editing: ProjectDeliverable | null;
  stageName: string;
  /** Stage money value — drives the live read-only amount preview. */
  stageAmount: number;
  /** Every deliverable in the stage, for the duplicate-name check and the total preview. */
  siblings: ProjectDeliverable[];
}

/**
 * Add / edit a project deliverable.
 *
 * The amount is NOT a field — it is shown as a live read-only preview derived from the
 * stage amount and the percentage being typed, mirroring exactly what the server will
 * compute. That is the whole reason it can never be entered by hand.
 */
const DeliverableFormDialog: React.FC<DeliverableFormDialogProps> = ({
  open, onClose, onSubmit, saving = false, serverError = null,
  editing, stageName, stageAmount, siblings,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [percentage, setPercentage] = useState("");
  const [priority, setPriority] = useState<DeliverablePriority>("MEDIUM");
  const [category, setCategory] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [isBillable, setIsBillable] = useState(true);
  const [isMandatory, setIsMandatory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Suggestions only — the field is free text, so a new category is created by typing it.
  const { data: categories = [] } = useQuery({
    queryKey: ["project-execution", "deliverable-categories"],
    queryFn: getDeliverableCategories,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? "");
      setPercentage(String(editing.percentage ?? ""));
      setPriority(editing.priority ?? "MEDIUM");
      setCategory(editing.category ?? "");
      setEstimatedDays(editing.estimatedDays == null ? "" : String(editing.estimatedDays));
      setIsBillable(editing.isBillable ?? true);
      setIsMandatory(editing.isMandatory ?? true);
    } else {
      setName(""); setDescription(""); setPriority("MEDIUM");
      setCategory(""); setEstimatedDays(""); setIsBillable(true); setIsMandatory(true);
      // Pre-fill with whatever is left to reach 100% — the common case when adding a row
      // to a partly-allocated stage, and it starts the user at a valid total.
      const used = siblings.reduce((sum, d) => sum + (Number(d.percentage) || 0), 0);
      const left = Math.round((100 - used) * 1000) / 1000;
      setPercentage(left > 0 ? String(left) : "");
    }
  }, [open, editing, siblings]);

  const pct = parseFloat(percentage);
  const validPct = !Number.isNaN(pct) && pct > 0 && pct <= 100;
  const previewAmount = validPct ? (pct / 100) * stageAmount : 0;

  // What the stage would total if this edit were saved — so the user sees the consequence
  // before committing, not after.
  const projectedTotal = useMemo(() => {
    const others = siblings
      .filter((d) => d.id !== editing?.id)
      .reduce((sum, d) => sum + (Number(d.percentage) || 0), 0);
    return Math.round((others + (validPct ? pct : 0)) * 1000) / 1000;
  }, [siblings, editing, pct, validPct]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Deliverable name is required."); return; }
    if (trimmed.length > NAME_MAX) { setError(`Name cannot exceed ${NAME_MAX} characters.`); return; }
    if (siblings.some((d) => d.id !== editing?.id && d.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" already exists in this stage.`);
      return;
    }
    if (!validPct) { setError("Percentage must be greater than 0 and at most 100."); return; }

    const days = estimatedDays.trim();
    if (days && (!/^\d+$/.test(days))) { setError("Estimated days must be a whole number."); return; }

    onSubmit({
      name: trimmed,
      description: description.trim() || null,
      percentage: pct,
      priority,
      category: category.trim() || null,
      estimatedDays: days ? Number(days) : null,
      isBillable,
      isMandatory,
    });
  };

  const shownError = error ?? serverError;

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      header={
        <GlassHeader
          title={editing ? "Edit Deliverable" : "Add Deliverable"}
          icon={<KTIcon iconName="check-square" className="fs-2" />}
          onClose={onClose}
        />
      }
    >
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
            Stage: <strong>{stageName}</strong> · {formatCurrencyDecimal(stageAmount)}
          </Typography>

          {shownError && (
            <Box sx={{ p: 1.25, borderRadius: "10px", bgcolor: "error.main", color: "error.contrastText" }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{shownError}</Typography>
            </Box>
          )}

          <TextField
            label="Name"
            size="small"
            fullWidth
            autoFocus
            value={name}
            inputProps={{ maxLength: NAME_MAX }}
            helperText={`${name.trim().length}/${NAME_MAX}`}
            onChange={(e) => { setName(e.target.value); setError(null); }}
            placeholder="e.g. Site Survey"
          />

          <TextField
            label="Description (optional)"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Percentage drives the amount; the amount is never typed. */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Percentage of stage"
              size="small"
              type="number"
              value={percentage}
              onChange={(e) => { setPercentage(e.target.value); setError(null); }}
              InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
              inputProps={{ min: 0, max: 100, step: 0.001 }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Amount (calculated)"
              size="small"
              value={formatCurrencyDecimal(previewAmount)}
              InputProps={{ readOnly: true }}
              helperText="Derived from the stage amount — not editable"
              sx={{ flex: 1 }}
            />
          </Stack>

          <Typography
            sx={{
              fontSize: 12, fontWeight: 600,
              color: Math.abs(projectedTotal - 100) < 0.01 ? "success.main" : "warning.main",
            }}
          >
            Stage total after saving: {projectedTotal}%
            {Math.abs(projectedTotal - 100) < 0.01 ? " ✓" : " — must be exactly 100%"}
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              select
              label="Priority"
              size="small"
              value={priority}
              onChange={(e) => setPriority(e.target.value as DeliverablePriority)}
              sx={{ flex: 1 }}
            >
              {PRIORITIES.map((p) => (
                <MenuItem key={p.value} value={p.value} sx={{ fontSize: 13 }}>{p.label}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Estimated days"
              size="small"
              type="number"
              value={estimatedDays}
              onChange={(e) => setEstimatedDays(e.target.value)}
              inputProps={{ min: 0, step: 1 }}
              sx={{ flex: 1 }}
            />
          </Stack>

          {/* freeSolo: categories are user-defined, so typing a new one creates it. */}
          <Autocomplete
            freeSolo
            options={categories}
            value={category}
            onChange={(_e, value) => setCategory(value ?? "")}
            onInputChange={(_e, value) => setCategory(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Category (optional)"
                size="small"
                inputProps={{ ...params.inputProps, maxLength: CATEGORY_MAX }}
                helperText="Pick an existing one or type a new one"
              />
            )}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <WtSwitchField
                title="Billable"
                checked={isBillable}
                onChange={(e) => setIsBillable(e.target.checked)}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <WtSwitchField
                title="Mandatory"
                checked={isMandatory}
                onChange={(e) => setIsMandatory(e.target.checked)}
              />
            </Box>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <WtButton ghost onClick={onClose} disabled={saving}>Cancel</WtButton>
        <WtButton tone="primary" disabled={!name.trim() || saving} onClick={submit}>
          {saving ? "Saving…" : "Save"}
        </WtButton>
      </DialogActions>
    </GlassDialog>
  );
};

export default DeliverableFormDialog;
