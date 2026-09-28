import Swal, { SweetAlertIcon } from 'sweetalert2';
import DOMPurify from 'dompurify';
import { T } from './tokens';

/**
 * Branded SweetAlert wrappers — premium toasts, alerts and confirms that match
 * the UI kit (tokens, radius, brand buttons). Reusable everywhere in place of
 * raw `Swal.fire`, so feedback is consistent across the app.
 *
 * These are also the app's XSS chokepoint for dialogs. SweetAlert2 assigns
 * `html` to the DOM as markup and, in its own words, "does NOT sanitize this
 * parameter". Every dialog that goes through this file is sanitised below, so a
 * name or server message carrying `<img onerror=…>` renders as text rather than
 * running. Build the string with `safeHtml` as well — that escapes at the point
 * of interpolation, where the intent is visible; this is the net underneath.
 */

/**
 * Strip anything executable before SweetAlert parses it.
 *
 * Deliberately NOT a whitelist of tags: these dialogs legitimately carry `<b>`,
 * `<ul>`, `<div class=…>` and inline SVG icons, and a tag whitelist would have to
 * be revisited every time a dialog gains a layout. DOMPurify's default profile
 * already removes scripts, event handlers and `javascript:` URLs, which is the
 * property we need. `dompurify` is already a dependency — no new weight.
 *
 * `undefined` passes straight through so `html:` stays optional: sanitising it
 * would turn "no html" into an empty string and make SweetAlert render an empty
 * body instead of falling back to `text`.
 */
function sanitizeHtml(html: string | undefined): string | undefined {
    if (html === undefined) return undefined;
    // No DOM (tests, any future SSR pass) means nothing can execute anyway, and
    // DOMPurify has no document to work against.
    if (typeof window === 'undefined') return html;
    return DOMPurify.sanitize(html);
}

let injected = false;
function ensureStyles() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const style = document.createElement('style');
  style.id = 'wt-swal-styles';
  style.textContent = `
    .wt-swal-container{z-index:2000 !important;}
    .wt-swal-popup{border-radius:16px;font-family:${T.font.family};box-shadow:${T.shadow.modal};padding:10px 10px 20px;}
    .wt-swal-title{font-size:18px;font-weight:750;color:${T.color.ink};letter-spacing:.1px;}
    .wt-swal-html{font-size:13.5px;color:${T.color.inkSoft};line-height:1.55;}
    .wt-swal-actions{gap:10px;margin-top:14px;}
    .wt-swal-confirm{background:${T.color.brand};color:#fff;border-radius:9px;font-weight:600;font-size:13.5px;padding:9px 20px;transition:background .15s;}
    .wt-swal-confirm:hover{background:${T.color.brandHover};}
    .wt-swal-confirm.wt-danger{background:${T.color.danger};}
    .wt-swal-confirm.wt-danger:hover{background:#9A1D14;}
    .wt-swal-cancel{background:#fff;color:${T.color.inkSoft};border:1px solid ${T.color.line};border-radius:9px;font-weight:600;font-size:13.5px;padding:9px 20px;transition:background .15s;}
    .wt-swal-cancel:hover{background:${T.color.panel};color:${T.color.ink};}

    /* Toast variant — a notice card, not a dialog. The shared .wt-swal-popup padding
       and 18px title are sized for a modal and make a one-line notice look like an
       announcement. Swal already lays a toast out as an "icon | text" grid, so only
       the spacing, the skin and the timer bar are set here — redefining the grid
       would move the check mark off its own strokes. */
    .wt-swal-toast{align-items:center;column-gap:12px;padding:12px 14px;margin:0 0 20px 20px;
      max-width:min(400px,calc(100vw - 40px));border:1px solid ${T.color.line};
      border-radius:14px;box-shadow:${T.shadow.pop};overflow:hidden;}
    /* A hairline border, because a white toast over a white form has no edge of its own. */
    .wt-swal-toast .wt-swal-title{font-size:13.5px;font-weight:650;line-height:1.35;margin:0;
      text-align:left;overflow-wrap:anywhere;}
    .wt-swal-toast .wt-swal-html{font-size:12.5px;line-height:1.45;margin:2px 0 0;
      text-align:left;overflow-wrap:anywhere;}

    /* Icon: Swal positions the check/cross strokes against its own toast geometry, so
       only the palette changes here — no size, and no fill behind the success mark,
       whose animation masks are painted in the popup's own colour. */
    .wt-swal-toast .swal2-icon{margin:0;}
    .wt-swal-toast .swal2-success,
    .wt-swal-toast .swal2-success .swal2-success-ring{border-color:rgba(47,125,95,.30);}
    .wt-swal-toast .swal2-success [class^='swal2-success-line']{background:${T.color.success};}
    .wt-swal-toast .swal2-error{border-color:rgba(178,58,48,.30);}
    .wt-swal-toast .swal2-error [class^='swal2-x-mark-line']{background:${T.color.danger};}
    .wt-swal-toast .swal2-warning{border-color:rgba(166,106,42,.30);color:${T.color.warning};}
    .wt-swal-toast .swal2-info,
    .wt-swal-toast .swal2-question{border-color:rgba(44,115,133,.30);color:${T.color.cyan};}

    /* Timer bar: a hairline the eye can ignore, clipped by the card (Swal's own
       container carries a fixed 5px radius that squares off a 14px corner). */
    .wt-swal-toast .swal2-timer-progress-bar-container{height:3px;border-radius:0;
      background:${T.color.lineSoft};}
    .wt-swal-toast .swal2-timer-progress-bar{background:${T.color.brand};}

    /* Phones: the bottom navigation owns the bottom-left corner, and the toast
       outranks it on z-index, so it would land on top of the tab bar. */
    @media (max-width:991.98px){
      .wt-swal-toast{margin:0 12px calc(var(--bn-content-offset, 82px) + 12px) 12px;
        max-width:calc(100vw - 24px);}
    }

    /* Enters from the edge it is anchored to rather than zooming out of nothing. */
    @keyframes wt-toast-in{from{opacity:0;transform:translate3d(-12px,8px,0) scale(.98)}
      to{opacity:1;transform:none}}
    @keyframes wt-toast-out{from{opacity:1;transform:none}
      to{opacity:0;transform:translate3d(0,6px,0) scale(.98)}}
    .wt-toast-in{animation:wt-toast-in .22s cubic-bezier(.22,.61,.36,1) both;}
    .wt-toast-out{animation:wt-toast-out .16s ease-in both;}
    @media (prefers-reduced-motion: reduce){
      .wt-toast-in,.wt-toast-out{animation-duration:.01ms;}
    }

    html[data-theme="dark"] .wt-swal-toast{border-color:#30363d;}
    html[data-theme="dark"] .wt-swal-toast .swal2-timer-progress-bar-container{background:rgba(255,255,255,.10);}
    html[data-theme="dark"] .wt-swal-toast .swal2-timer-progress-bar{background:#6E9BFF;}
    html[data-theme="dark"] .wt-swal-toast .swal2-success,
    html[data-theme="dark"] .wt-swal-toast .swal2-success .swal2-success-ring{border-color:rgba(48,209,88,.35);}
    html[data-theme="dark"] .wt-swal-toast .swal2-success [class^='swal2-success-line']{background:#30D158;}

    /* Dark mode — scoped to the app-wide [data-theme="dark"] signal set by ColorModeProvider.
       Swal portals to <body>, so these descendant selectors match. */
    html[data-theme="dark"] .wt-swal-popup{background:#161b22;border:1px solid #30363d;box-shadow:0 24px 64px -12px rgba(1,4,9,.7);}
    html[data-theme="dark"] .wt-swal-title{color:rgba(255,255,255,.92);}
    html[data-theme="dark"] .wt-swal-html{color:rgba(255,255,255,.62);}
    html[data-theme="dark"] .wt-swal-cancel{background:rgba(255,255,255,.08);color:rgba(255,255,255,.78);border-color:rgba(255,255,255,.16);}
    html[data-theme="dark"] .wt-swal-cancel:hover{background:rgba(255,255,255,.14);color:#fff;}
  `;
  document.head.appendChild(style);
}

const baseClass = {
  container: 'wt-swal-container',
  popup: 'wt-swal-popup',
  title: 'wt-swal-title',
  htmlContainer: 'wt-swal-html',
  actions: 'wt-swal-actions',
  confirmButton: 'wt-swal-confirm',
  cancelButton: 'wt-swal-cancel',
};

export interface FeedbackOptions {
  icon?: SweetAlertIcon;
  title: string;
  text?: string;
  html?: string;
}

/**
 * Auto-dismissing toast for success/info confirmations.
 *
 * `toast: true` is what makes this a toast rather than a modal. Without it Swal
 * renders a full centred popup over a backdrop — a two-word "deleted" notice was
 * taking the middle of the screen and blocking the list behind it, which is the
 * opposite of what a toast is for. It also means the toast never steals focus,
 * so the work underneath keeps going.
 *
 * Bottom-left keeps it clear of the app header and the search bar. Hovering
 * pauses the dismiss timer — a notice that vanishes while being read is worse
 * than no notice.
 */
export function toast(opts: FeedbackOptions & { timer?: number }) {
  ensureStyles();
  return Swal.fire({
    icon: opts.icon, title: opts.title, text: opts.text, html: sanitizeHtml(opts.html),
    toast: true,
    position: 'bottom-start',
    backdrop: false,
    // 2200ms is under the time it takes to read back a reference like BILL/2026/0004,
    // which is exactly what these notices carry. Hovering still pauses it.
    timer: opts.timer ?? 3200, showConfirmButton: false, timerProgressBar: true,
    customClass: { ...baseClass, popup: 'wt-swal-popup wt-swal-toast' },
    showClass: { popup: 'wt-toast-in' },
    hideClass: { popup: 'wt-toast-out' },
    didOpen: (el) => {
      el.addEventListener('mouseenter', Swal.stopTimer);
      el.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });
}

/** Branded alert with a single acknowledge button. */
export function alertDialog(opts: FeedbackOptions & { confirmText?: string }) {
  ensureStyles();
  return Swal.fire({
    icon: opts.icon, title: opts.title, text: opts.text, html: sanitizeHtml(opts.html),
    confirmButtonText: opts.confirmText ?? 'OK', buttonsStyling: false,
    customClass: baseClass,
  });
}

/** Branded confirm — resolves true when confirmed. Pass `danger` for destructive actions. */
export async function confirmDialog(opts: FeedbackOptions & { confirmText?: string; cancelText?: string; danger?: boolean }): Promise<boolean> {
  ensureStyles();
  const res = await Swal.fire({
    icon: opts.icon ?? 'warning', title: opts.title, text: opts.text, html: sanitizeHtml(opts.html),
    showCancelButton: true,
    confirmButtonText: opts.confirmText ?? 'Confirm',
    cancelButtonText: opts.cancelText ?? 'Cancel',
    reverseButtons: true, buttonsStyling: false,
    customClass: { ...baseClass, confirmButton: `wt-swal-confirm${opts.danger ? ' wt-danger' : ''}` },
  });
  return !!res.isConfirmed;
}
