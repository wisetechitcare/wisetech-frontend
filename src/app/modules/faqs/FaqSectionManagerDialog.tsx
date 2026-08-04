import { useEffect, useState } from 'react';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, GlassHeader } from '@app/modules/common/components/ui/tw/Glass';
import { WtButton } from '@app/modules/common/components/ui/tw/Buttons';
import { Spinner } from '@app/modules/common/components/ui/tw/Spinner';
import { IconBox } from '@app/modules/common/components/ui/tw/Patterns';
import { TRIO } from '@app/modules/common/components/ui/tw/tokens';
import { confirmDialog, toast } from '@app/modules/common/components/ui/feedback';
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

const FIELD_CLASS =
    'w-full rounded-xl border border-[#E6E9EE] bg-white px-3.5 py-2.5 text-[14px] text-slate-900 ' +
    'placeholder:text-slate-400 outline-none transition-colors ' +
    'focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/15 ' +
    'dark:border-[#30363d] dark:bg-[#0d1117] dark:text-slate-100 dark:placeholder:text-slate-500';

/**
 * FAQ section administration.
 *
 * Sections were a hardcoded enum until this existed: renaming "Leaves" or adding
 * "Onboarding" meant a schema migration and a deploy. Admins now do it here.
 *
 * Reordering uses explicit up/down controls rather than drag-and-drop. The kit
 * ships `ReorderableGroup` for drag, but a modal list of six rows is exactly the
 * case where drag is worse: it is unusable by keyboard, awkward on touch, and
 * the whole list is visible at once so there is nothing to drag *across*.
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

    // Close the inline editor whenever the dialog is dismissed, so reopening
    // never resumes a half-finished edit the admin has forgotten about.
    useEffect(() => {
        if (!open) setDraft(null);
    }, [open]);

    const startCreate = () => setDraft({ ...EMPTY_DRAFT });
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
            // verbatim ("still has 7 questions") instead of a generic failure.
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
            maxWidth="lg"
            fullWidth
            header={
                <GlassHeader
                    title="Manage FAQ sections"
                    subtitle="Rename, recolour, reorder or add sections"
                    icon={<KTIcon iconName="abstract-26" className="fs-1 text-white" />}
                    onClose={onClose}
                />
            }
        >
            <div className="flex flex-col gap-4 p-5 sm:p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2.5 py-12 text-slate-500">
                        <Spinner size={18} />
                        <span className="text-[14px]">Loading sections…</span>
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                        {categories.map((category, index) => (
                            <div key={category.id} className="flex items-center gap-3 py-2.5">
                                <IconBox icon={resolveIcon(category.icon)} trio={TRIO[resolveTone(category.tone)]} size={36} fs="fs-4" />

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`truncate text-[14px] font-semibold ${category.isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 line-through'}`}>
                                            {category.name}
                                        </span>
                                        {category.isSystem && (
                                            <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-slate-400">
                                                Built-in
                                            </span>
                                        )}
                                    </div>
                                    <div className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                                        {category.faqCount} question{category.faqCount === 1 ? '' : 's'}
                                        {category.description ? ` · ${category.description}` : ''}
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() => void move(index, -1)}
                                        disabled={index === 0 || isSaving}
                                        aria-label={`Move ${category.name} up`}
                                        className="grid h-8 w-8 place-items-center rounded-[10px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-white/10"
                                    >
                                        <KTIcon iconName="arrow-up" className="fs-6" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void move(index, 1)}
                                        disabled={index === categories.length - 1 || isSaving}
                                        aria-label={`Move ${category.name} down`}
                                        className="grid h-8 w-8 place-items-center rounded-[10px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-white/10"
                                    >
                                        <KTIcon iconName="arrow-down" className="fs-6" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void toggleActive(category)}
                                        aria-label={category.isActive ? `Hide ${category.name}` : `Show ${category.name}`}
                                        title={category.isActive ? 'Visible — click to hide' : 'Hidden — click to show'}
                                        className="grid h-8 w-8 place-items-center rounded-[10px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
                                    >
                                        <KTIcon iconName={category.isActive ? 'eye' : 'eye-slash'} className="fs-6" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => startEdit(category)}
                                        aria-label={`Edit ${category.name}`}
                                        className="grid h-8 w-8 place-items-center rounded-[10px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
                                    >
                                        <KTIcon iconName="pencil" className="fs-6" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleDelete(category)}
                                        disabled={category.isSystem}
                                        title={category.isSystem ? 'Built-in sections cannot be deleted — hide it instead' : 'Delete'}
                                        aria-label={`Delete ${category.name}`}
                                        className="grid h-8 w-8 place-items-center rounded-[10px] text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-400 dark:hover:bg-rose-500/15"
                                    >
                                        <KTIcon iconName="trash" className="fs-6" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Inline editor — create and edit share one form */}
                {draft ? (
                    <div className="flex flex-col gap-4 rounded-2xl border border-[#E6E9EE] bg-slate-50/60 p-4 dark:border-[#30363d] dark:bg-white/[0.03]">
                        <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                            {draft.id ? 'Edit section' : 'New section'}
                        </div>

                        <input
                            className={FIELD_CLASS}
                            value={draft.name}
                            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                            placeholder="Section name, e.g. Onboarding"
                            maxLength={FAQ_CATEGORY_NAME_MAX}
                            aria-label="Section name"
                            autoFocus
                        />

                        <input
                            className={FIELD_CLASS}
                            value={draft.description}
                            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                            placeholder="Short description (optional)"
                            maxLength={FAQ_CATEGORY_DESCRIPTION_MAX}
                            aria-label="Section description"
                        />

                        <div className="flex flex-col gap-2">
                            <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Icon</span>
                            <div className="flex flex-wrap gap-1.5">
                                {FAQ_ICON_CHOICES.map((icon) => (
                                    <button
                                        key={icon}
                                        type="button"
                                        onClick={() => setDraft({ ...draft, icon })}
                                        aria-label={icon}
                                        aria-pressed={draft.icon === icon}
                                        className={`grid h-9 w-9 place-items-center rounded-[10px] border transition-colors ${
                                            draft.icon === icon
                                                ? 'border-[#1E3A8A] bg-[#1E3A8A]/10 text-[#1E3A8A]'
                                                : 'border-[#E6E9EE] text-slate-400 hover:text-slate-700 dark:border-[#30363d]'
                                        }`}
                                    >
                                        <KTIcon iconName={icon} className="fs-5" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Colour</span>
                            <div className="flex flex-wrap gap-1.5">
                                {FAQ_TONE_CHOICES.map((tone) => (
                                    <button
                                        key={tone}
                                        type="button"
                                        onClick={() => setDraft({ ...draft, tone })}
                                        aria-label={tone}
                                        aria-pressed={draft.tone === tone}
                                        className={`h-9 w-9 rounded-[10px] border-2 transition-transform ${draft.tone === tone ? 'scale-110 border-slate-900 dark:border-white' : 'border-transparent'}`}
                                        style={{ backgroundColor: TRIO[tone].c }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <WtButton ghost type="button" onClick={() => setDraft(null)} className="w-full sm:w-auto">
                                Cancel
                            </WtButton>
                            <WtButton
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={!draft.name.trim() || isSaving}
                                startIcon={isSaving ? <Spinner size={14} color="#fff" /> : undefined}
                                className="w-full sm:w-auto"
                            >
                                {draft.id ? 'Save section' : 'Add section'}
                            </WtButton>
                        </div>
                    </div>
                ) : (
                    <WtButton
                        type="button"
                        onClick={startCreate}
                        startIcon={<KTIcon iconName="plus" className="fs-5 text-white" />}
                        className="self-start"
                    >
                        Add section
                    </WtButton>
                )}
            </div>
        </GlassDialog>
    );
}

export default FaqSectionManagerDialog;
