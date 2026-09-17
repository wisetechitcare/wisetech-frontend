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
    const groups = data?.groups ?? [];
    const byCode = new Map(
      groups.flatMap((group) => group.entries.map((e) => [e.code, e] as const)),
    );
    return {
      /** Configured label, else the code title-cased — never blank. */
      label: (code?: string | null): string => (!code ? "" : byCode.get(code)?.label ?? humanise(code)),
      /** Configured tone name or hex, or undefined when this code has none. */
      tone: (code?: string | null): BillingStatusColour | undefined =>
        code ? byCode.get(code)?.tone : undefined,
      /**
       * One group's codes as dropdown options, in catalogue order and under their
       * configured wording.
       *
       * This is what stops a filter dropdown from being a second, hand-typed copy
       * of the status list: rename a status in Configure and the filter that
       * selects it renames with it. Empty until the config loads, so a caller
       * that needs an "All" row prepends its own rather than getting a lone
       * placeholder while the list is still on the wire.
       */
      options: (groupKey: string): Array<{ value: string; label: string }> =>
        groups
          .find((group) => group.key === groupKey)
          ?.entries.map((entry) => ({ value: entry.code, label: entry.label })) ?? [],
      /**
       * The code this group settles on — the one an admin marked DEFAULT in
       * Configure. Used to highlight the likely choice in a dropdown; it is never
       * applied on its own, because a default that silently fills 756 rows would
       * claim work that has not happened.
       */
      defaultCode: (groupKey: string): string | undefined =>
        groups.find((group) => group.key === groupKey)?.entries.find((e) => e.isDefault)?.code,
    };
  }, [data]);
};

/** Group keys from the server catalogue (`services/billing/statusLabels.ts` GROUPS). */
export const BILLING_LABEL_GROUP = {
  STATUS: "OPERATION_STATUS",
  STAGE: "STAGE",
  BILL_PAYMENT: "BILL_PAYMENT_STATUS",
} as const;
