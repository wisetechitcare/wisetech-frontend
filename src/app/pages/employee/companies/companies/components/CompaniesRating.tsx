import { useEffect, useState } from "react";
import { Box, Rating, Stack, Typography } from "@mui/material";
import { updateCompanyRating } from "@services/companies";
import { getRatingByCompanyId } from "@services/projects";
import { canSection } from "@utils/can";
import { useCountUp } from "@app/hooks/useCountUp";
import Loader from "@app/modules/common/utils/Loader";
import { DetailCard } from "@app/modules/detail-page/DetailPageComponents";
import { AppIcon, GlassDialog, PlainDialogHeader, ToneChip, WtButton, WtEmptyState } from "@app/modules/common/components/ui";

export const MAX_RATING = 10;

export interface RatingFactor {
  id: string;
  name: string;
  rating: number;
  weight: string;
  color: string;
}

/** Weighted average of the factor ratings, 0–10. The ONE place this is computed (header, tab, dialog). */
export const weightedRating = (factors: RatingFactor[], ratings?: Record<string, number>): number => {
  const totalWeight = factors.reduce((t, f) => t + Number(f.weight || 0), 0);
  if (!totalWeight) return 0;
  return factors.reduce((t, f) => t + (ratings ? ratings[f.id] ?? 0 : f.rating || 0) * Number(f.weight || 0), 0) / totalWeight;
};

/** What a score means, in words — a number alone does not say whether 6.2 is good. */
export const ratingBand = (score: number): { label: string; tone: "success" | "brand" | "warning" | "danger" | "neutral" } =>
  score <= 0 ? { label: "Not rated", tone: "neutral" }
    : score >= 8 ? { label: "Excellent", tone: "success" }
    : score >= 6 ? { label: "Good", tone: "brand" }
    : score >= 4 ? { label: "Fair", tone: "warning" }
    : { label: "Poor", tone: "danger" };

const REDUCED = "@media (prefers-reduced-motion: reduce)";
/** True one frame after mount, so CSS transitions have a "from" state to animate out of. */
const useEntered = () => {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return entered;
};

/** The overall score as a ring that sweeps to its value while the number counts up. */
export const ScoreRing = ({ score, size = 132 }: { score: number; size?: number }) => {
  const shown = useCountUp(score);
  const entered = useEntered();
  const stroke = Math.round(size * 0.085);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - (entered ? score : 0) / MAX_RATING);
  return (
    <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <Box component="svg" width={size} height={size} sx={{ transform: "rotate(-90deg)" }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="currentColor" opacity={0.1} />
        <Box
          component="circle"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="#F5A623"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          sx={{ transition: "stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)", [REDUCED]: { transition: "none" } }}
        />
      </Box>
      <Stack alignItems="center" justifyContent="center" sx={{ position: "absolute", inset: 0 }}>
        <Typography sx={{ fontFamily: "Barlow", fontWeight: 700, fontSize: size * 0.27, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {shown.toFixed(1)}
        </Typography>
        <Typography sx={{ fontSize: size * 0.095, color: "text.secondary", fontWeight: 600 }}>out of {MAX_RATING}</Typography>
      </Stack>
    </Box>
  );
};

/** One factor's score as ten segments that fill left to right, staggered by row. */
const FactorMeter = ({ factor, row }: { factor: RatingFactor; row: number }) => {
  const entered = useEntered();
  const value = factor.rating || 0;
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr auto", sm: "minmax(140px, 220px) 1fr auto" }, alignItems: "center", gap: { xs: 1, sm: 2 }, py: 1.25 }}>
      <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 600 }}>{factor.name}</Typography>
        {Number(factor.weight) !== 1 && (
          <Typography component="span" sx={{ fontSize: 11, color: "text.secondary", fontWeight: 600, flexShrink: 0 }} title="Weight in the overall score">
            ×{Number(factor.weight)}
          </Typography>
        )}
      </Stack>
      <Box sx={{ display: "flex", gap: "3px", gridColumn: { xs: "1 / -1", sm: "auto" }, gridRow: { xs: 2, sm: "auto" } }} aria-hidden>
        {Array.from({ length: MAX_RATING }).map((_, i) => {
          const on = entered && i < value;
          return (
            <Box
              key={i}
              sx={{
                flex: 1,
                height: 10,
                borderRadius: "3px",
                bgcolor: on ? factor.color : "action.hover",
                transform: on ? "scaleY(1)" : "scaleY(0.6)",
                transition: "background-color 260ms ease, transform 260ms cubic-bezier(.34,1.56,.64,1)",
                transitionDelay: `${row * 70 + i * 35}ms`,
                [REDUCED]: { transition: "none" },
              }}
            />
          );
        })}
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", minWidth: 40, textAlign: "right" }}>
        {value}<Box component="span" sx={{ color: "text.secondary", fontWeight: 500 }}>/{MAX_RATING}</Box>
      </Typography>
    </Box>
  );
};

const CompaniesRating = ({ companyId, companyName, onRatingChange }: { companyId: string; companyName?: string; onRatingChange?: (value: number) => void }) => {
  const canWrite = canSection("crm.companies", "write");
  const [factors, setFactors] = useState<RatingFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, number> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Bumped after a save so the ring and meters replay their fill for the new values.
  const [revision, setRevision] = useState(0);

  const fetchFactors = async () => {
    try {
      const response = await getRatingByCompanyId(companyId);
      setFactors(response?.data?.companyRating || []);
      setError(null);
    } catch (e) {
      console.error("Error fetching rating factors:", e);
      setError("Couldn't load the rating factors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const score = weightedRating(factors);
  // Only once loaded: an empty factor list scores 0, which would blank the header's score.
  useEffect(() => {
    if (!loading) onRatingChange?.(score);
  }, [loading, score, onRatingChange]);

  const handleSave = async () => {
    if (!editing) return;
    setSubmitting(true);
    try {
      await Promise.all(Object.entries(editing).map(([factorId, rating]) => updateCompanyRating({ companyId, factorId, rating })));
      await fetchFactors();
      setRevision((r) => r + 1);
      setEditing(null);
    } catch (e) {
      console.error("Error updating ratings:", e);
      setError("Couldn't save the ratings. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;
  if (error && !factors.length) return <WtEmptyState variant="error" title="Rating unavailable" hint={error} actionLabel="Try again" onAction={fetchFactors} />;

  const band = ratingBand(score);
  const rated = factors.filter((f) => (f.rating || 0) > 0).length;

  return (
    <>
      <DetailCard
        title="Company Rating"
        subtitle={`Weighted across ${factors.length} factor${factors.length === 1 ? "" : "s"}`}
        icon="bi bi-star"
        accentColor="amber"
        actions={canWrite && factors.length > 0 ? (
          <WtButton
            size="small"
            onClick={() => setEditing(Object.fromEntries(factors.map((f) => [f.id, f.rating || 0])))}
            startIcon={<AppIcon name="pencil" className="fs-6" />}
          >
            {rated ? "Edit rating" : "Rate company"}
          </WtButton>
        ) : undefined}
      >
        {!factors.length ? (
          <WtEmptyState title="No rating factors yet" hint="Rating factors are set up in CRM configuration. Once they exist, this company can be rated against them." />
        ) : (
          <Box key={revision} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "auto 1fr" }, gap: { xs: 3, md: 5 }, alignItems: "center", py: 2.5 }}>
            <Stack alignItems="center" gap={1.25} sx={{ px: { md: 2 } }}>
              <ScoreRing score={score} />
              <ToneChip tone={band.tone} label={band.label} />
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                {rated} of {factors.length} factors rated
              </Typography>
            </Stack>
            <Box sx={{ minWidth: 0, "& > * + *": { borderTop: 1, borderColor: "divider" } }}>
              {factors.map((f, i) => <FactorMeter key={f.id} factor={f} row={i} />)}
            </Box>
          </Box>
        )}
      </DetailCard>

      <GlassDialog
        open={!!editing}
        onClose={() => !submitting && setEditing(null)}
        maxWidth="sm"
        header={
          <PlainDialogHeader
            title={`Rate ${companyName || "company"}`}
            subtitle="Score each factor out of 10. The total is weighted."
            onClose={() => !submitting && setEditing(null)}
          />
        }
      >
        {editing && (
          <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
            {factors.map((f) => (
              <Stack key={f.id} direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" gap={0.5} sx={{ py: 1.25, borderBottom: 1, borderColor: "divider" }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
                  {f.name}
                  {Number(f.weight) !== 1 && <Box component="span" sx={{ ml: 0.75, fontSize: 11, color: "text.secondary" }}>×{Number(f.weight)}</Box>}
                </Typography>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Rating
                    max={MAX_RATING}
                    value={editing[f.id] ?? 0}
                    onChange={(_, v) => setEditing((prev) => ({ ...prev!, [f.id]: v ?? 0 }))}
                    size="small"
                    sx={{ "& .MuiRating-iconFilled, & .MuiRating-iconHover": { color: f.color }, "& .MuiRating-icon": { transition: "transform 160ms ease" } }}
                    getLabelText={(v) => `${v} of ${MAX_RATING}`}
                  />
                  <Typography sx={{ fontSize: 13, fontWeight: 700, minWidth: 24, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{editing[f.id] ?? 0}</Typography>
                </Stack>
              </Stack>
            ))}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pt: 2 }}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>Total</Typography>
                <Typography sx={{ fontFamily: "Barlow", fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {weightedRating(factors, editing).toFixed(1)}
                  <Box component="span" sx={{ fontSize: 13, color: "text.secondary", fontWeight: 600 }}> / {MAX_RATING}</Box>
                </Typography>
                <ToneChip dense tone={ratingBand(weightedRating(factors, editing)).tone} label={ratingBand(weightedRating(factors, editing)).label} />
              </Stack>
              <Stack direction="row" gap={1}>
                <WtButton inverted onClick={() => setEditing(null)} disabled={submitting}>Cancel</WtButton>
                <WtButton onClick={handleSave} disabled={submitting}>{submitting ? "Saving…" : "Save rating"}</WtButton>
              </Stack>
            </Stack>
            {error && <Typography sx={{ mt: 1.5, fontSize: 12.5, color: "error.main" }}>{error}</Typography>}
          </Box>
        )}
      </GlassDialog>
    </>
  );
};

export default CompaniesRating;
