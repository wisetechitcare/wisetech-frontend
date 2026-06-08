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
    onSuccess?: (value: boolean) => void
): UseConfigurationReturn => {
    const [configId, setConfigId] = useState<string | null>(null);
    const [value, setValue] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadConfiguration = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetchConfiguration(configKey);
            const parsed = JSON.parse(response?.data?.configuration?.configuration || '{}');

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
    }, [configKey, configField, onSuccess]);

    const handleToggle = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, skipConfirmation = false) => {
        const newValue = e.target.checked;
        console.log(`[useConfiguration] handleToggle called for ${configKey}, newValue:`, newValue, 'skipConfirmation:', skipConfirmation);
        console.log(`[useConfiguration] configId:`, configId);
        setValue(newValue);

        try {
            setSaving(true);
            const payload = { [configField]: newValue };
            console.log(`[useConfiguration] payload:`, payload);

            if (configId) {
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
    }, [configId, configKey, configField, onSuccess]);

    return { value, loading, saving, handleToggle, loadConfiguration };
};
