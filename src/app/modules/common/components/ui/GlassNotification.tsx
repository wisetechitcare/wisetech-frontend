import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, Stack, Typography, IconButton, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { GlassSurface } from './glass';
import { T, VividTone, ThemeMode, label } from './tokens';
import { MOTION_KEYFRAMES, pressableSx } from './motion';

/**
 * macOS-style frosted notification banner + a reusable toast system.
 *
 *   const toast = useGlassToast();
 *   toast.show({ title: 'Saved', message: 'Rule updated', tone: 'green', icon: <KTIcon.../> });
 *
 * Wrap the app once in <GlassToastProvider>. Banners frost over the content behind them, stack
 * top-right, slide in with a spring, auto-dismiss, and honor prefers-reduced-motion. The card
 * (`GlassNotification`) is also exported for standalone use.
 */

export interface GlassNotificationProps {
  title: string;
  message?: string;
  /** Accent for the icon chip + left keyline. */
  tone?: VividTone;
  /** Glyph node (e.g. `<KTIcon iconName="check-circle" className="fs-3" />`). */
  icon?: React.ReactNode;
  /** Right-aligned timestamp/eyebrow, e.g. "now". */
  timestamp?: string;
  /** Inline action button. */
  action?: { label: string; onClick: () => void };
  onClose?: () => void;
  /** internal: drives the slide-out animation */
  leaving?: boolean;
}

export function GlassNotification({
  title, message, tone = 'slate', icon, timestamp, action, onClose, leaving,
}: GlassNotificationProps) {
  const mode = (useTheme().palette.mode as ThemeMode) ?? 'light';
  const accent = T.color.vivid[tone];
  return (
    <GlassSurface
      variant="regular"
      className={leaving ? 'wt-slide-out' : 'wt-slide-in'}
      sx={{
        pointerEvents: 'auto', display: 'flex', gap: 1.25, alignItems: 'flex-start',
        p: '12px 13px', borderRadius: '16px', borderLeft: `3px solid ${accent}`,
      }}
    >
      {icon && (
        <Box sx={{
          width: 34, height: 34, borderRadius: '10px', flexShrink: 0, display: 'grid', placeItems: 'center',
          bgcolor: `${accent}1A`, color: accent, border: `1px solid ${accent}2E`,
        }}>
          {icon}
        </Box>
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
          <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 700, color: label(mode, 'primary') }}>{title}</Typography>
          {timestamp && <Typography sx={{ fontSize: 11, fontWeight: 600, color: label(mode, 'tertiary'), flexShrink: 0 }}>{timestamp}</Typography>}
        </Stack>
        {message && (
          <Typography sx={{ fontSize: 12.5, color: label(mode, 'secondary'), lineHeight: 1.45, mt: '2px' }}>{message}</Typography>
        )}
        {action && (
          <Button size="small" onClick={action.onClick}
            sx={{ mt: 0.75, textTransform: 'none', fontWeight: 600, fontSize: 12.5, color: accent, px: 1, minWidth: 0, ...pressableSx() }}>
            {action.label}
          </Button>
        )}
      </Box>
      {onClose && (
        <IconButton size="small" onClick={onClose} aria-label="Dismiss" sx={{ color: label(mode, 'tertiary'), width: 26, height: 26, ...pressableSx(0.9) }}>
          <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>&times;</Box>
        </IconButton>
      )}
    </GlassSurface>
  );
}

// ─── Toast system ─────────────────────────────────────────────────────────────────────────────

export interface GlassToastOptions extends Omit<GlassNotificationProps, 'onClose' | 'leaving'> {
  /** Auto-dismiss after N ms; 0 = sticky until dismissed. Default 5000. */
  duration?: number;
}
interface ToastItem extends GlassToastOptions { id: string; leaving?: boolean }
interface GlassToastCtx { show: (o: GlassToastOptions) => string; dismiss: (id: string) => void }

const Ctx = createContext<GlassToastCtx | null>(null);

export function useGlassToast(): GlassToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGlassToast must be used within <GlassToastProvider>');
  return ctx;
}

export function GlassToastProvider({ children, max = 4 }: { children: React.ReactNode; max?: number }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 260);
    if (timers.current[id]) { clearTimeout(timers.current[id]); delete timers.current[id]; }
  }, []);

  const show = useCallback((o: GlassToastOptions) => {
    counter.current += 1;
    const id = `wt-toast-${counter.current}`;
    setItems((prev) => [...prev.slice(-(max - 1)), { ...o, id }]);
    const dur = o.duration ?? 5000;
    if (dur > 0) timers.current[id] = setTimeout(() => dismiss(id), dur);
    return id;
  }, [max, dismiss]);

  const ctx = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <>
          <style>{MOTION_KEYFRAMES}</style>
          <Box sx={{
            position: 'fixed', top: 16, right: 16, zIndex: (t) => t.zIndex.snackbar + 1,
            display: 'flex', flexDirection: 'column', gap: 1.25,
            width: 372, maxWidth: 'calc(100vw - 32px)', pointerEvents: 'none',
          }}>
            {items.map((t) => (
              <GlassNotification key={t.id} {...t} onClose={() => dismiss(t.id)} />
            ))}
          </Box>
        </>,
        document.body,
      )}
    </Ctx.Provider>
  );
}
