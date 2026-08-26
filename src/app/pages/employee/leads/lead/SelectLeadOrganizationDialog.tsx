import React, { useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { OptionPickerDialog } from '@app/modules/common/components/ui';
import SmartAvatar from '@app/modules/common/components/SmartAvatar';
import { useOrgScope } from '@hooks/useOrgScope';
import { fetchAllPrefixSettings } from '@services/options';
import type { PrefixSetting } from '@app/modules/common/components/PrefixSettingsForm';

/**
 * Asks which organization a new lead belongs to, before the wizard opens.
 *
 * The organization decides the lead's prefix and number series, so it has to be
 * settled up front rather than buried in the form. Organizations without a lead
 * prefix are shown but not selectable — creating a lead there would fail on the
 * server, and saying so here is cheaper than letting the user fill in a whole
 * wizard first.
 */

interface SelectLeadOrganizationDialogProps {
    open: boolean;
    onClose: () => void;
    /** Called with the chosen organization once Continue is pressed. */
    onContinue: (organizationId: string, organizationName: string) => void;
}

const SelectLeadOrganizationDialog: React.FC<SelectLeadOrganizationDialogProps> = ({
    open,
    onClose,
    onContinue,
}) => {
    // includeAll is off: a lead belongs to exactly one organization (we include
    // root organization now, and filter out those without a lead prefix configured).
    const { organizations, isLoading: orgsLoading } = useOrgScope({
        includeAll: false,
        initialScopeId: '',
        subOrgsOnly: false,
    });
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [prefixByOrg, setPrefixByOrg] = useState<Record<string, string>>({});
    const [prefixesLoading, setPrefixesLoading] = useState(false);

    // Which organizations actually have a lead prefix, so unconfigured ones can
    // be called out instead of failing later on the server.
    useEffect(() => {
        if (!open) return;
        let cancelled = false;

        (async () => {
            try {
                setPrefixesLoading(true);
                const response = await fetchAllPrefixSettings();
                if (cancelled) return;

                const map: Record<string, string> = {};
                for (const setting of (response?.data?.prefixSettings ?? []) as PrefixSetting[]) {
                    if (setting.identifier === 'LEAD' && setting.organizationId) {
                        map[setting.organizationId] = setting.prefix;
                    }
                }
                setPrefixByOrg(map);
            } catch {
                // A failed lookup must not block the dialog — the server still
                // enforces the rule, so fall back to letting the user proceed.
                if (!cancelled) setPrefixByOrg({});
            } finally {
                if (!cancelled) setPrefixesLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [open]);

    const isLoading = orgsLoading || prefixesLoading;

    const options = useMemo(
        () =>
            organizations
                .filter((org) => !!prefixByOrg[org.id])
                .map((org) => {
                    const prefix = prefixByOrg[org.id];
                    return {
                        id: org.id,
                        name: org.name,
                        caption: `Prefix ${prefix}`,
                        disabled: false,
                        // The org's own logo, with a deterministic initials avatar when none is set.
                        leading: (
                            <SmartAvatar
                                name={org.name}
                                id={org.id}
                                imageUrl={org.logo}
                                size={76}
                                shape="rounded"
                                imageFit="contain"
                            />
                        ),
                    };
                }),
        [organizations, prefixByOrg],
    );

    // Preselect the first usable organization so the common case is one click.
    useEffect(() => {
        if (!open) return;
        if (selectedId && prefixByOrg[selectedId]) return;
        const firstUsable = organizations.find((org) => prefixByOrg[org.id]);
        setSelectedId(firstUsable?.id ?? null);
    }, [open, organizations, prefixByOrg, selectedId]);

    const selectedOrg = organizations.find((org) => org.id === selectedId) ?? null;
    const hasConfigured = options.some((option) => !option.disabled);

    const handleContinue = () => {
        if (selectedOrg) onContinue(selectedOrg.id, selectedOrg.name);
    };

    return (
        <OptionPickerDialog
            open={open}
            onClose={onClose}
            title="Create New Lead"
            subtitle="Choose the organization this lead belongs to"
            icon={<KTIcon iconName="office-bag" className="fs-1 text-white" />}
            options={options}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onConfirm={handleContinue}
            confirmLabel="Continue"
            confirmDisabled={!selectedOrg || isLoading}
            maxWidth="sm"
            layout="grid"
            gridMin={168}
        >
            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={22} />
                </Box>
            )}

            {!isLoading && !hasConfigured && (
                <Typography variant="body2" sx={{ color: 'warning.main', mt: 1 }}>
                    No organization has a lead prefix yet. Set one in Leads → Configuration
                    before creating leads.
                </Typography>
            )}

            {!isLoading && selectedOrg && (
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                    This lead will be created under <strong>{selectedOrg.name}</strong>, and
                    numbered using its prefix.
                </Typography>
            )}
        </OptionPickerDialog>
    );
};

export default SelectLeadOrganizationDialog;
