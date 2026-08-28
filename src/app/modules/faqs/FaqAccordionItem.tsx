import { useId, useMemo, useState } from 'react';
import { Box, Collapse, Stack, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { TRIO, WtIconButton } from '@app/modules/common/components/ui';
import type { Faq } from './types';

/**
 * Splits an answer into paragraphs or bullets.
 *
 * Plain text only — deliberately never `dangerouslySetInnerHTML`. FAQ content is
 * authored by admins through the app, but rendering it as HTML would turn an
 * admin-authored string into a stored-XSS vector for every employee who opens
 * the page. If rich text is ever wanted, sanitise server-side first.
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
                    <Box
                        key={index}
                        component="mark"
                        sx={{ px: '2px', borderRadius: '3px', bgcolor: 'warning.light', color: 'inherit' }}
                    >
                        {part}
                    </Box>
                ) : (
                    <span key={index}>{part}</span>
                ),
            )}
        </>
    );
}

export interface FaqAccordionItemProps {
    faq: Faq;
    /** Substring to highlight, e.g. the active search term. */
    highlight?: string;
    onEdit?: (faq: Faq) => void;
    onDelete?: (faq: Faq) => void;
}

/**
 * One expandable question.
 *
 * Accessibility is the point of this component: the trigger is a real button
 * with aria-expanded/aria-controls, and the collapsed panel is unmounted rather
 * than merely clipped, so it leaves the tab order and the accessibility tree
 * entirely (WCAG 2.4.3 / 4.1.2). MUI's `Collapse` gives the height animation
 * without measuring the DOM by hand.
 */
export function FaqAccordionItem({ faq, highlight, onEdit, onDelete }: FaqAccordionItemProps) {
    const [expanded, setExpanded] = useState(false);
    const panelId = useId();
    const rendered = useRenderedAnswer(faq.answer);
    const showActions = Boolean(onEdit || onDelete);

    return (
        <Box
            sx={{
                px: 1.25,
                py: 1,
                borderRadius: '12px',
                transition: 'background-color .15s',
                '&:hover': { bgcolor: 'action.hover' },
                // Actions stay hidden until the row is hovered or focused, so a
                // long list reads as content rather than a wall of buttons — but
                // they are always visible on touch, where there is no hover.
                '&:hover .faq-row-actions, &:focus-within .faq-row-actions': { opacity: 1 },
                '@media (hover: none)': { '& .faq-row-actions': { opacity: 1 } },
            }}
        >
            <Stack direction="row" alignItems="flex-start" spacing={1}>
                <Box
                    component="button"
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.25,
                        p: 0,
                        border: 0,
                        bgcolor: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        font: 'inherit',
                        color: 'inherit',
                    }}
                >
                    <Box
                        aria-hidden
                        sx={{
                            mt: '2px',
                            flexShrink: 0,
                            display: 'grid',
                            placeItems: 'center',
                            color: 'text.disabled',
                            transition: 'transform .2s',
                            transform: expanded ? 'rotate(90deg)' : 'none',
                        }}
                    >
                        <KTIcon iconName="arrow-right" className="fs-7" />
                    </Box>

                    <Typography sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: 'text.primary' }}>
                        <Highlighted text={faq.question} needle={highlight} />
                    </Typography>
                </Box>

                {showActions && (
                    <Stack
                        className="faq-row-actions"
                        direction="row"
                        spacing={0.5}
                        sx={{ flexShrink: 0, opacity: 0, transition: 'opacity .15s' }}
                    >
                        {onEdit && (
                            <WtIconButton
                                title="Edit question"
                                color={TRIO.blue.c}
                                sx={{ width: 30, height: 30, borderRadius: '9px' }}
                                onClick={() => onEdit(faq)}
                            >
                                <KTIcon iconName="pencil" className="fs-7" />
                            </WtIconButton>
                        )}
                        {onDelete && (
                            <WtIconButton
                                title="Delete question"
                                color={TRIO.rose.c}
                                sx={{ width: 30, height: 30, borderRadius: '9px' }}
                                onClick={() => onDelete(faq)}
                            >
                                <KTIcon iconName="trash" className="fs-7" />
                            </WtIconButton>
                        )}
                    </Stack>
                )}
            </Stack>

            <Collapse in={expanded} timeout={200} unmountOnExit>
                <Box id={panelId} sx={{ pl: '26px', pr: 1, pt: 1 }}>
                    {rendered.kind === 'bullets' ? (
                        <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {rendered.lines.map((line, index) => (
                                <Typography
                                    key={index}
                                    component="li"
                                    sx={{ fontSize: 13.5, lineHeight: 1.65, color: 'text.secondary' }}
                                >
                                    <Highlighted text={line} needle={highlight} />
                                </Typography>
                            ))}
                        </Box>
                    ) : (
                        <Stack spacing={1}>
                            {rendered.lines.map((line, index) => (
                                <Typography
                                    key={index}
                                    sx={{ fontSize: 13.5, lineHeight: 1.65, color: 'text.secondary' }}
                                >
                                    <Highlighted text={line} needle={highlight} />
                                </Typography>
                            ))}
                        </Stack>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
}

export default FaqAccordionItem;
