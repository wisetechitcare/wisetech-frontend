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

function ensureStyles() {
  if (typeof document === 'undefined') return;
  const css = `
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

    /* Compact notice chip — dense enough for one-liners, still readable with a subtitle. */
    .wt-swal-toast{
      align-items:center;column-gap:10px;
      width:auto;min-width:0;max-width:min(340px,calc(100vw - 32px));
      padding:8px 12px 10px;margin:0 0 16px 16px;
      border:1px solid ${T.color.line};border-radius:12px;
      background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.04),0 8px 20px -6px rgba(15,23,42,.14);
      overflow:hidden;isolation:isolate;
    }
    .wt-swal-toast .wt-swal-title{
      font-size:13px;font-weight:600;letter-spacing:-.01em;line-height:1.3;margin:0;
      color:${T.color.ink};text-align:left;overflow-wrap:anywhere;
    }
    .wt-swal-toast .wt-swal-html{
      font-size:12px;line-height:1.4;margin:2px 0 0;color:${T.color.inkSoft};
      text-align:left;overflow-wrap:anywhere;
    }

    /* Scale via transform so Swal's check/cross stroke math stays intact;
       negative margin reclaims the layout space the unscaled box still occupies. */
    .wt-swal-toast .swal2-icon{
      margin:-5px -2px -5px -4px !important;width:2em;height:2em;min-width:2em;
      transform:scale(.72);transform-origin:center center;
    }
    .wt-swal-toast .swal2-icon.swal2-success{border-color:transparent;background:rgba(47,125,95,.10);}
    .wt-swal-toast .swal2-success .swal2-success-ring{border-color:rgba(47,125,95,.28);}
    .wt-swal-toast .swal2-success [class^='swal2-success-line']{background:${T.color.success};}
    .wt-swal-toast .swal2-icon.swal2-error{border-color:transparent;background:rgba(178,58,48,.10);}
    .wt-swal-toast .swal2-error [class^='swal2-x-mark-line']{background:${T.color.danger};}
    .wt-swal-toast .swal2-icon.swal2-warning{border-color:transparent;background:rgba(166,106,42,.12);color:${T.color.warning};}
    .wt-swal-toast .swal2-icon.swal2-info,
    .wt-swal-toast .swal2-icon.swal2-question{border-color:transparent;background:rgba(44,115,133,.10);color:${T.color.cyan};}

    /* Hairline timer — no track fill (that left a blue corner nub on the rounded card). */
    .wt-swal-toast .swal2-timer-progress-bar-container{
      position:absolute;left:0;right:0;bottom:0;height:2px;overflow:hidden;
      border-radius:0;background:transparent !important;
    }
    .wt-swal-toast .swal2-timer-progress-bar{
      height:2px;border-radius:0 1px 1px 0;opacity:.9;background:${T.color.brand};
    }
    .wt-swal-toast:has(.swal2-success) .swal2-timer-progress-bar{background:${T.color.success};}
    .wt-swal-toast:has(.swal2-error) .swal2-timer-progress-bar{background:${T.color.danger};}
    .wt-swal-toast:has(.swal2-warning) .swal2-timer-progress-bar{background:${T.color.warning};}

    @media (max-width:991.98px){
      .wt-swal-toast{margin:0 12px calc(var(--bn-content-offset, 82px) + 12px) 12px;
        max-width:calc(100vw - 24px);}
    }

    @keyframes wt-toast-in{from{opacity:0;transform:translate3d(-10px,6px,0) scale(.98)}
      to{opacity:1;transform:none}}
    @keyframes wt-toast-out{from{opacity:1;transform:none}
      to{opacity:0;transform:translate3d(0,4px,0) scale(.98)}}
    .wt-toast-in{animation:wt-toast-in .2s cubic-bezier(.22,.61,.36,1) both;}
    .wt-toast-out{animation:wt-toast-out .14s ease-in both;}
    @media (prefers-reduced-motion: reduce){
      .wt-toast-in,.wt-toast-out{animation-duration:.01ms;}
    }

    html[data-theme="dark"] .wt-swal-toast{
      background:#1c2230;border-color:#30363d;
      box-shadow:0 1px 2px rgba(0,0,0,.35),0 12px 28px -8px rgba(0,0,0,.55);
    }
    html[data-theme="dark"] .wt-swal-toast .wt-swal-title{color:rgba(255,255,255,.92);}
    html[data-theme="dark"] .wt-swal-toast .wt-swal-html{color:rgba(255,255,255,.62);}
    html[data-theme="dark"] .wt-swal-toast .swal2-timer-progress-bar{background:#6E9BFF;}
    html[data-theme="dark"] .wt-swal-toast:has(.swal2-success) .swal2-timer-progress-bar{background:#30D158;}
    html[data-theme="dark"] .wt-swal-toast .swal2-icon.swal2-success{background:rgba(48,209,88,.14);}
    html[data-theme="dark"] .wt-swal-toast .swal2-success .swal2-success-ring{border-color:rgba(48,209,88,.35);}
    html[data-theme="dark"] .wt-swal-toast .swal2-success [class^='swal2-success-line']{background:#30D158;}

    html[data-theme="dark"] .wt-swal-popup{background:#161b22;border:1px solid #30363d;box-shadow:0 24px 64px -12px rgba(1,4,9,.7);}
    html[data-theme="dark"] .wt-swal-title{color:rgba(255,255,255,.92);}
    html[data-theme="dark"] .wt-swal-html{color:rgba(255,255,255,.62);}
    html[data-theme="dark"] .wt-swal-cancel{background:rgba(255,255,255,.08);color:rgba(255,255,255,.78);border-color:rgba(255,255,255,.16);}
    html[data-theme="dark"] .wt-swal-cancel:hover{background:rgba(255,255,255,.14);color:#fff;}
  `;
  const existing = document.getElementById('wt-swal-styles');
  if (existing) {
    existing.textContent = css;
    return;
  }
  const style = document.createElement('style');
  style.id = 'wt-swal-styles';
  style.textContent = css;
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
