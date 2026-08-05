import { useEffect, useState } from 'react';
import { Box, CircularProgress, Grid, Stack, TextField, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
// Same MUI glass kit as the Leave Policy / Sandwich Leave benchmark — one import
// surface, one look. Do not reach past this barrel into individual kit files.
import {
    TRIO, WtButton, WtIconButton, GlassDialog, GlassHeader, GlassSurface,
    SettingsSection, StatTile, StatusBadge, IconBox, confirmDialog, toast,
} from '@app/modules/common/components/ui';
import { IconPicker, TonePicker } from '@app/modules/common/components/ui/tw/SwatchPicker';
import { readConflict, useFaqCategories } from './useFaqCategories';
import {
    FAQ_CATEGORY_DESCRIPTION_MAX,
    FAQ_CATEGORY_NAME_MAX,
    FAQ_ICON_CHOICES,
    FAQ_TONE_CHOICES,
    resolveIcon,
    resolveTone,
    type FaqCategory,
} from './types';

type Draft = { id?: string; name: string; icon: string; tone: string; description: string };

const EMPTY_DRAFT: Draft = { name: '', icon: 'questionnaire-tablet', tone: 'blue', description: '' };

/**
 * The MUI WtIconButton is 44px — correct for a primary action row, too heavy for
 * five controls on a compact list row. Its size is set via `sx`, unlike the
 * Tailwind twin which takes a numeric `size` prop. Declared once here rather
 * than repeated on every button.
 */
const COMPACT_ICON_BTN = { width: 32, height: 32, borderRadius: '10px' } as const;

/**
 * FAQ section administration.
 *
 * Sections were a hardcoded Prisma enum until this existed: renaming "Leaves" or
 * adding "Onboarding" meant a schema migration and a deploy. Admins now do it here.
 *
 * Composed exactly like LeavePolicyModal — GlassDialog + GlassHeader, a StatTile
 * summary row, then SettingsSection blocks — so a user who knows one settings
 * engine already knows this one.
 */
export interface FaqSectionManagerDialogProps {
    open: boolean;
    onClose: () => void;
}

export function FaqSectionManagerDialog({ open, onClose }: FaqSectionManagerDialogProps) {
    const {
        categories,
        isLoading,
        createCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        isSaving,
    } = useFaqCategories({ includeInactive: true });

    const [draft, setDraft] = useState<Draft | null>(null);

    // Close the inline editor when the dialog is dismissed, so reopening never
    // resumes a half-finished edit the admin has forgotten about.
    useEffect(() => {
        if (!open) setDraft(null);
    }, [open]);

    const activeCount = categories.filter((category) => category.isActive).length;
    const questionCount = categories.reduce((sum, category) => sum + category.faqCount, 0);
    const customCount = categories.filter((category) => !category.isSystem).length;

    const startEdit = (category: FaqCategory) =>
        setDraft({
            id: category.id,
            name: category.name,
            icon: resolveIcon(category.icon),
            tone: resolveTone(category.tone),
            description: category.description ?? '',
        });

    const handleSave = async () => {
        if (!draft?.name.trim()) return;
        const payload = {
            name: draft.name.trim(),
            icon: draft.icon,
            tone: draft.tone,
            description: draft.description.trim() || null,
        };
        try {
            if (draft.id) {
                await updateCategory({ id: draft.id, ...payload });
                toast({ title: 'Section updated', icon: 'success' });
            } else {
                await createCategory(payload);
                toast({ title: 'Section added', icon: 'success' });
            }
            setDraft(null);
        } catch {
            toast({ title: 'Could not save the section', icon: 'error' });
        }
    };

    const handleDelete = async (category: FaqCategory) => {
        const confirmed = await confirmDialog({
            title: `Delete "${category.name}"?`,
            text: 'This removes the section. It cannot be undone.',
            confirmText: 'Delete',
            danger: true,
        });
        if (!confirmed) return;
        try {
            await deleteCategory(category.id);
            toast({ title: 'Section deleted', icon: 'success' });
        } catch (error) {
            // A 409 is the server refusing on purpose — surface its reason
            // verbatim ("still has 7 questions") rather than a generic failure.
            const conflict = readConflict(error);
            toast({ title: conflict?.message ?? 'Could not delete the section', icon: conflict ? 'warning' : 'error' });
        }
    };

    const move = async (index: number, direction: -1 | 1) => {
        const next = [...categories];
        const target = index + direction;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        try {
            await reorderCategories(next.map((category) => category.id));
        } catch {
            toast({ title: 'Could not reorder sections', icon: 'error' });
        }
    };

    const toggleActive = async (category: FaqCategory) => {
        try {
            await updateCategory({ id: category.id, name: category.name, isActive: !category.isActive });
        } catch {
            toast({ title: 'Could not change visibility', icon: 'error' });
        }
    };

    return (
        <GlassDialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            header={
                <GlassHeader
                    title="FAQ sections"
                    subtitle="Rename, recolour, reorder or add sections"
                    icon={<KTIcon iconName="category" className="fs-1" />}
                    onClose={onClose}
                />
            }
        >
            <Box sx={{ p: { xs: 2, sm: 2.75 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Summary row — same StatTile grid the Leave Policy engine opens with. */}
                <Grid container spacing={{ xs: 1.25, sm: 2 }}>
                    <Grid item xs={6} md={4}>
                        <StatTile label="Sections" value={`${activeCount}/${categories.length}`} trio={TRIO.blue} icon="category" />
                    </Grid>
                    <Grid item xs={6} md={4}>
                        <StatTile label="Questions" value={questionCount} trio={TRIO.green} icon="questionnaire-tablet" />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <StatTile label="Custom" value={customCount} trio={customCount ? TRIO.purple : TRIO.slate} icon="element-plus" />
                    </Grid>
                </Grid>

                {isLoading ? (
                    <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 6 }}>
                        <CircularProgress size={22} />
                        <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>Loading sections…</Typography>
                    </Stack>
                ) : (
                    <Stack spacing={1.25}>
                        {categories.map((category, index) => {
                            const tone = TRIO[resolveTone(category.tone)];
                            return (
                                <GlassSurface
                                    key={category.id}
                                    variant="thin"
                                    radius={12}
                                    sx={{
                                        p: 1.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        borderLeft: `3px solid ${tone.c}`,
                                        opacity: category.isActive ? 1 : 0.55,
                                    }}
                                >
                                    <IconBox icon={resolveIcon(category.icon)} trio={tone} size={36} fs="fs-3" />

                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                                            <Typography
                                                noWrap
                                                sx={{
                                                    fontSize: 14,
                                                    fontWeight: 700,
                                                    color: 'text.primary',
                                                    textDecoration: category.isActive ? 'none' : 'line-through',
                                                }}
                                            >
                                                {category.name}
                                            </Typography>
                                            {category.isSystem && <StatusBadge trio={TRIO.slate} label="Built-in" />}
                                        </Stack>
                                        <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                                            {category.faqCount} question{category.faqCount === 1 ? '' : 's'}
                                            {category.description ? ` · ${category.description}` : ''}
                                        </Typography>
                                    </Box>

                                    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                                        <WtIconButton sx={COMPACT_ICON_BTN} title={`Move ${category.name} up`}
                                            disabled={index === 0 || isSaving} onClick={() => void move(index, -1)}>
                                            <KTIcon iconName="arrow-up" className="fs-7" />
                                        </WtIconButton>
                                        <WtIconButton sx={COMPACT_ICON_BTN} title={`Move ${category.name} down`}
                                            disabled={index === categories.length - 1 || isSaving} onClick={() => void move(index, 1)}>
                                            <KTIcon iconName="arrow-down" className="fs-7" />
                                        </WtIconButton>
                                        <WtIconButton sx={COMPACT_ICON_BTN} color={category.isActive ? TRIO.green.c : TRIO.slate.c}
                                            title={category.isActive ? `Visible — hide ${category.name}` : `Hidden — show ${category.name}`}
                                            onClick={() => void toggleActive(category)}>
                                            <KTIcon iconName={category.isActive ? 'eye' : 'eye-slash'} className="fs-7" />
                                        </WtIconButton>
                                        <WtIconButton sx={COMPACT_ICON_BTN} color={TRIO.blue.c} title={`Edit ${category.name}`}
                                            onClick={() => startEdit(category)}>
                                            <KTIcon iconName="pencil" className="fs-7" />
                                        </WtIconButton>
                                        <WtIconButton sx={COMPACT_ICON_BTN} color={TRIO.rose.c} disabled={category.isSystem}
                                            title={category.isSystem ? 'Built-in sections cannot be deleted — hide it instead' : `Delete ${category.name}`}
                                            onClick={() => void handleDelete(category)}>
                                            <KTIcon iconName="trash" className="fs-7" />
                                        </WtIconButton>
                                    </Stack>
                                </GlassSurface>
                            );
                        })}
                    </Stack>
                )}

                {/* Create / edit — one SettingsSection, the same block the config engines use. */}
                {draft ? (
                    <SettingsSection
                        tone={TRIO[resolveTone(draft.tone)]}
                        icon={draft.icon}
                        title={draft.id ? 'Edit section' : 'New section'}
                        description="Name it, then pick how it should look on the board."
                    >
                        <Stack spacing={2}>
                            <TextField
                                autoFocus
                                size="small"
                                label="Section name"
                                placeholder="e.g. Onboarding"
                                value={draft.name}
                                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                                inputProps={{ maxLength: FAQ_CATEGORY_NAME_MAX }}
                                fullWidth
                            />
                            <TextField
                                size="small"
                                label="Description"
                                placeholder="Optional — shown under the section heading"
                                value={draft.description}
                                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                                inputProps={{ maxLength: FAQ_CATEGORY_DESCRIPTION_MAX }}
                                fullWidth
                            />

                            <Box>
                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1 }}>Icon</Typography>
                                <IconPicker label="Section icon" value={draft.icon} options={FAQ_ICON_CHOICES}
                                    onChange={(icon) => setDraft({ ...draft, icon })} />
                            </Box>

                            <Box>
                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1 }}>Colour</Typography>
                                <TonePicker label="Section colour" value={draft.tone} options={FAQ_TONE_CHOICES}
                                    onChange={(tone) => setDraft({ ...draft, tone })} />
                            </Box>

                            <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.25} justifyContent="flex-end">
                                <WtButton ghost onClick={() => setDraft(null)}>Cancel</WtButton>
                                <WtButton
                                    onClick={() => void handleSave()}
                                    disabled={!draft.name.trim() || isSaving}
                                    startIcon={isSaving ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : undefined}
                                >
                                    {draft.id ? 'Save section' : 'Add section'}
                                </WtButton>
                            </Stack>
                        </Stack>
                    </SettingsSection>
                ) : (
                    <WtButton
                        onClick={() => setDraft({ ...EMPTY_DRAFT })}
                        startIcon={<KTIcon iconName="plus" className="fs-5" />}
                        sx={{ alignSelf: 'flex-start' }}
                    >
                        Add section
                    </WtButton>
                )}
            </Box>
        </GlassDialog>
    );
}

export default FaqSectionManagerDialog;
