// @vitest-environment jsdom
import { describe, test, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MasterListSection } from '../MasterListSection';
import { TRIO } from '../patterns';

vi.mock('../feedback', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../feedback')>()),
  toast: vi.fn(),
  confirmDialog: vi.fn(async () => true),
}));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('MasterListSection', () => {
  test('empty state offers New and opens the create dialog', async () => {
    const fetchEmpty = vi.fn(async () => []);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MasterListSection
          title="Pipeline Stages"
          description="Stages candidates move through."
          biIcon="bi-diagram-3"
          icon="chart-simple"
          tone={TRIO.blue}
          queryKey={['test-masters']}
          labelField="name"
          fetchFn={fetchEmpty}
          createFn={async () => ({})}
          updateFn={async () => ({})}
          deleteFn={async () => ({})}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('No Pipeline Stage Yet')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /new pipeline stage/i }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(screen.getByRole('button', { name: /^save$/i })).toBeTruthy();
  });
});
