import React, { useEffect, useRef } from 'react';
import { useFormikContext } from 'formik';

interface DraftAutoSaveProps {
    onAutoSave: (values: any, currentStep: number) => void;
    currentStep: number;
    debounceMs?: number;
}

/**
 * Invisible component that auto-saves Formik values when they change.
 * Must be rendered inside a Formik context.
 */
export const DraftAutoSave: React.FC<DraftAutoSaveProps> = ({
    onAutoSave,
    currentStep,
    debounceMs = 2000,
}) => {
    const { values, dirty } = useFormikContext<any>();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFirstRender = useRef(true);

    useEffect(() => {
        // Skip the very first render to avoid auto-saving on open
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (!dirty) return;

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            onAutoSave(values, currentStep);
        }, debounceMs);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [values]);

    return null;
};

export default DraftAutoSave;
