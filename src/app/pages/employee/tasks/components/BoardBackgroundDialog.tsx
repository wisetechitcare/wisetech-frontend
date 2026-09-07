/**
 * "Board background" — the picker behind the toolbar's backdrop button.
 *
 * Three ways to dress the board, in increasing effort: a shipped preset (one click, always
 * legible), a solid colour (matches a team's own brand), or a wallpaper (an upload or an image
 * link). Everything applies LIVE to the board behind the dialog — a backdrop is judged by how the
 * board looks wearing it, not by a swatch, so there is no Apply button to press and no way to end
 * up with a preview that disagrees with the result.
 *
 * The two readability controls only appear for a wallpaper, because that is the only case where
 * they can be needed: a photograph is the one backdrop this screen did not choose the contrast of.
 * Dim darkens it behind the cards, blur stops a busy image from competing with them.
 *
 * Storage, encoding and contrast rules all live in `../boardBackground` — this file is the
 * control surface for them and holds no colour knowledge of its own.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Slider, Stack, TextField, Theme, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import {
    GlassDialog, GlassHeader, SettingsSection, TRIO, WtButton, WtColorPicker, toast,
    type ColorSwatch,
} from '@app/modules/common/components/ui';
import {
    BOARD_PRESETS, BoardBackground, boardBackgroundCss, boardInk, fileToWallpaperDataUrl,
    hasWallpaper,
} from '../boardBackground';

export interface BoardBackgroundDialogProps {
    open: boolean;
    onClose: () => void;
    value: BoardBackground;
    /** Applies immediately. Returns `false` when the browser refused to remember the choice. */
    onChange: (next: BoardBackground) => boolean;
    onReset: () => void;
}

/**
 * Backdrop colours are stored as hex, not as kit tone names: a tone name carries a `{fg,bg,border}`
 * triple meant for a tinted chip, and none of that applies to a full-bleed surface. These are the
 * deep end of the kit palette — the shades a board can wear all day.
 */
const BACKDROP_SWATCHES: readonly ColorSwatch[] = [
    { value: '#0D1E42', hex: '#0D1E42', label: 'Midnight' },
    { value: '#1E3A8A', hex: '#1E3A8A', label: 'Navy' },
    { value: '#1A2230', hex: '#1A2230', label: 'Graphite' },
    { value: '#0A2B3A', hex: '#0A2B3A', label: 'Teal' },
    { value: '#3B1F73', hex: '#3B1F73', label: 'Indigo' },
    { value: '#3E1410', hex: '#3E1410', label: 'Ember' },
    { value: '#E2E9F8', hex: '#E2E9F8', label: 'Frost' },
    { value: '#F1F4F8', hex: '#F1F4F8', label: 'Paper' },
];

/** How many cards each miniature lane holds — uneven on purpose, like a real board. */
const LANE_CARDS = [3, 2, 4, 1] as const;

const LANE_ACCENTS = (theme: Theme) => [
    theme.palette.primary.main, theme.palette.warning.main,
    theme.palette.success.main, theme.palette.error.main,
];

/**
 * The board in miniature — the backdrop with card stacks on it. A flat swatch cannot answer the
 * only question being asked here ("can I still read my cards on this?"), so the preview shows the
 * thing being decided.
 */
const BackdropPreview = ({ bg, compact = false }: { bg: BoardBackground; compact?: boolean }) => {
    const theme = useTheme();
    const ink = boardInk(bg);
    const columns = compact ? 3 : 4;
    return (
        <Box
            aria-hidden
            className="relative w-full overflow-hidden rounded-xl"
            sx={{
                background: boardBackgroundCss(bg),
                border: '1px solid',
                borderColor: 'divider',
                height: compact ? 60 : 128,
            }}
        >
            {hasWallpaper(bg) && (
                <Box
                    className="absolute inset-0"
                    sx={{
                        bgcolor: `rgba(2, 6, 23, ${bg.dim / 100})`,
                        backdropFilter: bg.blur ? `blur(${bg.blur}px)` : undefined,
                    }}
                />
            )}
            {/* Lanes of differing lengths, because that is what the board does: a lane is as tall
                as its own cards. A row of equal full-height blocks would advertise the wrong
                layout, and would hide most of the backdrop being judged. */}
            <Stack
                direction="row"
                spacing={compact ? 0.5 : 1}
                className="absolute inset-0"
                sx={{ p: compact ? 0.75 : 1.5, alignItems: 'flex-start' }}
            >
                {LANE_CARDS.slice(0, columns).map((cards, i) => (
                    <Stack
                        key={i}
                        spacing={compact ? '2px' : '4px'}
                        className="flex-1 overflow-hidden rounded-md"
                        sx={{
                            p: compact ? '3px' : '4px',
                            bgcolor: alpha(theme.palette.background.paper, ink === 'light' ? 0.95 : 0.9),
                            borderTop: `2px solid ${LANE_ACCENTS(theme)[i % 4]}`,
                            boxShadow: `0 2px 8px ${alpha('#000', 0.18)}`,
                        }}
                    >
                        {Array.from({ length: cards }).map((__, c) => (
                            <Box
                                key={c}
                                className="rounded-sm"
                                sx={{
                                    height: compact ? 4 : 8,
                                    bgcolor: alpha(theme.palette.text.primary, 0.16),
                                }}
                            />
                        ))}
                    </Stack>
                ))}
            </Stack>
        </Box>
    );
};

export const BoardBackgroundDialog = ({
    open, onClose, value, onChange, onReset,
}: BoardBackgroundDialogProps) => {
    const theme = useTheme();
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [linkDraft, setLinkDraft] = useState('');
    const [busy, setBusy] = useState(false);
    /** Slider state is local while dragging: the committed value is what gets stored. */
    const [dim, setDim] = useState(value.dim);
    const [blur, setBlur] = useState(value.blur);

    useEffect(() => { setDim(value.dim); setBlur(value.blur); }, [value.dim, value.blur]);

    const preview = useMemo<BoardBackground>(() => ({ ...value, dim, blur }), [value, dim, blur]);

    /** One place where a change becomes the board's — and where a refused write is admitted to. */
    const apply = (patch: Partial<BoardBackground>) => {
        const stored = onChange({ ...value, ...patch });
        if (!stored) {
            void toast({
                icon: 'warning',
                title: 'Applied, but not saved',
                text: 'This browser would not store the backdrop, so the board goes back to the default next time.',
                timer: 4200,
            });
        }
    };

    const pickFile = async (file?: File | null) => {
        if (!file) return;
        setBusy(true);
        try {
            const dataUrl = await fileToWallpaperDataUrl(file);
            apply({ kind: 'image', imageUrl: dataUrl });
        } catch (error) {
            void toast({
                icon: 'error',
                title: 'Could not use that image',
                text: error instanceof Error ? error.message : 'The file could not be read.',
                timer: 4200,
            });
        } finally {
            setBusy(false);
            // Let the same file be picked again after a failure.
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const applyLink = () => {
        const url = linkDraft.trim();
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) {
            void toast({
                icon: 'warning',
                title: 'That is not an image link',
                text: 'Paste a link that starts with https:// and points straight at an image.',
                timer: 3600,
            });
            return;
        }
        apply({ kind: 'image', imageUrl: url });
        setLinkDraft('');
    };

    const selectedTile = (active: boolean) => ({
        position: 'relative' as const,
        cursor: 'pointer',
        border: '2px solid',
        borderColor: active ? 'primary.main' : 'divider',
        boxShadow: active ? `0 0 0 4px ${alpha(theme.palette.primary.main, 0.18)}` : 'none',
        transition: 'border-color .15s, box-shadow .15s, transform .15s',
        '&:hover': { transform: 'translateY(-2px)' },
        '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
    });

    return (
        <GlassDialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            header={
                <GlassHeader
                    title="Board background"
                    subtitle="Choose a preset, a colour, or your own wallpaper — it applies to this board right away"
                    icon={<KTIcon iconName="picture" className="fs-1" />}
                    onClose={onClose}
                />
            }
        >
            {/* Two boxes, on purpose. The OUTER one is the scroll port: it takes the height the
                Paper has left (MUI's Paper is a capped-height flex column) and nothing more. The
                INNER one is a plain block that grows to its natural height and overflows it.
                Making the scroll port itself the flex column does not work — the preview has a
                fixed height and no content, so flex would happily shrink it to a sliver to fit,
                and the body would never overflow, which is why there was no scrollbar. */}
            <Box
                className="min-h-0 flex-1 overflow-y-auto"
                sx={{
                    // Belt and braces: `flex-1` alone bounds this only while the Paper stays a
                    // capped-height flex column. The cap makes the scroll port bounded on its own
                    // terms. Lifted on phones, where the dialog is full-screen and the port should
                    // take the whole sheet rather than leave a gap under the footer.
                    maxHeight: { xs: 'none', sm: '70vh' },
                    scrollbarWidth: 'thin',
                    '&::-webkit-scrollbar': { width: 8 },
                    '&::-webkit-scrollbar-thumb': {
                        borderRadius: 4,
                        bgcolor: alpha(theme.palette.text.primary, 0.22),
                    },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                }}
            >
            <Box className="flex flex-col gap-4" sx={{ p: { xs: 2, sm: 2.75 } }}>
                <BackdropPreview bg={preview} />

                {/* ── presets ── */}
                <SettingsSection
                    tone={TRIO.blue}
                    icon="colors-square"
                    title="Presets"
                    description="Deep, low-glare surfaces designed to sit behind white cards all day."
                >
                    <Box
                        className="grid gap-2.5"
                        sx={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}
                    >
                        {BOARD_PRESETS.map((preset) => {
                            const active = value.kind === 'preset' && value.presetId === preset.id;
                            return (
                                <Box
                                    key={preset.id}
                                    component="button"
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => apply({ kind: 'preset', presetId: preset.id })}
                                    className="flex flex-col gap-1.5 rounded-xl p-1.5"
                                    sx={{ ...selectedTile(active), bgcolor: 'background.paper' }}
                                >
                                    <BackdropPreview bg={{ ...value, kind: 'preset', presetId: preset.id }} compact />
                                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ px: 0.25 }}>
                                        <Typography variant="caption" noWrap sx={{ fontWeight: 600, color: 'text.primary', flex: 1, textAlign: 'left' }}>
                                            {preset.label}
                                        </Typography>
                                        {active && (
                                            <Box sx={{ color: 'primary.main', lineHeight: 0 }}>
                                                <KTIcon iconName="check-circle" className="fs-7" />
                                            </Box>
                                        )}
                                    </Stack>
                                </Box>
                            );
                        })}
                    </Box>
                </SettingsSection>

                {/* ── solid colour ── */}
                <SettingsSection
                    tone={TRIO.purple}
                    icon="paintbucket"
                    title="Solid colour"
                    description="Any colour, including your own brand shade. Text on the board flips to stay readable."
                    action={
                        value.kind === 'solid' ? (
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                In use
                            </Typography>
                        ) : undefined
                    }
                >
                    <WtColorPicker
                        label="Board colour"
                        palette={BACKDROP_SWATCHES}
                        value={value.kind === 'solid' ? value.color : ''}
                        onChange={(color) => apply({ kind: 'solid', color })}
                    />
                </SettingsSection>

                {/* ── wallpaper ── */}
                <SettingsSection
                    tone={TRIO.cyan}
                    icon="picture"
                    title="Wallpaper"
                    description="Upload an image or paste a link. Large photos are resized before they are stored."
                    action={
                        hasWallpaper(value) ? (
                            <WtButton
                                ghost
                                size="small"
                                onClick={() => apply({ kind: 'preset', imageUrl: '' })}
                                startIcon={<KTIcon iconName="trash" className="fs-7" />}
                            >
                                remove
                            </WtButton>
                        ) : undefined
                    }
                >
                    <Stack spacing={1.5}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                            <WtButton
                                inverted
                                disabled={busy}
                                onClick={() => fileRef.current?.click()}
                                startIcon={<KTIcon iconName="exit-up" className="fs-6" />}
                            >
                                {busy ? 'preparing…' : 'upload image'}
                            </WtButton>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                JPG, PNG or WebP — kept on this device only.
                            </Typography>
                            {/* A real file input, kept out of the layout — the visible control is
                                the WtButton above it, so the browser's own unstyleable widget
                                never reaches the page. */}
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => void pickFile(e.target.files?.[0])}
                            />
                        </Stack>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                            <TextField
                                size="small"
                                fullWidth
                                label="Image link"
                                placeholder="https://…"
                                value={linkDraft}
                                onChange={(e) => setLinkDraft(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } }}
                            />
                            <WtButton flat disabled={!linkDraft.trim()} onClick={applyLink} sx={{ whiteSpace: 'nowrap' }}>
                                use link
                            </WtButton>
                        </Stack>

                        {/* Readability controls — only meaningful once there IS a photograph. */}
                        {hasWallpaper(value) && (
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={{ xs: 1, sm: 3 }}
                                sx={{ pt: 0.5 }}
                            >
                                <Box className="flex-1">
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                        Dim
                                    </Typography>
                                    <Slider
                                        size="small"
                                        value={dim}
                                        min={0}
                                        max={80}
                                        step={1}
                                        valueLabelDisplay="auto"
                                        valueLabelFormat={(v) => `${v}%`}
                                        aria-label="Wallpaper dim"
                                        onChange={(_, v) => setDim(v as number)}
                                        onChangeCommitted={(_, v) => apply({ dim: v as number })}
                                    />
                                </Box>
                                <Box className="flex-1">
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                        Blur
                                    </Typography>
                                    <Slider
                                        size="small"
                                        value={blur}
                                        min={0}
                                        max={16}
                                        step={1}
                                        valueLabelDisplay="auto"
                                        valueLabelFormat={(v) => `${v}px`}
                                        aria-label="Wallpaper blur"
                                        onChange={(_, v) => setBlur(v as number)}
                                        onChangeCommitted={(_, v) => apply({ blur: v as number })}
                                    />
                                </Box>
                            </Stack>
                        )}
                    </Stack>
                </SettingsSection>

            </Box>
            </Box>

            {/* Outside the scroll port: the way out of a dialog should never be something you
                have to scroll to find. */}
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                justifyContent="flex-end"
                className="shrink-0"
                sx={{
                    px: { xs: 2, sm: 2.75 },
                    py: 1.75,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Tooltip title="Back to the default midnight board">
                    <span>
                        <WtButton
                            ghost
                            fullWidth
                            onClick={onReset}
                            startIcon={<KTIcon iconName="arrows-circle" className="fs-6" />}
                            sx={{ width: { sm: 'auto' } }}
                        >
                            reset to default
                        </WtButton>
                    </span>
                </Tooltip>
                <WtButton onClick={onClose} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    done
                </WtButton>
            </Stack>
        </GlassDialog>
    );
};

export default BoardBackgroundDialog;
