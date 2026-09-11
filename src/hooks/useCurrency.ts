/**
 * The currency this user's money is in — as a hook, and as a glyph.
 *
 * WHAT IT REPLACES. `utils/currency.ts` has been able to format ~70 currencies and resolve a
 * symbol for each since it was written. Nothing ever fed it: almost every `formatCurrency()`
 * call omits the argument, and a handful of screens skip the util entirely and hardcode
 * `{ style: 'currency', currency: 'INR' }` inline. So the app quietly rendered rupees for
 * every branch, and the "Offers Out" tile in recruitment showed a `$` — the icon font has a
 * `dollar` glyph and no other, so that was simply the nearest available shape. This is the
 * missing supply side.
 *
 * WHERE THE ANSWER COMES FROM, in order:
 *
 *   1. the branch's own `currency` column — an explicit choice, so it wins outright
 *   2. the currency of the branch's country
 *   3. INR
 *
 * The rule itself is `resolveCurrency` in `utils/currency.ts`, kept pure and free of React so
 * it can be reasoned about and tested on its own. This file only supplies its two inputs.
 *
 * WHY IT FETCHES THE COUNTRY LIST RATHER THAN READING REDUX. The geo directory is already in
 * `state.locations.countries` — but in one of two different shapes, depending on which screen
 * the user happened to open first. `Branches.tsx` dispatches the RAW records (they carry
 * `currency`, `currency_symbol` and the timezone data it needs); `wizard/forms/AddressInfo`
 * dispatches a slimmed `{ value, label }` pair. Neither refetches when the slice is already
 * populated, so whichever ran first wins for the rest of the session. A currency that depends
 * on the user's navigation history is not a currency. React Query gives this hook its own
 * copy, deduped across every consumer and cached for the session — the directory is static
 * reference data, so it never needs revalidating.
 */
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { fetchAllCountries } from '@services/options';
import {
    DEFAULT_CURRENCY,
    formatCurrency,
    getCurrencySymbol,
    resolveCurrency,
} from '@utils/currency';

/** One row of the geo directory, narrowed to the fields this hook reads. */
interface CountryRecord {
    iso2?: string;
    currency?: string;
    currency_symbol?: string;
}

/**
 * The geo country directory.
 *
 * `staleTime: Infinity` is not an optimisation, it is the truth about the data: the list of
 * countries and their currencies does not change while a tab is open, and the backend serves
 * it from a seeded static file. One fetch per session, shared by every consumer.
 *
 * Exported because a screen that needs the country list should use this rather than dispatch
 * a third shape into the locations slice.
 */
export const useCountryDirectory = () => {
    const { data } = useQuery<CountryRecord[]>({
        queryKey: ['geo', 'countries'],
        queryFn: fetchAllCountries,
        staleTime: Infinity,
        gcTime: Infinity,
        // A missing directory costs a fallback to INR, not a broken screen — so failing
        // quietly and quickly beats retrying three times behind every money figure.
        retry: false,
    });
    return data;
};

export interface ResolvedCurrency {
    /** ISO 4217, e.g. `INR`. */
    code: string;
    /** The glyph, e.g. `₹`. */
    symbol: string;
    /** `formatCurrency` with the resolved currency already applied. */
    format: (amount: number | string, options?: Intl.NumberFormatOptions) => string;
}

/**
 * The resolved currency for the current user's branch.
 *
 * @example
 * const { symbol, format } = useCurrency();
 * <Typography>{format(offer.ctc)}</Typography>
 */
export const useCurrency = (): ResolvedCurrency => {
    const explicit = useSelector(
        (s: RootState) => (s as any)?.employee?.currentEmployee?.branches?.currency as string | undefined,
    );
    const countryId = useSelector(
        (s: RootState) => (s as any)?.employee?.currentEmployee?.branches?.countryId as string | undefined,
    );

    const countries = useCountryDirectory();

    // `countryId` stores the ISO2 code, not the numeric id — confirmed against live Branches
    // rows ("IN"), and the same assumption the timezone resolution already makes.
    const country = countryId
        ? countries?.find((c) => c.iso2 === countryId)
        : undefined;

    const code = resolveCurrency(explicit, country?.currency);

    // The directory ships a symbol per country; Intl is the fallback for an explicitly set
    // currency whose country is not the branch's own.
    const symbol = (code === country?.currency && country?.currency_symbol)
        || getCurrencySymbol(code);

    return {
        code,
        symbol,
        format: (amount, options) => formatCurrency(amount, code, options),
    };
};

/** The bare ISO code, for the many call sites that only need to pass it on. */
export const useCurrencyCode = (): string => useCurrency().code;

export { DEFAULT_CURRENCY };
