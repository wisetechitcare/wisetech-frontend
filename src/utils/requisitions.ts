/**
 * Which roles a picker may offer — the twin of the backend's `isRequisitionStillHiring`
 * (`utils/recruitmentAnalytics.ts`), kept in step with it by hand the way `utils/ctc` is.
 *
 * Three screens asked "can I put someone against this role?" and each answered it with
 * `status === 1 && isActive !== false` — approved and not archived, and nothing about whether
 * the role has any seats left. So a role with 3 of 3 hired kept appearing in Add candidate, in
 * Add to a role, and in New advert, and choosing it produced a hire the headcount cannot hold.
 *
 * The dashboard had the same gap under the label "Open Roles" and is fixed at the source; this is
 * the client half of the same rule, so a role that has stopped hiring stops being offered.
 */

export interface RoleSeats {
    status?: number;
    isActive?: boolean;
    headcount?: number | null;
    filledCount?: number | null;
}

/**
 * Seats left to fill?
 *
 * A missing or zero headcount counts as OPEN: the role exists and nobody has said how many seats
 * it has, so refusing it would hide a configuration gap behind an empty dropdown.
 */
export const hasSeatsLeft = (r: RoleSeats): boolean => {
    const seats = r.headcount ?? 0;
    if (seats <= 0) return true;
    return (r.filledCount ?? 0) < seats;
};

/** Approved, not archived, and still hiring — what every role picker should offer. */
export const isRoleOpenForCandidates = (r: RoleSeats): boolean =>
    r.status === 1 && r.isActive !== false && hasSeatsLeft(r);
