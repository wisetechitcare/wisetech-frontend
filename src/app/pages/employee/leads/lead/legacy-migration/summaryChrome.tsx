import { Box, Stack, Typography } from '@mui/material';
import { tonePair, type SemanticTone } from '@app/theme/tokens';

/**
 * The three pieces every step of this wizard needs to state a number.
 *
 * Analysis, confirmation and result were each rendering the same idea — a count with
 * a name under it — through `StatTile`, which gives every figure the same box, the
 * same icon and the same weight. That is what made all three screens read as a row of
 * interchangeable widgets with no argument: "Total records 35" shouting as loudly as
 * "Duplicate rows 0". These are deliberately unboxed, so hierarchy comes from size
 * and colour and the surface around them can say what kind of screen it is.
 */

/** Tabular figures, so numbers stacked in a column line up on the digit. */
export const NUM = { fontVariantNumeric: 'tabular-nums' as const };

/** Section labels: small, spaced, quiet. Never a heading competing with a figure. */
export const MICRO = {
  fontSize: 10.5,
  fontWeight: 800,
  letterSpacing: '.08em',
  textTransform: 'uppercase' as const,
  color: 'text.secondary',
};

/**
 * A number set into a sentence rather than beside it.
 *
 * Both of these screens had the count twice: a headline reading "2 leads are now up to
 * date" with a 44px "2 / LEADS UPDATED" block directly beneath it. The figure block
 * was the whole card, and it said nothing the sentence had not. Weight and tone give
 * the numeral its emphasis in place, so the sentence stays one object.
 */
export function Count({ value, tone }: { value: number; tone: SemanticTone }) {
  return (
    <Box component="span" sx={{ fontWeight: 800, color: tonePair(tone).fg, ...NUM }}>
      {value}
    </Box>
  );
}

/** "Area, Total Cost and Rate" — an Oxford-comma-free list a person would say aloud. */
export const listSentence = (names: string[]): string =>
  names.length <= 1 ? names[0] ?? '' : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/**
 * The fields a set of rows would write.
 *
 * Draws bars ONLY when the counts differ. A confirmation for two approved rows lists
 * six fields that all read "2 of 2" — six bars of identical length, comparing nothing,
 * and six copies of the same numeral. That is a sentence wearing a chart's clothes, so
 * when there is nothing to compare this says it in one line instead.
 */
export function FieldList({
  entries,
  labelFor,
  limit = 8,
  tone = 'warning',
}: {
  entries: [string, number][];
  labelFor: (field: string) => string;
  limit?: number;
  tone?: SemanticTone;
}) {
  if (entries.length === 0) return null;

  const names = entries.map(([field]) => labelFor(field));
  if (new Set(entries.map(([, count]) => count)).size === 1) {
    return (
      <Typography sx={{ fontSize: 13.5, color: 'text.primary', lineHeight: 1.6 }}>
        {listSentence(names)}
      </Typography>
    );
  }

  const max = Math.max(...entries.map(([, count]) => count));
  return (
    <Stack spacing={1}>
      {entries.slice(0, limit).map(([field, count]) => (
        <Stack key={field} direction="row" spacing={1.5} alignItems="center">
          <Typography sx={{ fontSize: 13, color: 'text.primary', flex: 1, minWidth: 0 }} noWrap>
            {labelFor(field)}
          </Typography>
          <Box sx={{ width: { xs: 60, sm: 92 }, height: 6, borderRadius: 999, bgcolor: 'action.hover', flex: 'none' }}>
            <Box
              sx={{
                width: `${Math.max(4, (count / max) * 100)}%`,
                height: '100%',
                borderRadius: 999,
                bgcolor: tonePair(tone).fg,
              }}
            />
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, width: 28, textAlign: 'right', flex: 'none', ...NUM }}>
            {count}
          </Typography>
        </Stack>
      ))}
      {entries.length > limit && (
        <Typography sx={{ fontSize: 12, color: 'text.disabled', pt: 0.25 }}>
          and {entries.length - limit} more
        </Typography>
      )}
    </Stack>
  );
}
