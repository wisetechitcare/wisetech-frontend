/**
 * Share a generated file through the operating system's share sheet.
 *
 * This is the ONLY way a web page can hand a real image to WhatsApp. The `wa.me`
 * link API carries text and nothing else — it cannot take an attachment, and no
 * amount of URL crafting changes that. The Web Share API (Level 2) can, because the
 * OS does the handoff: the user taps Share, picks WhatsApp from the sheet, and the
 * file arrives as a normal image message.
 *
 * The consequence worth knowing: the app cannot post silently into a chat. The share
 * sheet is a user decision by design, and no browser lets a page bypass it. What this
 * module guarantees is that the image is *already attached* when the sheet opens, so
 * choosing WhatsApp is the only step left.
 *
 * Support is good on the platforms that matter for this (Android Chrome, iOS Safari
 * 15+, Chrome/Edge on Windows) and absent on desktop Firefox, so every caller needs
 * the fallback path — see `canShareFileType`.
 */

export type ShareOutcome =
  /** Handed to the OS sheet successfully. */
  | 'shared'
  /** The user closed the sheet without picking a target. Not an error. */
  | 'dismissed'
  /** No file sharing here — the caller should run its fallback. */
  | 'unsupported';

/**
 * Whether this browser can share a file of `type` through the OS share sheet.
 *
 * Probed with a throwaway 1-byte file because `navigator.canShare` inspects the
 * file's *type*, not its bytes — so capability can be settled before spending time
 * generating the real one. Call this BEFORE any `await`: on the fallback path the
 * caller usually needs to open a window, and a popup opened after the click's user
 * activation has been spent gets blocked.
 */
export const canShareFileType = (type = 'image/png'): boolean => {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
  try {
    const probe = new File([new Uint8Array(1)], `probe.${type.split('/')[1] || 'bin'}`, { type });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
};

export interface ShareFileOptions {
  file: File;
  title?: string;
  text?: string;
}

/**
 * Open the OS share sheet with `file` attached. Never throws — every failure maps to
 * an outcome the caller can branch on, because "the user changed their mind" and
 * "this browser can't do it" need different responses and neither is an error.
 */
export const shareFile = async ({ file, title, text }: ShareFileOptions): Promise<ShareOutcome> => {
  if (!canShareFileType(file.type)) return 'unsupported';
  try {
    await navigator.share({ files: [file], title, text });
    return 'shared';
  } catch (err) {
    const name = (err as Error)?.name;
    if (name === 'AbortError') return 'dismissed';
    // NotAllowedError normally means the click's transient user activation expired
    // while the file was being generated. Reporting it as unsupported sends the
    // caller down its fallback, which is more useful than surfacing the error.
    return 'unsupported';
  }
};

export interface ShareLinkOptions {
  url: string;
  title?: string;
  text?: string;
}

/**
 * Share a LINK: always copies it, and on touch devices also opens the OS share sheet
 * (WhatsApp, Messages, Mail…). Desktop gets the copy only — Chrome on Windows supports the
 * sheet too, but a system dialog on every click is noise where pasting is the habit.
 *
 * The copy is started first and not awaited, so the share call still runs inside the click's
 * transient user activation. Never throws. `copied` reports whether the clipboard took it;
 * `outcome` is the sheet's result ('unsupported' where no sheet was offered).
 */
export const shareLink = async ({ url, title, text }: ShareLinkOptions): Promise<{ copied: boolean; outcome: ShareOutcome }> => {
  const copy = (typeof navigator !== 'undefined' && navigator.clipboard?.writeText
    ? navigator.clipboard.writeText(url)
    : Promise.reject(new Error('no clipboard'))
  ).then(() => true, () => false);

  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  let outcome: ShareOutcome = 'unsupported';
  if (touch && typeof navigator.share === 'function') {
    try {
      await navigator.share({ url, title, text });
      outcome = 'shared';
    } catch (err) {
      outcome = (err as Error)?.name === 'AbortError' ? 'dismissed' : 'unsupported';
    }
  }
  return { copied: await copy, outcome };
};

/** A Google Maps link to a point — opens for anyone, on any device, no sign-in needed. */
export const mapsPlaceUrl = (lat: number, lng: number): string =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/** WhatsApp's share URL. Text only — attachments are not possible through this API. */
export const whatsAppShareUrl = (message: string): string =>
  `https://wa.me/?text=${encodeURIComponent(message)}`;
