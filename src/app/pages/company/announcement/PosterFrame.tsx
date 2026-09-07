/**
 * A poster shown whole inside a frame of a different shape.
 *
 * The announcement card is wide; the posters people upload are portrait flyers. Cropping one to
 * fit the other throws away most of the poster, and stretching it is worse — so the poster is
 * fitted INSIDE the frame (`contain`, nothing lost) and the leftover space is filled with a
 * blurred, zoomed copy of the same image. The card still reads as full-bleed art rather than a
 * small picture floating on grey, and no pixel of the original is cropped or distorted.
 *
 * Used by the dashboard card and by the upload preview in the form, so what an admin approves in
 * the dialog is exactly what the dashboard renders.
 *
 * The parent must be positioned — this fills it absolutely.
 */
import { Box } from '@mui/material';
import type { ReactNode } from 'react';

export interface PosterFrameProps {
    src?: string | null;
    alt?: string;
    /** Drawn instead of the image when there is no `src` (the brand gradient, an icon). */
    fallback?: ReactNode;
}

export const PosterFrame = ({ src, alt = '', fallback = null }: PosterFrameProps) => {
    if (!src) {
        return <Box sx={{ position: 'absolute', inset: 0 }}>{fallback}</Box>;
    }

    return (
        <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* The fill. Scaled up past the edges because a blur samples beyond its own box and
                would otherwise fade to transparent at the frame's border. Decorative, so it is
                hidden from assistive tech — the same picture follows immediately. */}
            <Box
                component="img"
                src={src}
                alt=""
                aria-hidden
                sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    // Enough blur that the fill reads as backdrop rather than a second picture
                    // competing with the poster, and no more — past ~16px it turns to fog and the
                    // card loses the artwork's colour and structure at the edges.
                    transform: 'scale(1.12)',
                    filter: 'blur(14px) saturate(125%)',
                    // Safari paints a blurred layer on its own compositor tile; without this it can
                    // flicker over the sibling below during the carousel's cross-fade.
                    willChange: 'transform',
                }}
            />
            {/* The poster itself, whole. The drop shadow separates it from its own blurred fill,
                which is otherwise the same colours at the same place. */}
            <Box
                component="img"
                src={src}
                alt={alt}
                sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 6px 22px rgba(8,15,35,0.30))',
                }}
            />
        </Box>
    );
};

export default PosterFrame;
