import { Box, Typography } from "@mui/material";

export type UploadState = "idle" | "uploading" | "pending" | "saved";

/**
 * One line telling the user where an attachment stands.
 *
 * `ObFileUpload` already shows the file name and the View / Change / Remove
 * controls, so a second card repeating the name was the whole problem: the same
 * document appeared twice, once as a "Selected document" panel and once as the
 * control itself. The only thing that panel said which the control does not is
 * whether the file is actually *stored* yet — during onboarding an attachment is
 * held until the employee is created — and that is one line, not a card.
 *
 * `pending` is the important state: the file looks attached but nothing has been
 * written, and losing that distinction is how someone closes a half-finished form
 * believing their certificate is safe.
 */
const STATE_STYLE: Record<Exclude<UploadState, "idle">, { icon: string; color: string; text: string }> = {
  uploading: { icon: "bi-arrow-repeat", color: "#1E3A8A", text: "Uploading…" },
  pending: { icon: "bi-clock", color: "#B45309", text: "Will upload when you save" },
  saved: { icon: "bi-check-circle-fill", color: "#15803D", text: "Saved" },
};

export function ObUploadStatus({ state, error }: { state: UploadState; error?: string }) {
  if (error) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.625, mt: 0.75 }}>
        <Box component="i" className="bi bi-exclamation-circle-fill" aria-hidden sx={{ fontSize: 12, color: "#DC2626" }} />
        <Typography sx={{ fontSize: 12, fontWeight: 500, color: "#DC2626" }}>{error}</Typography>
      </Box>
    );
  }

  if (state === "idle") return null;
  const style = STATE_STYLE[state];

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.625, mt: 0.75 }} role="status">
      <Box
        component="i"
        className={style.icon}
        aria-hidden
        sx={{
          fontSize: 12,
          color: style.color,
          animation: state === "uploading" ? "ob-upload-spin 0.9s linear infinite" : "none",
          "@keyframes ob-upload-spin": { to: { transform: "rotate(360deg)" } },
        }}
      />
      <Typography sx={{ fontSize: 12, fontWeight: 500, color: style.color }}>{style.text}</Typography>
    </Box>
  );
}

export default ObUploadStatus;
