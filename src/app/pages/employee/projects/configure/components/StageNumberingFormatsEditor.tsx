import React, { useState } from "react";
import { Box, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { WtButton, WtIconButton, ToneChip, confirmDialog, toast } from "@app/modules/common/components/ui";
import { useStageNumberingFormats } from "@hooks/useStageNumberingFormats";
import {
  createStageNumberingFormat,
  deleteStageNumberingFormat,
  updateStageNumberingFormat,
} from "@services/stageNumberingFormat";
import {
  STAGE_NUMBER_STYLE_OPTIONS,
  STAGE_SEPARATOR_OPTIONS,
  formatStageNo,
  type StageNumberingFormat,
} from "@utils/stageNumbering";
import { apiErrorMessage } from "@utils/apiError";

/**
 * Stage numbering formats — how a payment plan's stages print their Sr No.
 *
 * Laid out like Lead Prefix Settings: each row reads left to right as the number it builds —
 * [prefix] [separator] [number] → preview, with Default / "Set default" on the right edge.
 * The default is what every plan without its own choice prints with.
 *
 * Existing rows save per field (prefix on blur/Enter). A NEW format is a local draft until
 * "Add" — creating a row on click only ever produced copies of the default to clean up.
 */

type Shape = Pick<StageNumberingFormat, "prefix" | "separator" | "style">;
const EMPTY_DRAFT: Shape = { prefix: "", separator: " ", style: "ARABIC" };

// Fixed control widths so the preview sits right beside the inputs instead of across a gap;
// the preview column takes the slack. Collapses to two lines on narrow screens.
const GRID = {
  display: "grid",
  gridTemplateColumns: {
    xs: "minmax(0,1fr) 96px 128px",
    md: "170px 104px 140px minmax(0,1fr) 170px",
  },
  columnGap: 1.25,
  rowGap: 1,
  alignItems: "center",
} as const;

const CONTROL_SX = {
  "& .MuiOutlinedInput-root": { height: 32, fontSize: 12.5, fontWeight: 600, borderRadius: 1, bgcolor: "background.paper" },
  "& .MuiOutlinedInput-input": { py: 0, px: 1.25 },
  "& .MuiSelect-select": { py: "5px", px: 1.25 },
} as const;

const HEAD_SX = { fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: "text.secondary", textTransform: "uppercase" } as const;

/** The three controls + preview, shared by saved rows and the draft row. */
const ShapeFields: React.FC<{
  value: Shape;
  onPrefix: (v: string) => void;
  onPrefixCommit?: () => void;
  onSeparator: (v: string) => void;
  onStyle: (v: StageNumberingFormat["style"]) => void;
  autoFocus?: boolean;
}> = ({ value, onPrefix, onPrefixCommit, onSeparator, onStyle, autoFocus }) => (
  <>
    <TextField
      size="small"
      value={value.prefix}
      autoFocus={autoFocus}
      onChange={(e) => onPrefix(e.target.value)}
      onBlur={onPrefixCommit}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      placeholder="No prefix"
      inputProps={{ maxLength: 20, "aria-label": "Prefix" }}
      sx={{ ...CONTROL_SX, "& .MuiOutlinedInput-input": { py: 0, px: 1.25, fontFamily: "monospace" } }}
    />
    <Tooltip title={value.prefix ? "" : "Only used when there is a prefix"}>
      <TextField
        select size="small" value={value.separator}
        onChange={(e) => onSeparator(e.target.value)}
        disabled={!value.prefix}
        inputProps={{ "aria-label": "Separator" }}
        sx={CONTROL_SX}
      >
        {STAGE_SEPARATOR_OPTIONS.map((o) => (
          <MenuItem key={o.label} value={o.value} sx={{ fontSize: 12.5 }}>{o.label}</MenuItem>
        ))}
      </TextField>
    </Tooltip>
    <TextField
      select size="small" value={value.style}
      onChange={(e) => onStyle(e.target.value as StageNumberingFormat["style"])}
      inputProps={{ "aria-label": "Number style" }}
      sx={CONTROL_SX}
    >
      {STAGE_NUMBER_STYLE_OPTIONS.map((o) => (
        <MenuItem key={o.value} value={o.value} sx={{ fontSize: 12.5, fontFamily: "monospace" }}>{o.label}</MenuItem>
      ))}
    </TextField>
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0, overflow: "hidden", gridColumn: { xs: "1 / -1", md: "auto" } }}>
      <Typography component="span" sx={{ color: "text.disabled", fontSize: 13, mr: 0.25 }}>→</Typography>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          component="span"
          sx={{
            px: 1, py: "3px", borderRadius: 1, bgcolor: "action.hover", border: "1px solid", borderColor: "divider",
            fontFamily: "monospace", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
          }}
        >
          {formatStageNo(value, i)}
        </Box>
      ))}
      <Typography component="span" sx={{ color: "text.disabled", fontSize: 12 }}>…</Typography>
    </Box>
  </>
);

const StageNumberingFormatsEditor: React.FC = () => {
  const { formats, loading, reload, setFormats } = useStageNumberingFormats();
  /** Prefix text being typed, per row — committed on blur so each keystroke isn't a save. */
  const [prefixDrafts, setPrefixDrafts] = useState<Record<string, string>>({});
  /** The not-yet-saved new format, or null when not adding. */
  const [draft, setDraft] = useState<Shape | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (format: StageNumberingFormat, patch: Partial<StageNumberingFormat>) => {
    setFormats((prev) => prev.map((f) => (f.id === format.id ? { ...f, ...patch } : f)));  // paint now
    try {
      await updateStageNumberingFormat(format.id, patch);
      if (patch.isDefault) await reload();  // the old default just lost its flag
    } catch (err) {
      await reload();  // server is the truth; put it back
      toast({ icon: "error", title: apiErrorMessage(err, "Could not save that change.") });
    }
  };

  const commitPrefix = (format: StageNumberingFormat) => {
    const prefix = prefixDrafts[format.id];
    setPrefixDrafts(({ [format.id]: _, ...rest }) => rest);
    if (prefix !== undefined && prefix !== format.prefix) void save(format, { prefix });
  };

  const addDraft = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await createStageNumberingFormat(draft);
      setDraft(null);
      await reload();
    } catch (err) {
      toast({ icon: "error", title: apiErrorMessage(err, "Could not add that format.") });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (format: StageNumberingFormat) => {
    const ok = await confirmDialog({
      title: `Delete "${formatStageNo(format, 0)}, ${formatStageNo(format, 1)}…"?`,
      text: "Plans using it will switch to the default format.",
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await deleteStageNumberingFormat(format.id);
      toast({ icon: "success", title: res?.message ?? "Format deleted" });
      await reload();
    } catch (err) {
      toast({ icon: "error", title: apiErrorMessage(err, "Could not delete that format.") });
    }
  };

  if (loading) return null;

  const rowSx = { ...GRID, px: 2, py: 1.25, borderTop: "1px solid", borderColor: "divider" };

  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "12px", overflow: "hidden" }}>
      <Box sx={{ ...GRID, px: 2, py: 1.1, bgcolor: "action.hover", display: { xs: "none", md: "grid" } }}>
        <Typography sx={HEAD_SX}>Prefix</Typography>
        <Typography sx={HEAD_SX}>Separator</Typography>
        <Typography sx={HEAD_SX}>Number</Typography>
        <Typography sx={HEAD_SX}>Stages print as</Typography>
        <Typography sx={{ ...HEAD_SX, textAlign: "right" }}>Default</Typography>
      </Box>

      {formats.length === 0 && !draft && (
        <Typography sx={{ px: 2, py: 2, fontSize: 12.5, color: "text.secondary", borderTop: "1px solid", borderColor: "divider" }}>
          No formats yet — stages print as 1, 2, 3. Add one to choose your own.
        </Typography>
      )}

      {formats.map((f) => (
        <Box
          key={f.id}
          sx={{ ...rowSx, bgcolor: f.isDefault ? "action.selected" : "transparent" }}
        >
          <ShapeFields
            value={{ ...f, prefix: prefixDrafts[f.id] ?? f.prefix }}
            onPrefix={(v) => setPrefixDrafts((d) => ({ ...d, [f.id]: v }))}
            onPrefixCommit={() => commitPrefix(f)}
            onSeparator={(v) => void save(f, { separator: v })}
            onStyle={(v) => void save(f, { style: v })}
          />
          {/* Right edge: the default wears a chip; every other row offers to become it. */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.75, gridColumn: { xs: "1 / -1", md: "auto" } }}>
            {f.isDefault ? (
              <Tooltip title="New plans use this format">
                <span><ToneChip tone="brand" label="Default" /></span>
              </Tooltip>
            ) : (
              <>
                <WtButton
                  tone="primary" size="small" ghost onClick={() => void save(f, { isDefault: true })}
                  sx={{ minHeight: 30, fontSize: 12, borderRadius: "8px", whiteSpace: "nowrap", px: 1.5 }}
                >
                  Set default
                </WtButton>
                <WtIconButton title="Delete format" color="#C0392B" onClick={() => void remove(f)} sx={{ width: 30, height: 30, borderRadius: "8px" }}>
                  <KTIcon iconName="trash" className="fs-6" />
                </WtIconButton>
              </>
            )}
          </Box>
        </Box>
      ))}

      {draft ? (
        <Box sx={{ ...rowSx, bgcolor: "action.hover" }}>
          <ShapeFields
            autoFocus
            value={draft}
            onPrefix={(v) => setDraft({ ...draft, prefix: v })}
            onSeparator={(v) => setDraft({ ...draft, separator: v })}
            onStyle={(v) => setDraft({ ...draft, style: v })}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
            <WtIconButton title="Add" onClick={() => void addDraft()} disabled={busy} sx={{ width: 30, height: 30, borderRadius: "8px", color: "success.main" }}>
              <KTIcon iconName="check" className="fs-5" />
            </WtIconButton>
            <WtIconButton title="Cancel" onClick={() => setDraft(null)} sx={{ width: 30, height: 30, borderRadius: "8px" }}>
              <KTIcon iconName="cross" className="fs-5" />
            </WtIconButton>
          </Box>
        </Box>
      ) : (
        <Box sx={{ px: 2, py: 1, borderTop: "1px solid", borderColor: "divider" }}>
          <WtButton
            tone="primary" size="small" ghost onClick={() => setDraft(EMPTY_DRAFT)}
            startIcon={<KTIcon iconName="plus" className="fs-6" />}
            sx={{ minHeight: 30, fontSize: 12.5, borderRadius: "9px", whiteSpace: "nowrap" }}
          >
            Add format
          </WtButton>
        </Box>
      )}
    </Box>
  );
};

export default StageNumberingFormatsEditor;
