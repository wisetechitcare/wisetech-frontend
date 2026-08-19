import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createFaqCategory,
    deleteFaqCategoryById,
    fetchFaqCategories,
    reorderFaqCategories,
    updateFaqCategoryById,
} from '@services/company';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { FAQS_QUERY_KEY } from './useFaqs';
import type { FaqCategory, FaqCategoryInput } from './types';

/**
 * FAQ section (category) administration.
 *
 * Separate from `useFaqs` on purpose: the board needs sections *with* their
 * questions, while the management screen needs sections with counts and the
 * inactive ones too. Two shapes, two cache keys — but every mutation
 * invalidates BOTH, because renaming or reordering a section changes what the
 * board renders just as much as what the manager lists.
 */
export const FAQ_CATEGORIES_QUERY_KEY = ['faq-categories'] as const;

/** Pulled out of an axios error so the UI can explain *why* a delete was refused. */
export interface FaqCategoryConflict {
    reasonCode?: string;
    faqCount?: number;
    message: string;
}

export const readConflict = (error: unknown): FaqCategoryConflict | null => {
    const response = (error as { response?: { status?: number; data?: any } })?.response;
    if (response?.status !== 409) return null;
    const payload = response.data ?? {};
    return {
        reasonCode: payload.meta?.reasonCode ?? payload.reasonCode,
        faqCount: payload.meta?.faqCount ?? payload.faqCount,
        message: payload.message ?? 'That section cannot be deleted.',
    };
};

export function useFaqCategories(options: { includeInactive?: boolean } = {}) {
    const includeInactive = options.includeInactive ?? true;
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: [...FAQ_CATEGORIES_QUERY_KEY, includeInactive],
        queryFn: () => fetchFaqCategories(includeInactive),
        select: (payload: unknown): FaqCategory[] => {
            const rows = (payload as { data?: { categories?: FaqCategory[] } })?.data?.categories;
            return Array.isArray(rows) ? rows : [];
        },
    });

    // A section change alters the board too, so both caches are dropped together.
    const invalidate = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: FAQ_CATEGORIES_QUERY_KEY });
        void queryClient.invalidateQueries({ queryKey: FAQS_QUERY_KEY });
    }, [queryClient]);

    useEventBus(EVENT_KEYS.faqCreated, invalidate);
    useEventBus(EVENT_KEYS.faqUpdated, invalidate);
    useEventBus(EVENT_KEYS.faqDeleted, invalidate);

    const createMutation = useMutation({
        mutationFn: (input: FaqCategoryInput) => createFaqCategory(input),
        onSuccess: invalidate,
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, ...input }: FaqCategoryInput & { id: string }) => updateFaqCategoryById(id, input),
        onSuccess: invalidate,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteFaqCategoryById(id),
        onSuccess: invalidate,
    });

    const reorderMutation = useMutation({
        mutationFn: (orderedIds: string[]) => reorderFaqCategories(orderedIds),
        onSuccess: invalidate,
    });

    return {
        categories: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        refetch: query.refetch,
        createCategory: createMutation.mutateAsync,
        updateCategory: updateMutation.mutateAsync,
        deleteCategory: deleteMutation.mutateAsync,
        reorderCategories: reorderMutation.mutateAsync,
        isSaving: createMutation.isPending || updateMutation.isPending || reorderMutation.isPending,
    };
}
