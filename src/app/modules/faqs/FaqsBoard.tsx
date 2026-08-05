import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KTIcon } from '@metronic/helpers';
import {
    Box, Chip, CircularProgress, Divider, InputAdornment, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
// Same MUI glass kit as the Leave Policy / Sandwich Leave benchmark — one import
// surface, one look. Do not reach past this barrel into individual kit files.
import {
    TRIO, WtButton, WtIconButton, GlassCard, GlassSurface,
    SettingsSection, IconBox, confirmDialog, toast,
} from '@app/modules/common/components/ui';
import { toCompanyIdParam, useOrgScope } from '@hooks/useOrgScope';
import { FaqAccordionItem } from './FaqAccordionItem';
import { FaqEditorDialog } from './FaqEditorDialog';
import { useFaqs } from './useFaqs';
import { FaqSectionManagerDialog } from './FaqSectionManagerDialog';
import { resolveIcon, resolveSectionKey, resolveTone, type Faq, type FaqSection } from './types';

export interface FaqsBoardProps {
    /**
     * Restrict the board to a single section. Accepts legacy keys
     * (`leaveAttendance`, `loan`) which are mapped to real FAQ types.
     * Omit for the full multi-section board.
     */
    type?: string;
    /** Show create/edit/delete affordances. The API enforces this independently. */
    canManage?: boolean;
    /** Hide the page-level heading when embedding inside a tab that already has one. */
    embedded?: boolean;
}

/**
 * THE FAQ surface. One component behind every FAQ screen in the app.
 *
 * It replaces two parallel implementations (11 files, ~1,600 lines) that had
 * drifted apart: different response shapes, different sort orders, different
 * modals, different permission logic, and no shared realtime. Every mount
 * point now renders this, so a change lands everywhere at once.
 *
 * Layout: a sticky section rail on desktop and a horizontal chip row on
 * mobile, beside a single scrolling column of section cards. Content is capped
 * at a readable measure and centred rather than stretched edge-to-edge, which
 * is what made the previous board feel empty on wide screens.
 */
export function FaqsBoard({ type, canManage = false, embedded = false }: FaqsBoardProps) {
    const sectionType = resolveSectionKey(type);
    // Shared org filter — same hook, control and option order any other
    // company-scoped screen would use.
    const { scopeId, setScopeId, selectOptions, hasChoice } = useOrgScope();
    const {
        sections,
        totalCount,
        matchCount,
        search,
        setSearch,
        isLoading,
        isError,
        refetch,
        createFaq,
        updateFaq,
        deleteFaq,
        isSaving,
    } = useFaqs({ type: sectionType, scopeId: toCompanyIdParam(scopeId) });

    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [editor, setEditor] = useState<{ section: FaqSection; faq: Faq | null } | null>(null);
    const [managingSections, setManagingSections] = useState(false);
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

    const showRail = !sectionType && sections.length > 1;

    /**
     * Sticky offsets.
     *
     * The app shell's tab bar (MaterialHeaderTab) is itself sticky: 44px tall,
     * pinned at top:0 up to 1024px and at top:74px above it. Anything of ours
     * that sticks must clear it — the section rail used to stick at top-2 (8px),
     * i.e. *underneath* the bar, which is why it looked like it vanished on
     * scroll rather than staying put. `--faq-shell` is that clearance.
     *
     * `--faq-head` is the live height of our own sticky header, measured rather
     * than hardcoded because it reflows (the title/action row stacks on mobile,
     * and the header is hidden entirely when embedded). The rail and the
     * scroll-to-section anchors both offset by it, so nothing lands underneath.
     */
    const rootRef = useRef<HTMLDivElement>(null);
    const stickyHeadRef = useRef<HTMLDivElement>(null);
    const [stickyOffset, setStickyOffset] = useState(0);

    useEffect(() => {
        const root = rootRef.current;
        const head = stickyHeadRef.current;
        if (!root || !head) return;

        const sync = () => {
            const shell = window.innerWidth > 1024 ? 118 : 44;
            const height = head.offsetHeight;
            root.style.setProperty('--faq-head', `${height}px`);
            setStickyOffset(shell + height);
        };

        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(head);
        window.addEventListener('resize', sync);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', sync);
        };
    }, [showRail, embedded]);

    /**
     * Scroll-spy via IntersectionObserver — the platform's own primitive.
     * The previous board hand-rolled this with a rAF loop calling
     * getBoundingClientRect on every section on every scroll event, which
     * forces synchronous layout each frame. This does the same job off the
     * main thread with no layout thrash.
     */
    useEffect(() => {
        if (!showRail) return;
        const elements = sections
            .map((section) => sectionRefs.current[section.id])
            .filter((element): element is HTMLElement => Boolean(element));
        if (!elements.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
                if (visible?.target instanceof HTMLElement) {
                    const id = visible.target.dataset.sectionId;
                    if (id) setActiveSection(id);
                }
            },
            // Top margin tracks the real sticky stack (shell bar + our header),
            // so a section counts as "current" when it clears the header rather
            // than when it slides underneath it.
            { rootMargin: `-${stickyOffset + 8}px 0px -60% 0px`, threshold: 0 },
        );

        elements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, [sections, showRail, stickyOffset]);

    /**
     * The section the header's "Add question" files into.
     *
     * It used to be `sections[0]`, so the dialog always said "Attendance" no
     * matter what you were reading — the button lied about where the question
     * would land. This follows the scroll-spy / rail selection, so the action
     * matches the section in view. Falls back to the first section before the
     * observer has reported anything (page not yet scrolled).
     */
    const targetSection = useMemo(
        () => sections.find((section) => section.id === activeSection) ?? sections[0],
        [sections, activeSection],
    );

    const scrollToSection = useCallback((id: string) => {
        setActiveSection(id);
        sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    const handleDelete = useCallback(
        async (faq: Faq) => {
            const confirmed = await confirmDialog({
                title: 'Delete this question?',
                text: faq.question,
                confirmText: 'Delete',
                danger: true,
            });
            if (!confirmed) return;
            try {
                await deleteFaq(faq.id);
                toast({ title: 'Question deleted', icon: 'success' });
            } catch {
                toast({ title: 'Could not delete the question', icon: 'error' });
            }
        },
        [deleteFaq],
    );

    const handleSave = useCallback(
        async (values: { question: string; answer: string }) => {
            if (!editor) return;
            try {
                if (editor.faq) {
                    await updateFaq({ id: editor.faq.id, ...values });
                    toast({ title: 'Question updated', icon: 'success' });
                } else {
                    await createFaq({ ...values, categoryId: editor.section.categoryId });
                    toast({ title: 'Question added', icon: 'success' });
                }
                setEditor(null);
            } catch {
                toast({ title: 'Could not save the question', icon: 'error' });
            }
        },
        [editor, createFaq, updateFaq],
    );

    const searching = Boolean(search.trim());
    const noResults = searching && matchCount === 0;

    const headerSubtitle = useMemo(() => {
        if (isLoading) return 'Loading…';
        if (searching) return `${matchCount} of ${totalCount} ${totalCount === 1 ? 'question' : 'questions'}`;
        return `${totalCount} ${totalCount === 1 ? 'question' : 'questions'} answered`;
    }, [isLoading, searching, matchCount, totalCount]);

    if (isError) {
        return (
            <GlassCard preset="section" className="flex flex-col items-center gap-3 py-12 text-center">
                <IconBox icon="information-5" trio={TRIO.rose} size={44} />
                <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                    We couldn’t load the FAQs
                </div>
                <p className="m-0 max-w-sm text-[13px] text-slate-500 dark:text-slate-400">
                    Something went wrong reaching the server. Your connection may have dropped.
                </p>
                <WtButton onClick={() => void refetch()} startIcon={<KTIcon iconName="arrow-right" className="fs-6 text-white" />}>
                    Try again
                </WtButton>
            </GlassCard>
        );
    }

    return (
        <div
            ref={rootRef}
            // --faq-shell: clearance for the app's own sticky tab bar (44px tall,
            // pinned at 0 below 1024px and at 74px above). --faq-head is written
            // by the measuring effect above.
            className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 [--faq-head:0px] [--faq-shell:44px] [@media(min-width:1025px)]:[--faq-shell:118px]"
        >
            {/* ── Sticky header: title, count, action, search, mobile chips ──
                One block so it pins as a unit.

                OPAQUE, not glass. A sticky bar is a layer the content passes
                UNDER — the reader must never see two competing texts in the same
                pixels. The kit's glass surfaces are translucent by design, which
                is right for a panel sitting still and wrong for one the whole
                page scrolls beneath. `disableBlur` takes the opaque fallback, and
                the shadow gives the layer an edge so it reads as in front. */}
            <GlassCard
                ref={stickyHeadRef}
                preset="section"
                disableBlur
                sx={{
                    position: 'sticky',
                    top: 'var(--faq-shell)',
                    zIndex: 30,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    bgcolor: 'background.paper',
                    boxShadow: '0 6px 16px -10px rgba(16,24,40,0.45)',
                }}
            >
                {!embedded && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <h1 className="m-0 text-[20px] font-semibold tracking-tight text-slate-900 sm:text-[24px] dark:text-slate-100">
                                Frequently Asked Questions
                            </h1>
                            <p className="m-0 mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{headerSubtitle}</p>
                        </div>
                        {canManage && (
                            <div className="flex shrink-0 gap-2">
                                {!sectionType && (
                                    <WtButton
                                        inverted
                                        onClick={() => setManagingSections(true)}
                                        startIcon={<KTIcon iconName="category" className="fs-5" />}
                                    >
                                        Sections
                                    </WtButton>
                                )}
                                {targetSection && (
                                    <WtButton
                                        onClick={() => targetSection && setEditor({ section: targetSection, faq: null })}
                                        startIcon={<KTIcon iconName="plus" className="fs-5 text-white" />}
                                    >
                                        Add question
                                    </WtButton>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Toolbar: scope + search. Both narrow the same list, so they
                    belong on one row rather than in separate bands.

                    Both are MUI `TextField size="small"`, per the Sandwich Leave
                    rule editor. That is not only for consistency — a TextField
                    manages its own label space, so the label can never collide
                    with the content above it the way a hand-positioned floating
                    label does. The scope control hides itself for a single-org
                    family, since a filter with one option is noise. */}
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    sx={{ mt: 1.5 }}
                >
                    {hasChoice && (
                        <TextField
                            select
                            label="Sub Organization"
                            size="small"
                            value={scopeId}
                            onChange={(event) => setScopeId(event.target.value)}
                            sx={{ width: { xs: '100%', sm: 260 }, flexShrink: 0 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <KTIcon iconName="office-bag" className="fs-6" />
                                    </InputAdornment>
                                ),
                            }}
                            // Long org names must ellipsize inside the control
                            // rather than spill past it. minWidth:0 is what lets
                            // the flex child shrink below its content width.
                            SelectProps={{
                                sx: {
                                    '& .MuiSelect-select': {
                                        minWidth: 0,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    },
                                },
                            }}
                        >
                            {selectOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value} sx={{ fontSize: 13.5 }}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}

                    <TextField
                        label="Search"
                        size="small"
                        fullWidth
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search questions and answers…"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <KTIcon iconName="magnifier" className="fs-6" />
                                </InputAdornment>
                            ),
                            endAdornment: search ? (
                                <InputAdornment position="end">
                                    <WtIconButton
                                        title="Clear search"
                                        sx={{ width: 26, height: 26, borderRadius: '8px' }}
                                        onClick={() => setSearch('')}
                                    >
                                        <KTIcon iconName="cross" className="fs-7" />
                                    </WtIconButton>
                                </InputAdornment>
                            ) : undefined,
                        }}
                    />
                </Stack>

                {/* Mobile section chips */}
                {showRail && (
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ mt: 1.5, overflowX: 'auto', pb: 0.5, display: { lg: 'none' } }}
                    >
                        {sections.map((section) => {
                            const active = activeSection === section.id;
                            return (
                                <Chip
                                    key={section.id}
                                    label={`${section.title} · ${section.faqs.length}`}
                                    onClick={() => scrollToSection(section.id)}
                                    aria-current={active ? 'true' : undefined}
                                    color={active ? 'primary' : 'default'}
                                    variant={active ? 'filled' : 'outlined'}
                                    sx={{ flexShrink: 0, fontWeight: 600, fontSize: 13 }}
                                />
                            );
                        })}
                    </Stack>
                )}
            </GlassCard>

            <Box sx={{ display: 'flex', gap: { xs: 0, lg: 3 } }}>
                {/* Desktop section rail */}
                {showRail && (
                    <GlassSurface
                        component="nav"
                        aria-label="FAQ sections"
                        variant="thin"
                        radius={16}
                        sx={{
                            // Pins below BOTH the app shell tab bar and our own sticky
                            // header - measured, not guessed, so the rail never slides
                            // underneath either of them.
                            position: 'sticky',
                            top: 'calc(var(--faq-shell) + var(--faq-head) + 0.75rem)',
                            alignSelf: 'flex-start',
                            width: 216,
                            flexShrink: 0,
                            p: 1,
                            display: { xs: 'none', lg: 'flex' },
                            flexDirection: 'column',
                            gap: 0.25,
                        }}
                    >
                        {sections.map((section) => {
                            const active = activeSection === section.id;
                            const tone = TRIO[resolveTone(section.tone)];
                            return (
                                <Box
                                    key={section.id}
                                    component="button"
                                    type="button"
                                    onClick={() => scrollToSection(section.id)}
                                    aria-current={active ? 'true' : undefined}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.25,
                                        px: 1.5,
                                        py: 1,
                                        border: 0,
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        font: 'inherit',
                                        fontSize: 14,
                                        textAlign: 'left',
                                        transition: 'background-color .15s, color .15s',
                                        color: active ? tone.c : 'text.secondary',
                                        fontWeight: active ? 700 : 500,
                                        bgcolor: active ? tone.bg : 'transparent',
                                        '&:hover': { bgcolor: active ? tone.bg : 'action.hover' },
                                    }}
                                >
                                    <KTIcon iconName={resolveIcon(section.icon)} className="fs-6" />
                                    <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {section.title}
                                    </Box>
                                    <Box component="span" sx={{ flexShrink: 0, fontSize: 12, opacity: 0.65, fontVariantNumeric: 'tabular-nums' }}>
                                        {section.faqs.length}
                                    </Box>
                                </Box>
                            );
                        })}
                    </GlassSurface>
                )}

                {/* Sections */}
                <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
                    {isLoading && (
                        <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 8 }}>
                            <CircularProgress size={22} />
                            <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>Loading FAQs...</Typography>
                        </Stack>
                    )}

                    {!isLoading && noResults && (
                        <GlassSurface variant="thin" sx={{ p: 4, textAlign: 'center' }}>
                            <Stack alignItems="center" spacing={1.5}>
                                <IconBox icon="magnifier" trio={TRIO.slate} size={44} />
                                <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary' }}>
                                    No matches for &ldquo;{search.trim()}&rdquo;
                                </Typography>
                                <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 380 }}>
                                    Try a shorter phrase, or clear the search to browse every section.
                                </Typography>
                                <WtButton ghost onClick={() => setSearch('')}>Clear search</WtButton>
                            </Stack>
                        </GlassSurface>
                    )}

                    {!isLoading && !noResults && sections.map((section) => {
                        // While searching, hide sections with nothing to show.
                        if (searching && section.faqs.length === 0) return null;
                        const tone = TRIO[resolveTone(section.tone)];

                        return (
                            <Box
                                key={section.id}
                                component="section"
                                data-section-id={section.id}
                                ref={(element: HTMLElement | null) => { sectionRefs.current[section.id] = element; }}
                                aria-labelledby={`faq-section-${section.id}`}
                                // Clears the sticky stack, so choosing a rail item lands
                                // the heading below the header rather than under it.
                                sx={{ scrollMarginTop: 'calc(var(--faq-shell) + var(--faq-head) + 1rem)' }}
                            >
                                <SettingsSection
                                    tone={tone}
                                    icon={resolveIcon(section.icon)}
                                    title={section.title}
                                    description={section.description ?? undefined}
                                    divided={section.faqs.length > 0}
                                    action={
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography sx={{ fontSize: 12.5, color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
                                                {section.faqs.length}
                                            </Typography>
                                            {canManage && (
                                                <WtIconButton
                                                    title={`Add a question to ${section.title}`}
                                                    color={tone.c}
                                                    sx={{ width: 32, height: 32, borderRadius: '10px' }}
                                                    onClick={() => setEditor({ section, faq: null })}
                                                >
                                                    <KTIcon iconName="plus" className="fs-6" />
                                                </WtIconButton>
                                            )}
                                        </Stack>
                                    }
                                >
                                    {section.faqs.length === 0 ? (
                                        <Stack alignItems="center" spacing={1} sx={{ py: 3 }}>
                                            <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>
                                                Nothing here yet.
                                            </Typography>
                                            {canManage && (
                                                <WtButton
                                                    ghost
                                                    onClick={() => setEditor({ section, faq: null })}
                                                    startIcon={<KTIcon iconName="plus" className="fs-6" />}
                                                >
                                                    Add the first question
                                                </WtButton>
                                            )}
                                        </Stack>
                                    ) : (
                                        <Stack divider={<Divider flexItem />}>
                                            {section.faqs.map((faq) => (
                                                <FaqAccordionItem
                                                    key={faq.id}
                                                    faq={faq}
                                                    highlight={search}
                                                    onEdit={canManage ? (target) => setEditor({ section, faq: target }) : undefined}
                                                    onDelete={canManage ? handleDelete : undefined}
                                                />
                                            ))}
                                        </Stack>
                                    )}
                                </SettingsSection>
                            </Box>
                        );
                    })}
                </Stack>
            </Box>

            {editor && (
                <FaqEditorDialog
                    open
                    sectionTitle={editor.section.title}
                    sectionIcon={resolveIcon(editor.section.icon)}
                    faq={editor.faq}
                    saving={isSaving}
                    onClose={() => setEditor(null)}
                    onSave={handleSave}
                />
            )}

            <FaqSectionManagerDialog open={managingSections} onClose={() => setManagingSections(false)} />
        </div>
    );
}

export default FaqsBoard;
