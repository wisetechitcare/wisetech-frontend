import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { queryKeys } from '@/lib/queryKeys';
import { getRecruitmentBranches, type RecruitmentBranch } from '@services/recruitment';

/**
 * The branches a requisition or an offer can be for — one query shared by every recruitment
 * form, so they cannot disagree about which branches exist or what currency each one uses.
 *
 * Family-scoped on the server, and each branch carries the currency the server resolved, so a
 * salary field can show the right one the moment a branch is picked without re-deriving it.
 */
export const useRecruitmentBranches = () => {
    const { data, isLoading, isError } = useQuery({
        queryKey: queryKeys.recruitment.branches(),
        queryFn: getRecruitmentBranches,
        // Branches change when someone edits company setup, not while a form is open.
        staleTime: 5 * 60_000,
    });
    const viewerBranchId = useSelector((st: RootState) => st.employee?.currentEmployee?.branchId as string | undefined);

    return useMemo(() => {
        const branches: RecruitmentBranch[] = data ?? [];
        const byId = new Map(branches.map((b) => [b.id, b]));
        return {
            branches,
            byId,
            isLoading,
            isError,
            /** More than one org in the family, so a branch name alone is ambiguous. */
            spansOrgs: new Set(branches.map((b) => b.companyId)).size > 1,
            /**
             * What a NEW record starts with: the viewer's own branch when it is one of these, else
             * the only branch when there is exactly one, else nothing — a guess between several
             * would put the wrong currency on a salary without anyone noticing.
             */
            defaultBranchId: (viewerBranchId && byId.has(viewerBranchId) ? viewerBranchId : branches.length === 1 ? branches[0].id : '') as string,
        };
    }, [data, isLoading, isError, viewerBranchId]);
};
