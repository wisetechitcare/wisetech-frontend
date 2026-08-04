import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KTIcon } from '@metronic/helpers';
import { GlassCard } from '@app/modules/common/components/ui/tw/Glass';
import { WtButton } from '@app/modules/common/components/ui/tw/Buttons';
import { Spinner } from '@app/modules/common/components/ui/tw/Spinner';
import { IconBox } from '@app/modules/common/components/ui/tw/Patterns';
import { TRIO } from '@app/modules/common/components/ui/tw/tokens';
import { confirmDialog, toast } from '@app/modules/common/components/ui/feedback';
import { FaqAccordionItem } from './FaqAccordionItem';
import { FaqEditorDialog } from './FaqEditorDialog';
import { useFaqs } from './useFaqs';
import { FAQ_SECTION_BY_ID, resolveFaqType, type Faq, type FaqType } from './types';

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
    const sectionType = resolveFaqType(type);
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
    } = useFaqs({ type: sectionType });

    const [activeSection, setActiveSection] = useState<FaqType | null>(null);
    const [editor, setEditor] = useState<{ sectionId: FaqType; faq: Faq | null } | null>(null);
    const sectionRefs = useRef<Partial<Record<FaqType, HTMLElement | null>>>({});

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
                    const id = visible.target.dataset.sectionId as FaqType | undefined;
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

    const scrollToSection = useCallback((id: FaqType) => {
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
                    await createFaq({ ...values, type: editor.sectionId });
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
                One block so it pins as a unit. Translucent + blurred rather than
                transparent, otherwise the list scrolls visibly through it. */}
            <div
                ref={stickyHeadRef}
                className="sticky top-[var(--faq-shell)] z-30 -mx-1 flex flex-col gap-3 border-b border-[#E6E9EE] bg-white/95 px-1 pb-3 pt-3 backdrop-blur-md dark:border-[#30363d] dark:bg-[#0d1117]/95"
            >
                {!embedded && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <h1 className="m-0 text-[20px] font-semibold tracking-tight text-slate-900 sm:text-[24px] dark:text-slate-100">
                                Frequently Asked Questions
                            </h1>
                            <p className="m-0 mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{headerSubtitle}</p>
                        </div>
                        {canManage && !sectionType && (
                            <WtButton
                                onClick={() => setEditor({ sectionId: sections[0]?.id ?? 'general_rules', faq: null })}
                                startIcon={<KTIcon iconName="plus" className="fs-5 text-white" />}
                                className="shrink-0"
                            >
                                Add question
                            </WtButton>
                        )}
                    </div>
                )}

                <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <KTIcon iconName="magnifier" className="fs-6" />
                    </span>
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search questions and answers…"
                        aria-label="Search FAQs"
                        className="w-full rounded-xl border border-[#E6E9EE] bg-white py-2.5 pl-10 pr-3.5 text-[14px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/15 dark:border-[#30363d] dark:bg-[#0d1117] dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                </div>

                {/* ── Mobile section chips ─────────────────────────────────── */}
                {showRail && (
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 lg:hidden">
                        {sections.map((section) => {
                            const meta = FAQ_SECTION_BY_ID[section.id];
                            const active = activeSection === section.id;
                            return (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => scrollToSection(section.id)}
                                    aria-current={active ? 'true' : undefined}
                                    // !rounded-full: these sit inside Metronic's
                                    // stylesheet, whose button rules would otherwise
                                    // square the corners off.
                                    className={`!rounded-full shrink-0 whitespace-nowrap border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                                        active
                                            ? 'border-[#1E3A8A] bg-[#1E3A8A] text-white shadow-sm'
                                            : 'border-[#D8DEE7] bg-white text-slate-600 hover:border-[#1E3A8A]/40 dark:border-[#30363d] dark:bg-[#161b22] dark:text-slate-300'
                                    }`}
                                >
                                    {meta.title}
                                    <span className="ml-1.5 tabular-nums opacity-60">{section.faqs.length}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex gap-6">
                {/* ── Desktop section rail ─────────────────────────────────── */}
                {showRail && (
                    <nav
                        aria-label="FAQ sections"
                        // Pins below BOTH the shell tab bar and our sticky header.
                        // It was top-2 (8px) — i.e. behind the tab bar, which read
                        // as the rail disappearing on scroll.
                        className="sticky top-[calc(var(--faq-shell)+var(--faq-head)+0.75rem)] hidden h-fit w-[210px] shrink-0 flex-col gap-0.5 rounded-2xl border border-[#E6E9EE] bg-white p-2 lg:flex dark:border-[#30363d] dark:bg-[#161b22]"
                    >
                        {sections.map((section) => {
                            const meta = FAQ_SECTION_BY_ID[section.id];
                            const active = activeSection === section.id;
                            return (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => scrollToSection(section.id)}
                                    aria-current={active ? 'true' : undefined}
                                    className={`flex items-center gap-2.5 !rounded-full px-3 py-2 text-left text-[14px] transition-colors ${
                                        active
                                            ? 'bg-[#1E3A8A]/8 font-semibold text-[#1E3A8A] dark:bg-[#1E3A8A]/20 dark:text-slate-100'
                                            : 'font-medium text-slate-500 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <KTIcon iconName={meta.icon} className="fs-6 shrink-0" />
                                    <span className="min-w-0 flex-1 truncate">{meta.title}</span>
                                    <span className="shrink-0 text-[12px] tabular-nums opacity-60">{section.faqs.length}</span>
                                </button>
                            );
                        })}
                    </nav>
                )}

                {/* ── Sections ─────────────────────────────────────────────── */}
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                    {isLoading && (
                        <div className="flex items-center justify-center gap-2.5 py-16 text-slate-500">
                            <Spinner size={18} />
                            <span className="text-[14px]">Loading FAQs…</span>
                        </div>
                    )}

                    {!isLoading && noResults && (
                        <GlassCard preset="section" className="flex flex-col items-center gap-2.5 py-12 text-center">
                            <IconBox icon="magnifier" trio={TRIO.slate} size={44} />
                            <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                                No matches for “{search.trim()}”
                            </div>
                            <p className="m-0 max-w-sm text-[13px] text-slate-500 dark:text-slate-400">
                                Try a shorter phrase, or clear the search to browse every section.
                            </p>
                            <WtButton ghost onClick={() => setSearch('')}>Clear search</WtButton>
                        </GlassCard>
                    )}

                    {!isLoading &&
                        !noResults &&
                        sections.map((section) => {
                            const meta = FAQ_SECTION_BY_ID[section.id];
                            // While searching, hide sections with nothing to show.
                            if (searching && section.faqs.length === 0) return null;

                            return (
                                <section
                                    key={section.id}
                                    data-section-id={section.id}
                                    ref={(element) => { sectionRefs.current[section.id] = element; }}
                                    aria-labelledby={`faq-section-${section.id}`}
                                    // Clears the sticky stack, so clicking a chip
                                    // lands the heading below the header instead of
                                    // scrolling it underneath.
                                    className="scroll-mt-[calc(var(--faq-shell)+var(--faq-head)+1rem)]"
                                >
                                    <GlassCard preset="section" accentEdge={meta.tone} className="flex flex-col gap-1">
                                        <div className="flex items-start gap-3 pb-1">
                                            <IconBox icon={meta.icon} trio={TRIO[meta.tone]} size={40} />
                                            <div className="min-w-0 flex-1">
                                                <h2
                                                    id={`faq-section-${section.id}`}
                                                    className="m-0 text-[15px] font-semibold text-slate-900 dark:text-slate-100"
                                                >
                                                    {meta.title}
                                                    <span className="ml-2 text-[12px] font-medium tabular-nums text-slate-400">
                                                        {section.faqs.length}
                                                    </span>
                                                </h2>
                                                <p className="m-0 mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400">
                                                    {meta.blurb}
                                                </p>
                                            </div>
                                            {canManage && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEditor({ sectionId: section.id, faq: null })}
                                                    aria-label={`Add a question to ${meta.title}`}
                                                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#E6E9EE] text-slate-500 transition-colors hover:border-[#1E3A8A] hover:text-[#1E3A8A] dark:border-[#30363d] dark:text-slate-400"
                                                >
                                                    <KTIcon iconName="plus" className="fs-5" />
                                                </button>
                                            )}
                                        </div>

                                        {section.faqs.length === 0 ? (
                                            <div className="flex flex-col items-center gap-2 py-8 text-center">
                                                <p className="m-0 text-[13px] text-slate-400">
                                                    Nothing here yet.
                                                </p>
                                                {canManage && (
                                                    <WtButton
                                                        ghost
                                                        onClick={() => setEditor({ sectionId: section.id, faq: null })}
                                                        startIcon={<KTIcon iconName="plus" className="fs-6" />}
                                                    >
                                                        Add the first question
                                                    </WtButton>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                                                {section.faqs.map((faq) => (
                                                    <FaqAccordionItem
                                                        key={faq.id}
                                                        faq={faq}
                                                        highlight={search}
                                                        onEdit={canManage ? (target) => setEditor({ sectionId: section.id, faq: target }) : undefined}
                                                        onDelete={canManage ? handleDelete : undefined}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </GlassCard>
                                </section>
                            );
                        })}
                </div>
            </div>

            {editor && (
                <FaqEditorDialog
                    open
                    sectionId={editor.sectionId}
                    faq={editor.faq}
                    saving={isSaving}
                    onClose={() => setEditor(null)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

export default FaqsBoard;
