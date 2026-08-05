import React from 'react';
import { Box } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { TRIO } from './patterns';

/**
 * IconPicker / TonePicker — the canonical "choose one from a small visual set"
 * controls. Domain-agnostic: nothing here knows what the choice is FOR.
 *
 * Both were first written inline in the FAQ section editor. They are the kind of
 * control that reappears the moment any other feature lets an admin brand a
 * record — project categories, lead statuses and task types all want exactly
 * this — so they live in the kit rather than in one feature.
 *
 * Both render real radio semantics (`role="radiogroup"` + `aria-checked`), so
 * they are operable by keyboard and announce a current selection. An inline grid
 * of plain `<button>`s does neither.
 */

/** The kit's tone names, derived from TRIO so the two can never drift. */
export type ToneName = keyof typeof TRIO;

export const TONE_NAMES = Object.keys(TRIO) as ToneName[];

export interface IconPickerProps {
    value: string;
    onChange: (icon: string) => void;
    /** Curated glyph names. Verify each exists in the keenicons font — an unknown name renders blank. */
    options: readonly string[];
    /** Accessible name for the group, e.g. "Section icon". */
    label: string;
    size?: number;
}

export function IconPicker({ value, onChange, options, label, size = 36 }: IconPickerProps) {
    return (
        <Box role="radiogroup" aria-label={label} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {options.map((icon) => {
                const selected = value === icon;
                return (
                    <Box
                        key={icon}
                        component="button"
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={icon}
                        onClick={() => onChange(icon)}
                        sx={{
                            width: size,
                            height: size,
                            display: 'grid',
                            placeItems: 'center',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'background-color .15s, border-color .15s, color .15s',
                            border: '1px solid',
                            borderColor: selected ? 'primary.main' : 'divider',
                            bgcolor: selected ? 'primary.main' : 'transparent',
                            color: selected ? 'primary.contrastText' : 'text.disabled',
                            '&:hover': { color: selected ? 'primary.contrastText' : 'text.primary' },
                            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                        }}
                    >
                        <KTIcon iconName={icon} className="fs-5" />
                    </Box>
                );
            })}
        </Box>
    );
}

export interface TonePickerProps {
    value: string;
    onChange: (tone: ToneName) => void;
    /** Defaults to the kit's full palette. */
    options?: readonly ToneName[];
    label: string;
    size?: number;
}

export function TonePicker({ value, onChange, options = TONE_NAMES, label, size = 36 }: TonePickerProps) {
    return (
        <Box role="radiogroup" aria-label={label} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {options.map((tone) => {
                const selected = value === tone;
                return (
                    <Box
                        key={tone}
                        component="button"
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={tone}
                        title={tone}
                        onClick={() => onChange(tone)}
                        sx={{
                            width: size,
                            height: size,
                            display: 'grid',
                            placeItems: 'center',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            bgcolor: TRIO[tone].c,
                            color: '#fff',
                            border: '2px solid',
                            borderColor: selected ? 'text.primary' : 'transparent',
                            transform: selected ? 'scale(1.08)' : 'none',
                            transition: 'transform .15s, border-color .15s',
                            '&:focus-visible': { outline: '2px solid', outlineColor: 'text.primary', outlineOffset: 2 },
                        }}
                    >
                        {/* A tick keeps the selection visible without relying on colour
                            alone, which fails WCAG 1.4.1 for colour-blind users. */}
                        {selected && <KTIcon iconName="check" className="fs-7" />}
                    </Box>
                );
            })}
        </Box>
    );
}
