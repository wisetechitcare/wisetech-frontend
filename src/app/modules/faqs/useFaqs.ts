import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createNewFaq, deleteFaqById, fetchAllFaqs, updateFaqById } from '@services/company';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { FAQ_SECTIONS, type Faq, type FaqSection, type FaqType } from './types';

/**
 * THE FAQ data hook — one fetch path, one cache, one realtime subscription,
 * one set of mutations, shared by every FAQ surface in the app.
 *
 * Why a hook and not per-screen state: five screens previously each owned their
 * own fetch + local state. They drifted (two different response shapes, two
 * sort orders) and none of them saw another user's edits. Server state now
 * lives in React Query under a single key, so N mounted FAQ views cost ONE
 * request, and any FAQ write — by anyone, anywhere — invalidates that one key.
 *
 * Caching: FAQs are near-static reference content, so a generous `staleTime`
 * turns tab-switching into cache reads instead of round-trips. Freshness comes
 * from the socket, not from polling.
 */

/** Single cache key for the whole FAQ dataset. Sections are derived, never fetched separately. */
export const FAQS_QUERY_KEY = ['faqs'] as const;

/** Reference content changes a few times a year; the socket covers the rest. */
const FAQ_STALE_TIME_MS = 5 * 60 * 1000;

const EMPTY_SECTIONS: FaqSection[] = FAQ_SECTIONS.map(({ id, title }) => ({ id, title, faqs: [] }));

/**
 * Normalise whatever the API returned into the canonical section list.
 * Always yields every section in `FAQ_SECTIONS` order, so the UI never has to
 * defend against a missing or extra section.
 */
const toSections = (payload: unknown): FaqSection[] => {
    const raw = (payload as { data?: { sections?: unknown } })?.data?.sections;
    if (!Array.isArray(raw)) return EMPTY_SECTIONS;

    const byId = new Map<string, Faq[]>();
    for (const section of raw as { id?: string; faqs?: Faq[] }[]) {
        if (section?.id) byId.set(section.id, Array.isArray(section.faqs) ? section.faqs : []);
    }
    return FAQ_SECTIONS.map(({ id, title }) => ({ id, title, faqs: byId.get(id) ?? [] }));
};

export interface UseFaqsOptions {
    /** Limit the board to one section. Omit for all sections. */
    type?: FaqType;
    /** Whether the caller may create/edit/delete. Purely presentational — the API enforces it too. */
    canManage?: boolean;
}

export function useFaqs(options: UseFaqsOptions = {}) {
    const { type } = options;
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');

    const query = useQuery({
        queryKey: FAQS_QUERY_KEY,
        queryFn: () => fetchAllFaqs(),
        select: toSections,
        staleTime: FAQ_STALE_TIME_MS,
    });

    const invalidate = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: FAQS_QUERY_KEY });
    }, [queryClient]);

    // Realtime: a FAQ write anywhere in the company refreshes every open board.
    // Bridged from the `faqs_updated` socket event by useRealtimeSync.
    useEventBus(EVENT_KEYS.faqCreated, invalidate);
    useEventBus(EVENT_KEYS.faqUpdated, invalidate);
    useEventBus(EVENT_KEYS.faqDeleted, invalidate);

    // Mutations invalidate rather than patch the cache: the server broadcast
    // will refresh every other client anyway, so a single refetch keeps all
    // viewers converged on one truth instead of drifting local copies.
    const createMutation = useMutation({
        mutationFn: (input: { question: string; answer: string; type: FaqType }) => createNewFaq(input),
        onSuccess: invalidate,
    });

    const updateMutation = useMutation({
        mutationFn: (input: { id: string; question: string; answer: string }) =>
            updateFaqById(input.id, { question: input.question, answer: input.answer }),
        onSuccess: invalidate,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteFaqById(id),
        onSuccess: invalidate,
    });

    const allSections = query.data ?? EMPTY_SECTIONS;

    /**
     * Sections after the section filter and the search filter.
     * Search is client-side over an already-loaded array — the dataset is a
     * handful of rows per tenant, so this is instant and costs no request.
     * ponytail: linear scan, move to a server-side FULLTEXT query only if a
     * tenant's FAQ count ever reaches the thousands.
     */
    const sections = useMemo(() => {
        const scoped = type ? allSections.filter((section) => section.id === type) : allSections;
        const needle = search.trim().toLowerCase();
        if (!needle) return scoped;

        return scoped.map((section) => ({
            ...section,
            faqs: section.faqs.filter(
                (faq) =>
                    faq.question.toLowerCase().includes(needle) ||
                    faq.answer.toLowerCase().includes(needle),
            ),
        }));
    }, [allSections, type, search]);

    const totalCount = useMemo(
        () => allSections.reduce((sum, section) => sum + section.faqs.length, 0),
        [allSections],
    );

    const matchCount = useMemo(
        () => sections.reduce((sum, section) => sum + section.faqs.length, 0),
        [sections],
    );

    return {
        sections,
        totalCount,
        matchCount,
        search,
        setSearch,
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
        createFaq: createMutation.mutateAsync,
        updateFaq: updateMutation.mutateAsync,
        deleteFaq: deleteMutation.mutateAsync,
        isSaving: createMutation.isPending || updateMutation.isPending,
    };
}
