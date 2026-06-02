import { useState, useEffect, useCallback, useRef } from 'react';
import { draftApi } from '@services/draft';

export interface DraftData {
    entityType: 'lead' | 'project';
    entityId: string;
    currentStep: number;
    completionPercentage: number;
    formData: Record<string, any>;
    uiState: Record<string, any>;
    lastSavedAt: string;
    updatedBy: string;
    status: 'DRAFT';
}

interface UseDraftOptions {
    entityType: 'lead' | 'project';
    entityId: string; // use "new" for create mode
    enabled: boolean;
    totalSteps?: number;
    /** When true, only explicit saveDraft() writes Redis; recovery modal only for manual saves */
    manualOnly?: boolean;
}

export function useDraft({ entityType, entityId, enabled, totalSteps = 7, manualOnly = false }: UseDraftOptions) {
    const [existingDraft, setExistingDraft] = useState<DraftData | null>(null);
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const periodicTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const formValuesRef = useRef<any>(null);
    const currentStepRef = useRef<number>(0);

    // Check Redis for existing draft on mount
    useEffect(() => {
        if (!enabled || !entityId) return;

        draftApi.get(entityType, entityId)
            .then(async (res) => {
                const draft = res.data?.draft;
                if (!draft) return;
                if (draft.uiState?.savedManually === true) {
                    setExistingDraft(draft);
                    setShowRecoveryModal(true);
                } else if (manualOnly) {
                    // Clear old auto-saved drafts so they never prompt recovery
                    try {
                        await draftApi.delete(entityType, entityId);
                    } catch {
                        /* ignore */
                    }
                }
            })
            .catch(() => {
                // Silently ignore — no draft found or network error
            });
    }, [entityType, entityId, enabled]);

    // Periodic auto-save every 45 seconds (skipped when manualOnly)
    useEffect(() => {
        if (!enabled || manualOnly) return;

        periodicTimerRef.current = setInterval(() => {
            if (isDirty && formValuesRef.current) {
                performSave(formValuesRef.current, currentStepRef.current, {});
            }
        }, 45000);

        return () => {
            if (periodicTimerRef.current) clearInterval(periodicTimerRef.current);
        };
    }, [enabled, isDirty, manualOnly]);

    // beforeunload protection
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    const performSave = useCallback(async (
        formValues: any,
        currentStep: number,
        uiState: Record<string, any>
    ) => {
        if (!entityId) return;
        setIsSaving(true);
        try {
            await draftApi.save({
                entityType,
                entityId,
                currentStep,
                completionPercentage: Math.round(((currentStep + 1) / totalSteps) * 100),
                formData: formValues,
                uiState,
            });
            setIsDirty(false);
            setLastSaved(new Date());
        } catch {
            // Silently ignore save errors — non-critical
        } finally {
            setIsSaving(false);
        }
    }, [entityType, entityId, totalSteps]);

    const saveDraft = useCallback(async (
        formValues: any,
        currentStep: number,
        uiState: Record<string, any> = {}
    ) => {
        formValuesRef.current = formValues;
        currentStepRef.current = currentStep;
        await performSave(formValues, currentStep, { ...uiState, savedManually: true });
    }, [performSave]);

    // Debounced auto-save triggered by form changes (2 seconds)
    const autoSaveDraft = useCallback((
        formValues: any,
        currentStep: number,
        uiState: Record<string, any> = {}
    ) => {
        if (!entityId || manualOnly) return;
        formValuesRef.current = formValues;
        currentStepRef.current = currentStep;
        setIsDirty(true);

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
            performSave(formValues, currentStep, uiState);
        }, 2000);
    }, [entityId, performSave, manualOnly]);

    const discardDraft = useCallback(async () => {
        if (!entityId) return;
        try {
            await draftApi.delete(entityType, entityId);
        } catch {
            // Silently ignore
        }
        setExistingDraft(null);
        setIsDirty(false);
        setLastSaved(null);
    }, [entityType, entityId]);

    // Called after successful DB save to clear the Redis draft
    const clearDraftAfterSave = useCallback(async () => {
        await discardDraft();
    }, [discardDraft]);

    const markDirty = useCallback(() => setIsDirty(true), []);

    return {
        existingDraft,
        showRecoveryModal,
        showUnsavedModal,
        isDirty,
        isSaving,
        lastSaved,
        saveDraft,
        autoSaveDraft,
        discardDraft,
        clearDraftAfterSave,
        markDirty,
        setShowRecoveryModal,
        setShowUnsavedModal,
    };
}
