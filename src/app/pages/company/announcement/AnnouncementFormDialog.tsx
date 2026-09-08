/**
 * Create / edit an announcement — one dialog for both.
 *
 * There used to be two copies of this form, one in `CreateAnnouncementButton` and one inlined
 * at the bottom of the announcements page, ~230 lines each and identical apart from which
 * service call they ended on. They were also the last react-bootstrap `<Modal>` + Formik +
 * stacked-`<label>` form in this area, which is why the announcement form looked like a
 * different application from the task form beside it.
 *
 * This is the same shape as `TaskFormDialog`: the kit's `GlassDialog` + `GlassHeader`, MUI
 * fields with the label notched into the border, `WtDateField` for dates, and a footer of
 * `WtButton`s pinned below a scrolling body.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Autocomplete, Avatar, Box, Chip, CircularProgress, Grid, Stack, TextField, Typography,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { RootState } from '@redux/store';
import { ShareWith } from '@constants/statistics';
import { IAnnouncement } from '@models/company';
import { createAnnouncement, updateAnnouncementById } from '@services/company';
import { fetchAllUsers } from '@services/users';
import { apiErrorMessage } from '@utils/apiError';
import { uploadUserAsset } from '@services/uploader';
import {
    GlassDialog, GlassHeader, SegmentedControl, WtButton, WtDateField, toast,
} from '@app/modules/common/components/ui';
import {
    POSTER_ACCEPT, POSTER_ASPECT, POSTER_HINT, POSTER_SIZE_HINT, inspectPosterFile,
} from './announcementPoster';
import PosterFrame from './PosterFrame';

type Audience = typeof ShareWith.EVERYONE | typeof ShareWith.SELECTED_MEMBERS;

interface UserOption {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
}

export interface AnnouncementFormDialogProps {
    open: boolean;
    onClose: () => void;
    /** Present when editing; absent when creating. */
    announcement?: IAnnouncement | null;
    /** Fired after a successful save, so the caller can refetch. */
    onSaved: () => void;
}

interface FormValues {
    title: string;
    description: string;
    shareWith: Audience;
    fromDate: string;
    toDate: string;
    selectedUsers: UserOption[];
    imageUrl: string;
}

const EMPTY: FormValues = {
    title: '',
    description: '',
    shareWith: ShareWith.EVERYONE as Audience,
    fromDate: '',
    toDate: '',
    selectedUsers: [],
    imageUrl: '',
};

/** Both the API and `WtDateField` speak `YYYY-MM-DD`; stored values come back as full ISO. */
const toWire = (v?: string | null) => (v ? dayjs(v).format('YYYY-MM-DD') : '');

const userName = (u: UserOption) =>
    [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Unnamed user';

/**
 * Why an upload failed, in terms the person reading it can act on.
 *
 * `apiErrorMessage` returns the server's own sentence, which is the best answer whenever the API
 * actually replied in its own envelope. But an upload can fail in ways that never reach the API:
 * a proxy that caps request bodies answers 413 with an HTML page, a cold or crashed instance
 * answers 502/504, and a CORS or network failure produces no response at all. In every one of
 * those the envelope is absent and a bare "please try again" is a dead end — the admin retries
 * the same file, it fails the same way, and nobody learns anything. So when there is no sentence
 * to show, say what layer refused and quote the status, which is what makes it diagnosable.
 */
const uploadFailureMessage = (error: unknown): string => {
    const sentence = apiErrorMessage(error, '');
    if (sentence) return sentence;

    const status = (error as { response?: { status?: number } })?.response?.status;
    if (!status) {
        return 'The server could not be reached, so the image was not uploaded. Check your connection '
            + 'and try again — if it keeps happening the upload service may be down.';
    }
    if (status === 413) {
        return 'The server rejected this file as too large (HTTP 413) before it finished uploading. '
            + 'This is a limit in front of the application, not the app itself, so a smaller image '
            + 'should work — please report it if a small one fails too.';
    }
    return `The upload was refused with HTTP ${status} and no explanation, which usually means the `
        + `request did not reach the application. Please report this status code.`;
};

export const AnnouncementFormDialog = ({
    open, onClose, announcement, onSaved,
}: AnnouncementFormDialogProps) => {
    const isEdit = !!announcement?.id;
    const userId = useSelector((state: RootState) => state.auth.currentUser.id);

    const [values, setValues] = useState<FormValues>(EMPTY);
    const [touched, setTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [users, setUsers] = useState<UserOption[]>([]);
    // Why the last pick was refused, and the dimensions of the one that was accepted.
    const [posterError, setPosterError] = useState<string | null>(null);
    const [posterSize, setPosterSize] = useState<{ width: number; height: number } | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);

    const set = (patch: Partial<FormValues>) => setValues((v) => ({ ...v, ...patch }));

    // Seed on open, so a previous edit never bleeds into the next create.
    useEffect(() => {
        if (!open) return;
        setTouched(false);
        setPosterError(null);
        setPosterSize(null);
        setValues(announcement
            ? {
                title: announcement.title ?? '',
                description: announcement.description ?? '',
                shareWith: (announcement.shareWith as Audience) ?? ShareWith.EVERYONE,
                fromDate: toWire(announcement.fromDate),
                toDate: toWire(announcement.toDate),
                // The API returns the audience on the `users` relation; `selectedUsers` is only
                // ever the name on the way IN. Reading just `selectedUsers` — as the old edit
                // form did — meant every SELECTED_MEMBERS announcement reopened with an empty
                // people list and saved that emptiness back.
                selectedUsers: (announcement.selectedUsers
                    ?? (announcement as unknown as { users?: UserOption[] }).users
                    ?? []) as UserOption[],
                imageUrl: announcement.imageUrl ?? '',
            }
            : EMPTY);
    }, [open, announcement]);

    // The roster is only needed once someone narrows the audience.
    useEffect(() => {
        if (!open || values.shareWith !== ShareWith.SELECTED_MEMBERS || users.length) return;
        (async () => {
            try {
                const { data: { users } } = await fetchAllUsers();
                setUsers(users ?? []);
            } catch {
                toast({ icon: 'error', title: 'Could not load the people list' });
            }
        })();
    }, [open, values.shareWith, users.length]);

    const errors = useMemo(() => {
        const e: Partial<Record<keyof FormValues, string>> = {};
        if (!values.title.trim()) e.title = 'A title is required';
        if (!values.description.trim()) e.description = 'A description is required';
        if (!values.imageUrl) e.imageUrl = 'An image is required';
        if (!values.fromDate) e.fromDate = 'Required';
        if (!values.toDate) e.toDate = 'Required';
        // Caught here rather than by the API, which stores the range without complaint and
        // then shows the announcement to nobody.
        if (values.fromDate && values.toDate && dayjs(values.toDate).isBefore(values.fromDate)) {
            e.toDate = 'Must be on or after the start date';
        }
        if (values.shareWith === ShareWith.SELECTED_MEMBERS && !values.selectedUsers.length) {
            e.selectedUsers = 'Choose at least one person';
        }
        return e;
    }, [values]);

    /** A rejected pick outranks the plain "an image is required" — it says what went wrong. */
    const posterProblem = posterError || (touched ? errors.imageUrl : undefined);

    const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // Clearing the input up front lets the same file be re-picked after any rejection.
        event.target.value = '';
        if (!file || !userId) return;

        setPosterError(null);
        setPosterSize(null);

        // Judged BEFORE the upload, not after: a poster too small for the card gets enlarged into
        // mush, which is not fixable at render time, and an asset that can never be shown well
        // should not be stored. Shape is NOT checked — the card fits any shape whole.
        const verdict = await inspectPosterFile(file);
        if (!verdict.ok) {
            setPosterError(verdict.reason ?? 'That image cannot be used.');
            return;
        }
        if (verdict.width) setPosterSize({ width: verdict.width, height: verdict.height });

        const form = new FormData();
        form.append('file', file);
        setUploading(true);
        try {
            const { data: { path } } = await uploadUserAsset(form, userId);
            set({ imageUrl: path });
        } catch (error) {
            setPosterError(uploadFailureMessage(error));
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async () => {
        setTouched(true);
        if (Object.keys(errors).length) return;

        setSaving(true);
        try {
            // Exactly the fields the API writes — nothing else. The old edit form posted the
            // whole row it had been handed (`id`, `createdAt`, `department`, the `users`
            // relation), and the update repository spreads its body straight into Prisma's
            // `data`, so a relation array in there failed every save.
            const payload = {
                title: values.title.trim(),
                description: values.description.trim(),
                shareWith: values.shareWith,
                fromDate: values.fromDate,
                toDate: values.toDate,
                imageUrl: values.imageUrl,
                // Only the chosen audience travels — a leftover roster on an EVERYONE
                // announcement would connect people the sender never picked.
                selectedUsers: values.shareWith === ShareWith.SELECTED_MEMBERS
                    ? values.selectedUsers.map((u) => ({ id: u.id }))
                    : [],
            };
            const res = isEdit
                ? await updateAnnouncementById(payload as unknown as IAnnouncement, announcement!.id)
                : await createAnnouncement(payload as any);

            if (res?.hasError) throw new Error('save failed');

            toast({ icon: 'success', title: isEdit ? 'Announcement updated' : 'Announcement posted' });
            onSaved();
            onClose();
        } catch {
            toast({
                icon: 'error',
                title: isEdit ? 'Could not update the announcement' : 'Could not post the announcement',
                text: 'Please try again in a moment.',
            });
        } finally {
            setSaving(false);
        }
    };

    const busy = saving || uploading;

    return (
        <GlassDialog
            open={open}
            onClose={busy ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            header={
                <GlassHeader
                    title={isEdit ? 'Edit announcement' : 'New announcement'}
                    subtitle={isEdit
                        ? 'Changes show on every dashboard it reaches'
                        : 'Say it once, to everyone or to a chosen few'}
                    icon={<KTIcon iconName="notification-status" className="fs-1" />}
                    onClose={busy ? undefined : onClose}
                    closeIcon={<KTIcon iconName="cross" className="fs-3" />}
                />
            }
        >
            <Box
                className="min-h-0 flex-1 overflow-y-auto"
                sx={{ maxHeight: { xs: 'none', sm: '68vh' }, px: { xs: 2, sm: 2.75 }, py: 2, scrollbarWidth: 'thin' }}
            >
                <Stack spacing={2.5}>
                    {/* ── audience first: it decides whether the picker below exists ── */}
                    <Box>
                        <Typography
                            variant="caption"
                            sx={{
                                display: 'block', mb: 0.75, fontWeight: 700, fontSize: 10,
                                letterSpacing: '.08em', textTransform: 'uppercase', color: 'text.secondary',
                            }}
                        >
                            Share with
                        </Typography>
                        <SegmentedControl<Audience>
                            ariaLabel="Announcement audience"
                            value={values.shareWith}
                            onChange={(shareWith) => set({ shareWith })}
                            options={[
                                { value: ShareWith.EVERYONE as Audience, label: 'Everyone' },
                                { value: ShareWith.SELECTED_MEMBERS as Audience, label: 'Selected members' },
                            ]}
                        />
                    </Box>

                    {values.shareWith === ShareWith.SELECTED_MEMBERS && (
                        <Autocomplete
                            multiple
                            disableCloseOnSelect
                            options={users}
                            value={values.selectedUsers}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            getOptionLabel={userName}
                            onChange={(_, picked) => set({ selectedUsers: picked as UserOption[] })}
                            renderTags={(tagValue, getTagProps) =>
                                tagValue.map((option, i) => (
                                    <Chip
                                        {...getTagProps({ index: i })}
                                        key={option.id}
                                        size="small"
                                        label={userName(option)}
                                        avatar={<Avatar src={option.avatar ?? undefined}>{userName(option)[0]}</Avatar>}
                                    />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    required
                                    size="small"
                                    label="People"
                                    placeholder="Search by name"
                                    error={touched && !!errors.selectedUsers}
                                    helperText={(touched && errors.selectedUsers) || 'Only these people will see it'}
                                />
                            )}
                        />
                    )}

                    <TextField
                        fullWidth size="small" required label="Announcement title"
                        value={values.title}
                        onChange={(e) => set({ title: e.target.value })}
                        error={touched && !!errors.title}
                        helperText={(touched && errors.title) || ' '}
                        inputProps={{ maxLength: 100 }}
                    />

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <WtDateField
                                required label="Show from"
                                value={values.fromDate}
                                onChange={(fromDate) => set({ fromDate })}
                                error={touched && !!errors.fromDate}
                                helperText={touched ? errors.fromDate : undefined}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <WtDateField
                                required label="Show until"
                                value={values.toDate}
                                onChange={(toDate) => set({ toDate })}
                                minDate={values.fromDate || undefined}
                                error={touched && !!errors.toDate}
                                helperText={touched ? errors.toDate : undefined}
                            />
                        </Grid>
                    </Grid>

                    {/* ── the poster ──
                        The preview is the dashboard card's own aspect ratio, at a smaller scale:
                        what is framed here is exactly what will be framed there. A bare "no file
                        chosen" gave no idea what would appear, and no idea what size to make it. */}
                    <Box
                        sx={{
                            p: 1.75,
                            border: '1px dashed',
                            borderRadius: 2,
                            borderColor: posterProblem ? 'error.main' : values.imageUrl ? 'success.light' : 'divider',
                        }}
                    >
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: { xs: '100%', sm: 200 },
                                    flexShrink: 0,
                                    aspectRatio: POSTER_ASPECT,
                                    borderRadius: 1.5,
                                    overflow: 'hidden',
                                    display: 'grid',
                                    placeItems: 'center',
                                    bgcolor: 'action.hover',
                                }}
                            >
                                <PosterFrame
                                    src={values.imageUrl}
                                    alt="Announcement poster preview"
                                    fallback={<Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}>
                                        <KTIcon iconName="picture" className="fs-2 text-muted" />
                                    </Box>}
                                />
                            </Box>

                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    Poster image <Box component="span" sx={{ color: 'error.main' }}>*</Box>
                                </Typography>

                                {/* The requirement, always visible — not only after a rejection. */}
                                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                    Shown whole, never cropped — {POSTER_HINT}.
                                    <br />
                                    {POSTER_SIZE_HINT}.
                                </Typography>

                                {posterProblem ? (
                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'error.main' }}>
                                        {posterProblem}
                                    </Typography>
                                ) : posterSize ? (
                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'success.main' }}>
                                        {posterSize.width} × {posterSize.height} px — sharp at the size the card draws it.
                                    </Typography>
                                ) : null}

                                <Box sx={{ mt: 0.75 }}>
                                    <WtButton
                                        inverted
                                        size="small"
                                        disabled={uploading}
                                        onClick={() => fileRef.current?.click()}
                                        startIcon={uploading
                                            ? <CircularProgress size={13} color="inherit" />
                                            : <KTIcon iconName="cloud-add" className="fs-6" />}
                                    >
                                        {uploading ? 'uploading…' : values.imageUrl ? 'replace image' : 'choose image'}
                                    </WtButton>
                                </Box>
                            </Box>
                        </Stack>

                        <input
                            ref={fileRef}
                            type="file"
                            hidden
                            accept={POSTER_ACCEPT}
                            onChange={uploadFile}
                        />
                    </Box>

                    <TextField
                        fullWidth size="small" required multiline minRows={4} label="Description"
                        value={values.description}
                        onChange={(e) => set({ description: e.target.value })}
                        error={touched && !!errors.description}
                        helperText={(touched && errors.description) || 'Shown in full when someone opens the card'}
                    />
                </Stack>
            </Box>

            <Stack
                direction={{ xs: 'column-reverse', sm: 'row' }}
                spacing={1}
                justifyContent="flex-end"
                className="shrink-0"
                sx={{ px: { xs: 2, sm: 2.75 }, py: 1.75, borderTop: '1px solid', borderColor: 'divider' }}
            >
                <WtButton ghost onClick={onClose} disabled={busy} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    cancel
                </WtButton>
                <WtButton
                    onClick={handleSubmit}
                    disabled={busy}
                    startIcon={saving
                        ? <CircularProgress size={14} color="inherit" />
                        : <KTIcon iconName={isEdit ? 'check' : 'send'} className="fs-6" />}
                    sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: 150 }}
                >
                    {saving ? 'saving…' : isEdit ? 'save changes' : 'post announcement'}
                </WtButton>
            </Stack>
        </GlassDialog>
    );
};

export default AnnouncementFormDialog;
