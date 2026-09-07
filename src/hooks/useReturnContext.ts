import { useEffect } from "react";
import { useLocation, useNavigate, type NavigateOptions } from "react-router-dom";

/**
 * "Take me back where I came from."
 *
 * A Billing detail page has exactly one parent in the Billing module, and it used
 * to hardcode a navigate to it. That is right when you arrived from the Billing
 * list and wrong when you arrived from a project's Financial Workspace — you get
 * dumped in the Billing module with no way back to the project you were reading.
 *
 * So the ORIGIN states where "back" goes, and the destination honours it, falling
 * back to its own parent when nobody said. Origins that never pass a context keep
 * their existing behaviour exactly, which is why this could be added without
 * touching how the Billing lists navigate.
 *
 * Deliberately carried in `history.state` rather than a query param: it is
 * navigation bookkeeping, not addressable state, and putting it in the URL would
 * make every detail link unshareable ("?returnTo=" pointing at someone else's
 * scroll position).
 */
export interface ReturnContext {
    /** Full path to return to, search string included. */
    pathname: string;
    /** What the Back button should say — "Project Billing", not a generic "Back". */
    label: string;
    /** Window scroll at the moment of departure, so the return lands in place. */
    scrollY?: number;
}

const KEY = "returnContext";

/**
 * Build the nav options that hand a return context to wherever you're going.
 *
 *   navigate(`/billing/requests/${id}`, withReturnContext({ pathname, label: "Project Billing" }))
 */
export const withReturnContext = (
    context: Omit<ReturnContext, "scrollY"> & { scrollY?: number },
): NavigateOptions => ({
    state: { [KEY]: { scrollY: window.scrollY, ...context } satisfies ReturnContext },
});

/**
 * Resolve where "back" goes on a detail page.
 *
 * `fallback` is the page's own parent — what it navigated to before this existed.
 */
export const useReturnContext = (fallback: { pathname: string; label: string }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const context = (location.state as Record<string, unknown> | null)?.[KEY] as
        | ReturnContext
        | undefined;
    const target = context ?? fallback;

    return {
        label: target.label,
        /** True when an origin actually asked for this — useful for extra affordances. */
        isContextual: Boolean(context),
        goBack: () =>
            navigate(target.pathname, {
                state: context?.scrollY != null ? { restoreScroll: context.scrollY } : undefined,
            }),
    };
};

/**
 * Restore the scroll position a return context carried.
 *
 * Runs after paint (`requestAnimationFrame`) because the page it lands on has to
 * have rendered its content before there is anything to scroll to. `ready` lets a
 * data-driven page wait for its own rows — scrolling to 2000px on a skeleton puts
 * you at the bottom of nothing.
 */
export const useRestoreScroll = (ready = true) => {
    const location = useLocation();
    const scrollY = (location.state as Record<string, unknown> | null)?.restoreScroll as
        | number
        | undefined;

    useEffect(() => {
        if (scrollY == null || !ready) return;
        const frame = requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
        return () => cancelAnimationFrame(frame);
    }, [scrollY, ready]);
};
