import { useEffect, useState } from 'react';
import { Box, InputAdornment, Stack, TextField, Typography, alpha, useTheme } from '@mui/material';
import { ConfigSectionCard } from '@app/modules/configuration';
import { C, FONT, SP } from '@app/modules/configuration';
import { WtButton } from '@app/modules/common/components/ui';
import { fetchConfiguration, createNewConfiguration, updateConfigurationById } from '@services/company';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { apiErrorMessage } from '@app/pages/employee/tasks/taskDomain';
import { safeJsonParse } from '@utils/safeJson';

/** Matches BILLING_RATE_KEY on the server. */
const MODULE = 'taskBillingRate';

/** The multiples people actually use. Anything else can still be typed. */
const PRESETS = [1, 1.5, 2, 2.5, 3];

/**
 * What the company charges for an hour, as a multiple of what the hour costs it.
 *
 * ─── THE COMPANY DEFAULT, NOT THE ONLY ANSWER ────────────────────────────────
 * This is the figure every project inherits. A project that needs a different one carries its
 * own, and keeps it when this number moves — so raising the default reaches the projects that
 * never had an opinion, and leaves alone the ones that did.
 *
 * It changes NOTHING about pay. An employee costing ₹83.33 an hour still costs ₹83.33 an hour;
 * at 2x, the project their hour was logged against is charged ₹166.66 for it. Saying that out
 * loud on the card is the point: a multiplier with no stated subject is the kind of setting
 * somebody changes thinking it is a pay rise.
 */
const BillingRateCard = () => {
    const theme = useTheme();
    const dark = theme.palette.mode === 'dark';
    const [value, setValue] = useState('1');
    const [saved, setSaved] = useState('1');
    const [configId, setConfigId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        // A module with no saved row answers 400 — that is "not configured", not an error.
        fetchConfiguration(MODULE)
            .then((res: any) => {
                if (cancelled) return;
                const row = res?.data?.configuration;
                const cfg = safeJsonParse(row?.configuration || '{}');
                const n = Number(cfg?.multiplier);
                const clean = Number.isFinite(n) && n > 0 ? String(n) : '1';
                setValue(clean);
                setSaved(clean);
                setConfigId(row?.id ?? null);
            })
            .catch(() => { /* nothing saved yet; 1x stands */ });
        return () => { cancelled = true; };
    }, []);

    const parsed = Number(value);
    const valid = Number.isFinite(parsed) && parsed > 0;
    const dirty = value !== saved;

    const save = async () => {
        if (!valid) return;
        setBusy(true);
        try {
            const configuration = { multiplier: parsed };
            if (configId) {
                await updateConfigurationById(configId, { module: MODULE, configuration });
            } else {
                const res: any = await createNewConfiguration({ module: MODULE, configuration });
                setConfigId(res?.data?.configuration?.id ?? null);
            }
            setSaved(String(parsed));
            setValue(String(parsed));
            successConfirmation(`Projects are now billed at ${parsed}× the cost of an hour`);
        } catch (error) {
            errorConfirmation(apiErrorMessage(error, 'Could not save the billing rate.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <ConfigSectionCard
            title="Billing rate"
            description="What projects are charged per hour, as a multiple of what the hour costs"
            icon="bi-cash-coin"
            iconColor="green"
        >
            <Box sx={{ mt: 2 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap" useFlexGap>
                    <TextField
                        size="small"
                        type="number"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        error={!!value && !valid}
                        helperText={!!value && !valid ? 'Must be greater than zero' : ' '}
                        inputProps={{ min: 0.1, step: 0.25, 'aria-label': 'Billing rate multiplier' }}
                        InputProps={{ endAdornment: <InputAdornment position="end">×</InputAdornment> }}
                        sx={{ width: 140 }}
                    />
                    <Stack direction="row" spacing={0.75} sx={{ pt: 0.5 }} flexWrap="wrap" useFlexGap>
                        {PRESETS.map((p) => (
                            <Box
                                key={p}
                                component="button"
                                type="button"
                                onClick={() => setValue(String(p))}
                                sx={{
                                    px: 1.25, py: 0.5, borderRadius: 2, cursor: 'pointer',
                                    fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
                                    border: '1px solid',
                                    borderColor: parsed === p ? 'primary.main' : 'divider',
                                    bgcolor: parsed === p ? 'primary.main' : 'background.paper',
                                    color: parsed === p ? 'primary.contrastText' : 'text.primary',
                                }}
                            >
                                {p}×
                            </Box>
                        ))}
                    </Stack>
                    <Box sx={{ flex: 1, minWidth: 8 }} />
                    <WtButton onClick={() => void save()} disabled={!valid || !dirty || busy}>
                        {busy ? 'saving…' : 'save'}
                    </WtButton>
                </Stack>

                {/* The worked example, because "2×" on its own does not say what it multiplies.
                    Concrete numbers are what stop somebody reading this as a pay setting. */}
                <Box sx={{
                    mt: 1, p: 1.5, borderRadius: 2,
                    bgcolor: alpha(theme.palette.success.main, dark ? 0.16 : 0.07),
                }}>
                    <Typography sx={{ fontFamily: FONT.body, fontSize: 13, color: C.textPrimary }}>
                        An hour that costs <strong>₹83.33</strong> is billed at{' '}
                        <strong>₹{valid ? (83.3333 * parsed).toFixed(2) : '—'}</strong>.
                    </Typography>
                    <Typography sx={{ fontFamily: FONT.body, fontSize: 12, color: C.textMuted, marginTop: SP.xs }}>
                        Salaries are unaffected.
                    </Typography>
                </Box>
            </Box>
        </ConfigSectionCard>
    );
};

export default BillingRateCard;
