import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * The eye toggle — one switch that hides every amount on a screen.
 *
 * The salary module has had this for a while, but the state lived in `SalaryView` and was
 * prop-drilled to each component that renders a figure. That works for two levels; the
 * reimbursement screen is five deep (page → workspace → table → row → cell), and threading a
 * boolean through five signatures to reach a currency span is the kind of change nobody makes
 * twice — so the second screen goes without the feature instead.
 *
 * A context costs one provider at the page root and one hook at each figure. Default is HIDDEN
 * on nothing: a page with no provider renders normally, so adding the provider is opt-in and no
 * existing screen changes behaviour.
 */

interface SensitiveDataCtx {
    /** True when amounts are readable. Defaults to hidden once a provider is present. */
    visible: boolean;
    toggle: () => void;
    /** The class to put on any element carrying a figure. */
    cls: string;
}

const Ctx = createContext<SensitiveDataCtx>({
    // No provider: nothing is hidden, and `cls` is empty rather than 'visible' so a page that
    // never opted in does not get a transition property on every figure.
    visible: true,
    toggle: () => undefined,
    cls: '',
});

export function SensitiveDataProvider({
    children,
    defaultVisible = false,
}: {
    children: React.ReactNode;
    /** Screens showing one's own data may prefer to open revealed. */
    defaultVisible?: boolean;
}) {
    const [visible, setVisible] = useState(defaultVisible);
    const toggle = useCallback(() => setVisible((v) => !v), []);

    const value = useMemo<SensitiveDataCtx>(() => ({
        visible,
        toggle,
        cls: visible ? 'sensitive-data-visible' : 'sensitive-data-hidden',
    }), [visible, toggle]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Read the toggle. `cls` goes on the element wrapping the figure. */
export const useSensitiveData = () => useContext(Ctx);

export default SensitiveDataProvider;
