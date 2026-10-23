// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { DetailCard, DetailGrid, KeyValueList, KeyValueRow, SectionDivider } from './DetailCard';
import { TRIO } from './patterns';

afterEach(cleanup);

const DASH = String.fromCharCode(0x2014);

const renderIn = (ui: ReactElement, mode: 'light' | 'dark' = 'light') =>
    render(<ThemeProvider theme={createTheme({ palette: { mode } })}>{ui}</ThemeProvider>);

describe('DetailCard', () => {
    test('renders a labelled region with title, subtitle, action and body', () => {
        renderIn(
            <DetailCard
                tone={TRIO.blue}
                icon="profile-circle"
                title="Personal Details"
                subtitle="Who they are"
                action={<button type="button">Edit</button>}
            >
                <p>Body content</p>
            </DetailCard>,
        );
        const region = screen.getByRole('region', { name: 'Personal Details' });
        expect(region.textContent).toContain('Who they are');
        expect(region.textContent).toContain('Body content');
        expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
        // Card titles stay Title Case — the heading must not be uppercased.
        const heading = screen.getByRole('heading', { name: 'Personal Details' });
        expect(getComputedStyle(heading).textTransform).not.toBe('uppercase');
    });

    test('omits the subtitle and action slots when not given', () => {
        renderIn(
            <DetailCard tone={TRIO.green} icon="bank" title="Bank" />,
            'dark',
        );
        const region = screen.getByRole('region', { name: 'Bank' });
        expect(region.querySelectorAll('button')).toHaveLength(0);
        expect(region.textContent).toBe('Bank');
    });
});

describe('KeyValueRow', () => {
    test('renders label and value', () => {
        renderIn(<KeyValueRow label="Gender" value="Female" />);
        expect(screen.getByText('Gender')).toBeTruthy();
        expect(screen.getByText('Female')).toBeTruthy();
    });

    test.each([
        ['null', null],
        ['undefined', undefined],
        ['empty string', ''],
        ['whitespace', '   '],
    ])('renders an em dash for a %s value', (_name, value) => {
        renderIn(<KeyValueRow label="Anniversary" value={value} />);
        expect(screen.getByText(DASH)).toBeTruthy();
    });

    test('keeps zero as a real value', () => {
        renderIn(<KeyValueRow label="Balance" value={0} />);
        expect(screen.getByText('0')).toBeTruthy();
        expect(screen.queryByText(DASH)).toBeNull();
    });
});

describe('KeyValueList', () => {
    test('maps every row and drops the divider on the last one only', () => {
        const { container } = renderIn(
            <KeyValueList
                rows={[
                    { label: 'Basic', value: '10,000' },
                    { label: 'HRA', value: '' },
                    { label: 'Total', value: '15,000', isStrong: true },
                ]}
            />,
        );
        expect(screen.getByText('Basic')).toBeTruthy();
        expect(screen.getByText(DASH)).toBeTruthy();
        const rows = Array.from(container.firstElementChild?.children ?? []) as HTMLElement[];
        expect(rows).toHaveLength(3);
        expect(getComputedStyle(rows[0]).borderBottomStyle).toBe('solid');
        expect(getComputedStyle(rows[2]).borderBottomStyle).not.toBe('solid');
        expect(getComputedStyle(screen.getByText('15,000')).fontWeight).toBe('700');
        expect(getComputedStyle(screen.getByText('10,000')).fontWeight).toBe('500');
    });

    test('renders nothing for an empty list', () => {
        const { container } = renderIn(<KeyValueList rows={[]} />);
        expect(container.firstElementChild?.children).toHaveLength(0);
    });
});

describe('SectionDivider', () => {
    test('renders an uppercase-styled heading label', () => {
        renderIn(<SectionDivider tone={TRIO.purple} icon="briefcase" label="Employment" />, 'dark');
        const heading = screen.getByRole('heading', { name: 'Employment' });
        expect(getComputedStyle(heading).textTransform).toBe('uppercase');
    });
});

describe('DetailGrid', () => {
    test('renders its children in a grid', () => {
        const { container } = renderIn(
            <DetailGrid columns={1}>
                <div>A</div>
                <div>B</div>
            </DetailGrid>,
        );
        const grid = container.firstElementChild as HTMLElement;
        expect(getComputedStyle(grid).display).toBe('grid');
        expect(grid.children).toHaveLength(2);
    });
});
