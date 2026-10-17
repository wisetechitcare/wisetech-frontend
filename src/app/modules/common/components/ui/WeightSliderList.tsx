import { Box, Stack, Typography, Slider } from '@mui/material';
import { WtTooltip } from './WtTooltip';
import { rebalance, toPercentages, type WeightMap } from '@utils/weightBalancer';

export interface WeightSliderField {
  key: string;
  label: string;
  hint?: string;
}

export interface WeightSliderListProps {
  fields: ReadonlyArray<WeightSliderField>;
  /** Current weights (any non-negative units). Displayed and edited as percentages summing to 100. */
  weights: WeightMap;
  onChange: (next: WeightMap) => void;
  disabled?: boolean;
  /** Intro line under the section title. */
  hint?: string;
}

/**
 * Percentages that always total 100 — shared by recruitment rule-score settings and
 * scorecard criteria (roadmap 2.1 / weightBalancer SSOT).
 */
export function WeightSliderList({
  fields,
  weights,
  onChange,
  disabled = false,
  hint = 'Percentages that total 100. Drag a slider — the others rebalance.',
}: WeightSliderListProps) {
  const percents = toPercentages(
    Object.fromEntries(fields.map((f) => [f.key, Number(weights[f.key]) || 0])),
  );

  const setWeight = (key: string, value: number) => {
    onChange(rebalance(percents, key, value));
  };

  return (
    <Box>
      {hint ? (
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>{hint}</Typography>
      ) : null}
      <Stack spacing={1.5}>
        {fields.map(({ key, label, hint: fieldHint }) => (
          <Box key={key}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
              {fieldHint ? (
                <WtTooltip title={fieldHint}>
                  <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{label}</Typography>
                </WtTooltip>
              ) : (
                <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{label}</Typography>
              )}
              <Typography sx={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {percents[key] ?? 0}%
              </Typography>
            </Stack>
            <Slider
              size="small"
              value={percents[key] ?? 0}
              onChange={(_, v) => setWeight(key, v as number)}
              min={0}
              max={100}
              step={1}
              disabled={disabled || fields.length < 2}
            />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

export default WeightSliderList;
