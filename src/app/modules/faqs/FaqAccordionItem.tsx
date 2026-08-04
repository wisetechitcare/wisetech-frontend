import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { KTIcon } from '@metronic/helpers';
import type { Faq } from './types';

/**
 * Renders an answer as paragraphs or a bullet list.
 *
 * Plain text only — deliberately never `dangerouslySetInnerHTML`. FAQ content
 * is authored by admins through the app, but rendering it as HTML would turn
 * an admin-authored string into a stored-XSS vector for every employee who
 * opens the page. If rich text is ever wanted, sanitise server-side first.
 */
function useRenderedAnswer(answer: string) {
    return useMemo(() => {
        const lines = answer.split('\n').map((line) => line.trim()).filter(Boolean);
        if (lines.length <= 1) return { kind: 'text' as const, lines: [answer] };
        const bulleted = lines.some((line) => /^[-*•]|^\d+[.)]/.test(line));
        return {
            kind: bulleted ? ('bullets' as const) : ('paragraphs' as const),
            lines: bulleted
                ? lines.map((line) => line.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, ''))
                : lines,
        };
    }, [answer]);
}

export interface FaqAccordionItemProps {
    faq: Faq;
    /** Substring to highlight, e.g. the active search term. */
    highlight?: string;
    onEdit?: (faq: Faq) => void;
    onDelete?: (faq: Faq) => void;
}

/** Wraps matches in <mark> without dangerouslySetInnerHTML. */
function Highlighted({ text, needle }: { text: string; needle?: string }) {
    const parts = useMemo(() => {
        const term = needle?.trim();
        if (!term) return [text];
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.split(new RegExp(`(${escaped})`, 'ig'));
    }, [text, needle]);

    if (parts.length === 1) return <>{text}</>;
    const lower = needle?.trim().toLowerCase();
    return (
        <>
            {parts.map((part, index) =>
                part.toLowerCase() === lower ? (
                    <mark key={index} className="rounded bg-amber-200/70 px-0.5 text-inherit dark:bg-amber-400/25">
                        {part}
                    </mark>
                ) : (
                    <span key={index}>{part}</span>
                ),
            )}
        </>
    );
}

/**
 * One expandable question. Accessibility is the point of this component:
 * the trigger is a real <button> with aria-expanded/aria-controls, and the
 * collapsed panel is marked `inert` so it leaves the tab order and the
 * accessibility tree entirely (WCAG 2.4.3 / 4.1.2) rather than merely being
 * clipped to zero height.
 */
export function FaqAccordionItem({ faq, highlight, onEdit, onDelete }: FaqAccordionItemProps) {
    const [expanded, setExpanded] = useState(false);
    const panelId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const rendered = useRenderedAnswer(faq.answer);

    useEffect(() => {
        const element = panelRef.current;
        if (element) (element as unknown as { inert: boolean }).inert = !expanded;
    }, [expanded]);

    return (
        <div className="group rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
            <div className="flex items-start gap-2">
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    className="flex min-w-0 flex-1 items-start gap-2.5 bg-transparent p-0 text-left"
                >
                    {/* Rotated on a wrapper span: KTIcon owns its own className
                        for font sizing, so transforms live outside it. */}
                    <span
                        aria-hidden="true"
                        className={`mt-0.5 grid shrink-0 place-items-center text-slate-400 transition-transform duration-200 ${
                            expanded ? 'rotate-90' : 'rotate-0'
                        }`}
                    >
                        <KTIcon iconName="arrow-right" className="fs-7" />
                    </span>
                    <span className="min-w-0 flex-1 text-[14px] font-semibold leading-snug text-slate-900 dark:text-slate-100">
                        <Highlighted text={faq.question} needle={highlight} />
                    </span>
                </button>

                {(onEdit || onDelete) && (
                    <div className="flex shrink-0 gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        {onEdit && (
                            <button
                                type="button"
                                onClick={() => onEdit(faq)}
                                aria-label={`Edit question: ${faq.question}`}
                                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
                            >
                                <KTIcon iconName="pencil" className="fs-6" />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                type="button"
                                onClick={() => onDelete(faq)}
                                aria-label={`Delete question: ${faq.question}`}
                                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-400"
                            >
                                <KTIcon iconName="trash" className="fs-6" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* grid-rows 0fr→1fr gives a height animation without measuring the DOM */}
            <div
                id={panelId}
                ref={panelRef}
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
            >
                <div className="overflow-hidden">
                    <div className="pl-[26px] pr-1 pt-2 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                        {rendered.kind === 'bullets' ? (
                            <ul className="m-0 flex list-disc flex-col gap-1 pl-4">
                                {rendered.lines.map((line, index) => (
                                    <li key={index}>
                                        <Highlighted text={line} needle={highlight} />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {rendered.lines.map((line, index) => (
                                    <p key={index} className="m-0">
                                        <Highlighted text={line} needle={highlight} />
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FaqAccordionItem;
