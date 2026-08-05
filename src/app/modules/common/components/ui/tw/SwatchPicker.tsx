import React from 'react';
import { KTIcon } from '@metronic/helpers';
import { cn } from './cn';
import { TRIO, type ToneName } from './tokens';

/**
 * IconPicker / TonePicker — the canonical "choose one from a small visual set"
 * controls. Domain-agnostic: nothing here knows what the choice is FOR.
 *
 * Both were first written inline in the FAQ section editor. They are the kind of
 * control that reappears the moment any other feature lets an admin brand a
 * record (project categories, lead statuses, task types all want exactly this),
 * so they live in the kit rather than in one feature.
 *
 * Both render real radio semantics (`role="radiogroup"` + `aria-checked`), so
 * they are operable by keyboard and announce a current selection — an inline
 * grid of `<button>`s does neither.
 *
 * Radius carries the important flag for the same reason the kit's buttons do:
 * Metronic's global Bootstrap rules are unlayered and otherwise win.
 */

export interface IconPickerProps {
    value: string;
    onChange: (icon: string) => void;
    /** Curated glyph names. Verify each exists in the keenicons font — an unknown name renders blank. */
    options: readonly string[];
    /** Accessible name for the group, e.g. "Section icon". */
    label: string;
    size?: number;
    className?: string;
}

export function IconPicker({ value, onChange, options, label, size = 36, className }: IconPickerProps) {
    return (
        <div role="radiogroup" aria-label={label} className={cn('flex flex-wrap gap-1.5', className)}>
            {options.map((icon) => {
                const selected = value === icon;
                return (
                    <button
                        key={icon}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={icon}
                        onClick={() => onChange(icon)}
                        style={{ width: size, height: size }}
                        className={cn(
                            'grid place-items-center rounded-[10px]! border transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]/40',
                            selected
                                ? 'border-[#1E3A8A] bg-[#1E3A8A]/10 text-[#1E3A8A] dark:border-blue-400 dark:text-blue-300'
                                : 'border-[#E6E9EE] text-slate-400 hover:text-slate-700 dark:border-[#30363d] dark:hover:text-slate-200',
                        )}
                    >
                        <KTIcon iconName={icon} className="fs-5" />
                    </button>
                );
            })}
        </div>
    );
}

export interface TonePickerProps {
    value: string;
    onChange: (tone: ToneName) => void;
    /** Defaults to the kit's full palette. */
    options?: readonly ToneName[];
    label: string;
    size?: number;
    className?: string;
}

const ALL_TONES = Object.keys(TRIO) as ToneName[];

export function TonePicker({ value, onChange, options = ALL_TONES, label, size = 36, className }: TonePickerProps) {
    return (
        <div role="radiogroup" aria-label={label} className={cn('flex flex-wrap gap-1.5', className)}>
            {options.map((tone) => {
                const selected = value === tone;
                return (
                    <button
                        key={tone}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={tone}
                        title={tone}
                        onClick={() => onChange(tone)}
                        style={{ width: size, height: size, backgroundColor: TRIO[tone].c }}
                        className={cn(
                            'rounded-[10px]! border-2 transition-transform',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400',
                            selected ? 'scale-110 border-slate-900 dark:border-white' : 'border-transparent',
                        )}
                    >
                        {/* A tick keeps the selection visible without relying on colour
                            alone, which fails WCAG 1.4.1 for colour-blind users. */}
                        {selected && <KTIcon iconName="check" className="fs-7 text-white" />}
                    </button>
                );
            })}
        </div>
    );
}
