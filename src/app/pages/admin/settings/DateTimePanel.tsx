/**
 * Date & Time — where the app-wide 12/24h choice is made.
 *
 * Two sections, because there are two decisions and they belong to different
 * people:
 *
 *   Your preference       →  this person, this browser, effective immediately
 *   Organisation default  →  everyone who hasn't chosen (admins only)
 *
 * Keeping them on one screen is the point: an admin setting the house standard
 * can see what their own override is doing to it, which is the thing that
 * otherwise generates the "I changed it and nothing happened" ticket.
 *
 * The precedence chain itself (personal → branch → org → 12h) lives in
 * `utils/timeFormat.ts` and is not re-implemented here — this screen only reads
 * and writes its two ends.
 */
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { KTIcon } from '@metronic/helpers';
import { SegmentedControl, SettingsSection, toast } from '@app/modules/common/components/ui';
import { TRIO } from '@app/modules/common/components/ui/tw/tokens';
import { usePermission } from '@hooks/usePermission';
import { useTimeFormatSetting } from '@hooks/useTimeFormat';
import { saveCurrentCompanyInfo } from '@redux/slices/company';
import type { RootState } from '@redux/store';
import { updateCompanyOverview } from '@services/company';
import {
    TIME_FORMAT_OPTIONS,
    TIME_TOKENS,
    normalizeTimeFormatFlag,
    type TimeFormat,
    type TimeFormatPreference,
} from '@utils/timeFormat';

/** The org-level choice is binary — it has no "inherit" above it to defer to. */
const ORG_OPTIONS: ReadonlyArray<{ value: TimeFormat; label: string }> = [
    { value: '12h', label: '12-hour' },
    { value: '24h', label: '24-hour' },
];

/**
 * A worked example rather than a label.
 *
 * Shows a fixed afternoon time, not `now`: at 09:00 the two formats render
 * identically apart from a suffix, and the control looks broken. 14:30 is
 * unambiguous at a glance in either.
 */
const SAMPLE = dayjs().hour(14).minute(30).second(0);

function Preview({ format }: { format: TimeFormat }) {
    return (
        <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Times will look like
            </Typography>
            <Typography
                component="output"
                sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '1.05rem' }}
            >
                {SAMPLE.format(TIME_TOKENS[format].TIME)}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                · {SAMPLE.format(TIME_TOKENS[format].DATETIME)}
            </Typography>
        </Stack>
    );
}

export function DateTimePanel() {
    const dispatch = useDispatch();
    const canManageOrg = usePermission('settings.manage.all');
    const { preference, resolved, setPreference } = useTimeFormatSetting();

    // The whole record, because `saveCurrentCompanyInfo` REPLACES `currentCompany`
    // rather than merging into it — writing back only the id and the flag would
    // drop the fiscal year every other screen reads off this slice.
    const currentCompany = useSelector((s: RootState) => (s as any)?.company?.currentCompany);
    const companyId: string = currentCompany?.id;
    const orgFlag = currentCompany?.showDateIn12HourFormat;

    // The org's own answer, independent of what this admin has personally chosen.
    // An org that has never been configured shows the 12h default it resolves to.
    const storedOrgFormat: TimeFormat = normalizeTimeFormatFlag(orgFlag) === false ? '24h' : '12h';

    const [orgFormat, setOrgFormat] = useState<TimeFormat>(storedOrgFormat);
    const [saving, setSaving] = useState(false);

    // The company slice hydrates lazily, so the stored value can arrive after
    // this mounts. Follow it until the admin touches the control themselves.
    useEffect(() => { setOrgFormat(storedOrgFormat); }, [storedOrgFormat]);

    const saveOrgFormat = useCallback(async (next: TimeFormat) => {
        if (!companyId) {
            toast({ icon: 'error', title: 'No organisation selected', text: 'There is nothing to save this to.' });
            return;
        }
        const previous = orgFormat;
        setOrgFormat(next);          // optimistic — the control must not lag the click
        setSaving(true);
        try {
            // '1'/'0' is the shape both company handlers have always parsed. They
            // accept a real boolean now too, but this keeps one convention on the wire.
            const wireValue = next === '12h' ? '1' : '0';
            const res = await updateCompanyOverview(companyId, { showDateIn12HourFormat: wireValue } as any);
            if (!res || res.hasError) throw new Error('Update rejected');

            // Mirror into Redux so the resolver sees it without a refetch — this is
            // what makes every open screen re-render into the new format at once.
            dispatch(saveCurrentCompanyInfo({
                ...currentCompany,
                showDateIn12HourFormat: wireValue,
            }) as any);
            toast({ icon: 'success', title: `Organisation times are now ${next === '12h' ? '12-hour' : '24-hour'}` });
        } catch {
            setOrgFormat(previous);
            toast({ icon: 'error', title: 'Could not save the organisation time format' });
        } finally {
            setSaving(false);
        }
    }, [companyId, currentCompany, dispatch, orgFormat]);

    return (
        <Stack spacing={2}>
            <SettingsSection
                tone={TRIO.blue}
                icon="time"
                title="your time format"
                description="How times are shown to you, everywhere in the app."
            >
                <Stack spacing={1.75}>
                    <SegmentedControl<TimeFormatPreference>
                        options={TIME_FORMAT_OPTIONS}
                        value={preference}
                        onChange={setPreference}
                        ariaLabel="Your time format"
                        fullWidth
                        sx={{ maxWidth: { sm: 420 } }}
                    />
                    <Preview format={resolved} />
                    {preference === 'inherit' && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Following your organisation. If it changes, yours changes with it.
                        </Typography>
                    )}
                    {preference !== 'inherit' && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Your own choice, saved in this browser — it overrides the organisation
                            default and stays put if that changes.
                        </Typography>
                    )}
                </Stack>
            </SettingsSection>

            {canManageOrg && (
                <SettingsSection
                    tone={TRIO.purple}
                    icon="office-bag"
                    title="organisation default"
                    description="What everyone who hasn't picked their own format sees."
                >
                    <Stack spacing={1.75}>
                        <SegmentedControl<TimeFormat>
                            options={ORG_OPTIONS}
                            value={orgFormat}
                            onChange={saveOrgFormat}
                            ariaLabel="Organisation time format"
                            fullWidth
                            sx={{ maxWidth: { sm: 320 }, opacity: saving ? 0.6 : 1 }}
                        />
                        <Preview format={orgFormat} />
                        {preference !== 'inherit' && (
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                <KTIcon iconName="information-2" className="fs-5 text-warning mt-1" />
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    You have your own format set above, so this change won't alter
                                    what <strong>you</strong> see — only everyone still following the
                                    organisation.
                                </Typography>
                            </Stack>
                        )}
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Payslip PDFs and payroll emails follow this setting too. A branch with
                            its own format set in Branches keeps it.
                        </Typography>
                    </Stack>
                </SettingsSection>
            )}
        </Stack>
    );
}

export default DateTimePanel;
