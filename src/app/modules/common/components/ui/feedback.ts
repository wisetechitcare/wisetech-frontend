import Swal, { SweetAlertIcon } from 'sweetalert2';
import { T } from './tokens';

/**
 * Branded SweetAlert wrappers — premium toasts, alerts and confirms that match
 * the UI kit (tokens, radius, brand buttons). Reusable everywhere in place of
 * raw `Swal.fire`, so feedback is consistent across the app.
 */

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

    /* Toast variant — same skin, dialog proportions stripped out. The shared
       .wt-swal-popup padding and 18px title are sized for a modal and make a
       one-line notice look like an announcement. */
    .wt-swal-toast{padding:4px 6px;margin:0 0 20px 20px;max-width:min(380px,calc(100vw - 40px));}
    .wt-swal-toast .wt-swal-title{font-size:14px;font-weight:650;margin:0;}
    .wt-swal-toast .wt-swal-html{font-size:12.5px;}

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
    icon: opts.icon, title: opts.title, text: opts.text, html: opts.html,
    toast: true,
    position: 'bottom-start',
    backdrop: false,
    timer: opts.timer ?? 2200, showConfirmButton: false, timerProgressBar: true,
    customClass: { ...baseClass, popup: 'wt-swal-popup wt-swal-toast' },
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
    icon: opts.icon, title: opts.title, text: opts.text, html: opts.html,
    confirmButtonText: opts.confirmText ?? 'OK', buttonsStyling: false,
    customClass: baseClass,
  });
}

/** Branded confirm — resolves true when confirmed. Pass `danger` for destructive actions. */
export async function confirmDialog(opts: FeedbackOptions & { confirmText?: string; cancelText?: string; danger?: boolean }): Promise<boolean> {
  ensureStyles();
  const res = await Swal.fire({
    icon: opts.icon ?? 'warning', title: opts.title, text: opts.text, html: opts.html,
    showCancelButton: true,
    confirmButtonText: opts.confirmText ?? 'Confirm',
    cancelButtonText: opts.cancelText ?? 'Cancel',
    reverseButtons: true, buttonsStyling: false,
    customClass: { ...baseClass, confirmButton: `wt-swal-confirm${opts.danger ? ' wt-danger' : ''}` },
  });
  return !!res.isConfirmed;
}
