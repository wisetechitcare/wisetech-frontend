// @vitest-environment node
import { describe, it } from 'vitest';
import { createRequire } from 'node:module';
import { RuleTester } from 'eslint';

const require = createRequire(import.meta.url);
const rule = require('./no-legacy-icons.cjs');

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
});

const bad = (code: string) => ({ code, errors: 1 });

tester.run('no-legacy-icons', rule, {
  valid: [
    "import { Calendar } from 'lucide-react';",
    '<DynamicIcon name="setting-2" />',
    '<div className="biome" />',
    '<div className="fade" />',
    '<div className="table-light" />',
    '<div className="label" />',
    '<div className="fab-button" />',
    '<div className="kit-card" />',
    '<div className="display-6" />',
    'const x = { icon: Receipt };',
    "const x = { title: 'bi bi-pencil' };",
    "import { KTIconFoo } from './foo';",
  ],
  invalid: [
    bad("import { Close } from '@mui/icons-material';"),
    bad("import X from '@mui/icons-material/Close';"),
    bad("import { KTIcon } from '@metronic/helpers';"),
    bad("import { KTSVG } from '@metronic/helpers';"),
    bad("import { AppIcon } from '@app/modules/common/components/ui';"),
    bad("import AppIcon from '@app/modules/common/components/ui/AppIcon';"),
    bad("import 'iconsax-reactjs';"),
    bad("import SVG from 'react-inlinesvg';"),
    bad("import { FaBeer } from 'react-icons/fa';"),
    bad("import { faCoffee } from '@fortawesome/free-solid-svg-icons';"),
    bad("import 'bootstrap-icons/font/bootstrap-icons.css';"),
    bad("import 'line-awesome/dist/css/line-awesome.css';"),
    bad('<i className="bi bi-pencil" />'),
    bad('<i className="fa-solid fa-gear" />'),
    bad('<i className="fas fa-x" />'),
    bad('<i className="la la-file" />'),
    bad('<i className="ki-duotone ki-user" />'),
    bad("const x = { icon: 'bi-receipt' };"),
    bad("const x = { iconName: 'ki-user' };"),
    bad('<X icon="bi-tag" />'),
    bad('<X iconName="la-file" />'),
    bad('<i className={`me-2 bi bi-${n}`} />'),
    bad("<i className={on ? 'bi bi-x' : ''} />"),
  ],
});
