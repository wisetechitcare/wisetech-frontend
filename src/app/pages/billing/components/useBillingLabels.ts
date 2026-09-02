import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBillingStatusLabels, type BillingStatusColour } from "@services/billingConfig";

/**
 * The configured wording and colour for a Billing code.
 *
 * Every Billing chip resolves through here, so an edit in Billing → Configure
 * reaches every screen at once instead of each page carrying its own copy.
 *
 * ONE request per session however many chips are on screen: React Query dedupes
 * on the shared key, and the config only changes when an admin saves it — which
 * is exactly when the Configure page invalidates this key.
 *
 * `tone()` returns undefined for a code the config does not carry, rather than
 * guessing a colour. The caller supplies its own fallback — which keeps this
 * module from importing `BILLING_STATUS_TONES` out of `BillingPrimitives`, whose
 * badge imports this hook back. A cycle between the two would be initialised in
 * whichever order the bundler happened to pick.
 */

const humanise = (code: string) =>
  code.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export const BILLING_LABELS_KEY = ["billing-status-labels"] as const;

export const useBillingLabels = () => {
  const { data } = useQuery({
    queryKey: BILLING_LABELS_KEY,
    queryFn: getBillingStatusLabels,
    staleTime: Infinity,
  });

  return useMemo(() => {
    const byCode = new Map(
      (data?.groups ?? []).flatMap((group) => group.entries.map((e) => [e.code, e] as const)),
    );
    return {
      /** Configured label, else the code title-cased — never blank. */
      label: (code?: string | null): string => (!code ? "" : byCode.get(code)?.label ?? humanise(code)),
      /** Configured tone name or hex, or undefined when this code has none. */
      tone: (code?: string | null): BillingStatusColour | undefined =>
        code ? byCode.get(code)?.tone : undefined,
    };
  }, [data]);
};
