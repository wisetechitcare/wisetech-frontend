import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { navIcon } from './navIcons';
import { describe, expect, it, vi } from 'vitest';

const { WrappedDashboardIcon } = vi.hoisted(() => ({
  WrappedDashboardIcon: {
    $$typeof: Symbol.for('react.memo'),
    type: () => null,
    compare: null,
  },
}));

vi.mock('@mui/icons-material/DashboardRounded', () => ({
  // Optimized CommonJS icons can be wrapped in multiple default-export objects.
  default: { default: { default: WrappedDashboardIcon } },
}));

describe('navIcon', () => {
  it('unwraps module namespaces around memoized React icons', () => {
    expect(() =>
      renderToStaticMarkup(createElement(navIcon('bi-grid-1x2')))
    ).not.toThrow();
  });

  it('renders every section icon as a React component', () => {
    const sectionIcons = [
      'bi-grid-1x2',
      'bi-people',
      'bi-person-rolodex',
      'bi-kanban',
      'bi-cart3',
      'bi-cash-coin',
      'bi-house-fill',
      'bi-gear',
    ];

    for (const name of sectionIcons) {
      expect(() =>
        renderToStaticMarkup(createElement(navIcon(name)))
      ).not.toThrow();
    }
  });
});
