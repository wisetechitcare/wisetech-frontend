/* Writes .eslint-icon-baseline.cjs (the icon ratchet list) through the generic generator.
 * Kept as its own entry point so `pnpm run lint:icons:baseline` is unchanged. Only ever re-run to SHRINK the list. */
const path = require('path');
const { spawnSync } = require('child_process');

const run = spawnSync(
  process.execPath,
  [
    path.join(__dirname, 'gen-rule-baseline.cjs'),
    'wisetech/no-legacy-icons',
    '.eslint-icon-baseline.cjs',
    'icon',
    '--script=lint:icons:baseline',
    '--what=used a legacy icon form (KTIcon, AppIcon, bi-/fa-/la-/ki-\n * classes, @mui/icons-material, other icon libraries)',
    '--note=Separate from .eslint-ui-baseline.cjs on purpose (that list carries unrelated bans).',
    '--fixed=its icons are converted',
    '--slug=legacy-icons',
  ],
  { stdio: 'inherit' },
);
process.exit(run.status ?? 1);
