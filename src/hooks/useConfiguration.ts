import { safeJsonParse } from '@utils/safeJson';
import { useState, useCallback } from 'react';
import { fetchConfiguration, createNewConfiguration, updateConfigurationById } from '@services/company';
import { successConfirmation, errorConfirmation } from '@utils/modal';

interface UseConfigurationReturn {
    value: boolean;
    loading: boolean;
    saving: boolean;
    handleToggle: (e: React.ChangeEvent<HTMLInputElement>, skipConfirmation?: boolean) => Promise<void>;
    loadConfiguration: () => Promise<void>;
}

export const useConfiguration = (
    configKey: string,
    configField: string,
    onSuccess?: (value: boolean) => void,
    // Optional inheritance scope (group → org → branch). Callers that omit it keep the exact
    // previous behaviour: read whatever the backend resolves, write back by id.
    scope?: { companyId?: string; branchId?: string }
): UseConfigurationReturn => {
    const [configId, setConfigId] = useState<string | null>(null);
    const [value, setValue] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadConfiguration = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetchConfiguration(configKey, undefined, undefined, scope);
            const parsed = safeJsonParse(response?.data?.configuration?.configuration || '{}');

            // Handle both "Launch" and "Lunch" spellings for backward compatibility
            // Priority: configField as-is -> fallback to "Lunch" spelling -> false
            let configValue = parsed?.[configField] ?? false;

            // If configField is "disableLaunchDeductionTime" and value is false/undefined, try "disableLunchDeductionTime"
            if (configField === 'disableLaunchDeductionTime' && !configValue) {
                configValue = parsed?.['disableLunchDeductionTime'] ?? false;
            }

            setValue(configValue);
            setConfigId(response?.data?.configuration?.id || null);

            if (onSuccess) {
                onSuccess(configValue);
            }
        } catch (error) {
            console.error(`Error loading configuration for ${configKey}:`, error);
        } finally {
            setLoading(false);
        }
    }, [configKey, configField, onSuccess, scope?.companyId, scope?.branchId]);

    const handleToggle = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, skipConfirmation = false) => {
        const newValue = e.target.checked;
        console.log(`[useConfiguration] handleToggle called for ${configKey}, newValue:`, newValue, 'skipConfirmation:', skipConfirmation);
        console.log(`[useConfiguration] configId:`, configId);
        setValue(newValue);

        try {
            setSaving(true);
            const payload = { [configField]: newValue };
            console.log(`[useConfiguration] payload:`, payload);

            const scoped = Boolean(scope?.companyId || scope?.branchId);

            if (scoped) {
                // Scoped write: ALWAYS upsert by scope, never PUT by id. `configId` came from a
                // resolved read, so it may belong to an inherited org/global row — updating it
                // would change the default for every other org/branch that inherits it.
                const response = await createNewConfiguration({
                    module: configKey,
                    configuration: payload,
                    companyId: scope?.companyId,
                    branchId: scope?.branchId,
                });
                setConfigId(response?.data?.configuration?.id || null);
            } else if (configId) {
                console.log(`[useConfiguration] Updating existing config with ID:`, configId);
                await updateConfigurationById(configId, {
                    module: configKey,
                    configuration: payload,
                });
            } else {
                console.log(`[useConfiguration] Creating new configuration`);
                const response = await createNewConfiguration({
                    module: configKey,
                    configuration: payload,
                });
                setConfigId(response?.data?.configuration?.id || null);
            }

            console.log(`[useConfiguration] Save successful`);

            // Only show success confirmation if not skipped
            if (!skipConfirmation) {
                successConfirmation('Setting saved successfully!');
            }

            if (onSuccess) {
                onSuccess(newValue);
            }
        } catch (error) {
            console.error(`[useConfiguration] Failed to save ${configKey}:`, error);
            // Always show error confirmation
            errorConfirmation('Failed to save setting.');
            setValue(!newValue);
            throw error; // Re-throw so caller can handle the error
        } finally {
            setSaving(false);
        }
    }, [configId, configKey, configField, onSuccess, scope?.companyId, scope?.branchId]);

    return { value, loading, saving, handleToggle, loadConfiguration };
};
