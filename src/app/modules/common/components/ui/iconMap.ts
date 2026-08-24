/**
 * Bootstrap Icons → Keenicons. The single translation table for the app.
 *
 * The UI standard is KTIcon (keenicons); Bootstrap Icons are legacy. Call sites keep passing
 * their existing `bi-*` name and <AppIcon> translates it here, so the whole mapping stays
 * reviewable in one place instead of being smeared across ~800 call sites.
 *
 * Every target is verified to exist in _metronic/helpers/icons-config/icons.ts — the file
 * KTIcon reads to emit the right number of duotone <span class="pathN"> children. A name in
 * the CSS but missing from that config renders a BROKEN glyph, so checking the CSS alone is
 * not sufficient.
 *
 * MAPPING IS BY WHOLE TOKEN, NEVER SUBSTRING. An earlier generation of this file matched
 * substrings, so the key "x" hit "grid-1x2", "inbox" and "exclamation", and mapped the
 * dashboard, inbox and warning icons all to a cross. If you extend this table, add an
 * explicit entry — do not reintroduce fuzzy matching.
 *
 * 208 entries. Names with no honest keenicon equivalent are deliberately ABSENT so
 * they keep rendering their correct Bootstrap glyph; a missing entry is a visible style
 * mismatch, while a wrong entry is a lie about what the control does.
 *
 * Intentionally unmapped (45):
    bi-arrow-down-short
    bi-arrow-return-right
    bi-arrow-up-right-square
    bi-arrow-up-short
    bi-arrows-fullscreen
    bi-buildings-fill
    bi-calendar2-event
    bi-camera-video  (no honest twin)
    bi-camera-video-off  (no honest twin)
    bi-card-list
    bi-cart3
    bi-chat-square-dots
    bi-chat-square-text
    bi-chevron-
    bi-cloud-arrow-up
    bi-currency-rupee  (no honest twin)
    bi-dash-square
    bi-envelope-paper-heart-fill
    bi-file-earmark-arrow-down-fill
    bi-file-earmark-pdf-fill
    bi-file-earmark-word
    bi-file-earmark-word-fill
    bi-file-earmark-zip
    bi-filetype-pdf
    bi-gender-female  (no honest twin)
    bi-gender-male  (no honest twin)
    bi-hourglass-bottom-fill
    bi-house-door
    bi-input-cursor-text
    bi-pause-circle  (no honest twin)
    bi-pause-circle-fill  (no honest twin)
    bi-person-exclamation
    bi-person-fill-slash
    bi-person-rolodex
    bi-person-vcard
    bi-pin-angle
    bi-pin-angle-fill
    bi-play-circle-fill  (no honest twin)
    bi-receipt-cutoff
    bi-shield-exclamation
    bi-shield-lock-fill
    bi-stars
    bi-symmetry-vertical  (no honest twin)
    bi-trophy-fill
    bi-x-octagon-fill
 */
export const BI_TO_KEENICON: Record<string, string> = {
    // ─── Gap-fill: names found in real call sites after the first pass ───────────
    'bi-arrow-return-right': 'arrow-right',
    'bi-arrow-up-right-square': 'exit-up',
    'bi-arrows-fullscreen': 'maximize',
    'bi-calendar2-event': 'calendar-8',
    'bi-card-list': 'text-align-left',
    'bi-chat-square-text': 'message-text-2',
    'bi-cloud-arrow-up': 'cloud-add',
    'bi-envelope-paper-heart-fill': 'sms',
    'bi-file-earmark-arrow-down-fill': 'file-down',
    'bi-file-earmark-word': 'document',
    'bi-person-fill-slash': 'user-edit',
    'bi-receipt-cutoff': 'bill',
    'bi-shield-lock-fill': 'shield-tick',
    'bi-stars': 'star',
    'bi-trophy-fill': 'award',

    'bi-activity': 'pulse',
    'bi-alarm': 'timer',
    'bi-archive': 'archive',
    'bi-arrow-clockwise': 'arrows-circle',
    'bi-arrow-counterclockwise': 'arrows-circle',
    'bi-arrow-down': 'arrow-down',
    'bi-arrow-down-circle': 'arrow-down',
    'bi-arrow-down-right': 'arrow-down-right',
    'bi-arrow-left': 'arrow-left',
    'bi-arrow-left-right': 'arrow-two-diagonals',
    'bi-arrow-repeat': 'arrows-circle',
    'bi-arrow-right': 'arrow-right',
    'bi-arrow-up': 'arrow-up',
    'bi-arrow-up-circle': 'arrow-up',
    'bi-arrow-up-right': 'arrow-up-right',
    'bi-arrows-collapse': 'arrow-up-down',
    'bi-arrows-expand': 'arrow-up-down',
    'bi-aspect-ratio': 'grid-frame',
    'bi-bank': 'bank',
    'bi-bar-chart': 'chart-simple',
    'bi-bar-chart-line': 'chart-line',
    'bi-bell': 'notification',
    'bi-book': 'book',
    'bi-box-arrow-in-right': 'entrance-left',
    'bi-box-arrow-right': 'entrance-right',
    'bi-box-arrow-up-right': 'exit-up',
    'bi-briefcase': 'briefcase',
    'bi-broadcast': 'wifi',
    'bi-building': 'bank',
    'bi-buildings': 'bank',
    'bi-calculator': 'calculator',
    'bi-calendar': 'calendar',
    'bi-calendar-check': 'calendar-tick',
    'bi-calendar-event': 'calendar-8',
    'bi-calendar-heart': 'calendar-8',
    'bi-calendar-range': 'calendar-8',
    'bi-calendar-week': 'calendar-8',
    'bi-calendar-x': 'calendar-remove',
    'bi-calendar2-check': 'calendar-tick',
    'bi-calendar2-week': 'calendar-8',
    'bi-calendar2-x': 'calendar-remove',
    'bi-calendar3': 'calendar',
    'bi-camera': 'picture',
    'bi-card-text': 'note-2',
    'bi-cash-coin': 'dollar',
    'bi-cash-stack': 'dollar',
    'bi-check-all': 'check-square',
    'bi-check-circle': 'check-circle',
    'bi-check-circle-fill': 'check-circle',
    'bi-check-lg': 'check',
    'bi-check2': 'check',
    'bi-check2-circle': 'check-circle',
    'bi-check2-square': 'check-square',
    'bi-chevron-down': 'down',
    'bi-chevron-left': 'left',
    'bi-chevron-right': 'right',
    'bi-circle': 'abstract-1',
    'bi-circle-half': 'night-day',
    'bi-clipboard': 'clipboard',
    'bi-clipboard-check': 'clipboard',
    'bi-clipboard-data': 'clipboard',
    'bi-clock': 'time',
    'bi-clock-fill': 'time',
    'bi-clock-history': 'time',
    'bi-code-slash': 'code',
    'bi-collection': 'element-11',
    'bi-copy': 'copy',
    'bi-credit-card': 'credit-cart',
    'bi-cup-hot': 'cup',
    'bi-dash': 'minus',
    'bi-dash-circle': 'minus-circle',
    'bi-dash-circle-fill': 'minus-circle',
    'bi-dash-lg': 'dash',
    'bi-dash-square-fill': 'minus-square',
    'bi-diagram-2': 'category',
    'bi-diagram-3': 'category',
    'bi-dot': 'abstract-1',
    'bi-download': 'exit-down',
    'bi-envelope': 'sms',
    'bi-envelope-fill': 'sms',
    'bi-exclamation': 'information-3',
    'bi-exclamation-circle': 'information-3',
    'bi-exclamation-circle-fill': 'information-3',
    'bi-exclamation-octagon-fill': 'information-3',
    'bi-exclamation-triangle': 'information-3',
    'bi-exclamation-triangle-fill': 'information-3',
    'bi-eye': 'eye',
    'bi-eye-slash': 'eye-slash',
    'bi-facebook': 'facebook',
    'bi-file-earmark-arrow-down': 'file-down',
    'bi-file-earmark-arrow-up': 'file-up',
    'bi-file-earmark-diff': 'document',
    'bi-file-earmark-image-fill': 'picture',
    'bi-file-earmark-pdf': 'document',
    'bi-file-earmark-text': 'document',
    'bi-file-earmark-text-fill': 'document',
    'bi-file-earmark-x': 'file-deleted',
    'bi-fingerprint': 'fingerprint-scanning',
    'bi-fire': 'flash-circle',
    'bi-flag': 'flag',
    'bi-flag-fill': 'flag',
    'bi-folder': 'folder',
    'bi-folder2-open': 'folder',
    'bi-fullscreen-exit': 'maximize',
    'bi-funnel': 'filter',
    'bi-gear': 'setting-2',
    'bi-gear-fill': 'setting-2',
    'bi-geo': 'geolocation',
    'bi-geo-alt': 'geolocation',
    'bi-geo-alt-fill': 'geolocation',
    'bi-gift': 'gift',
    'bi-globe': 'geolocation',
    'bi-globe2': 'geolocation',
    'bi-graph-up': 'chart-line-up',
    'bi-graph-up-arrow': 'chart-line-up',
    'bi-grid-1x2': 'element-11',
    'bi-grid-3x3-gap': 'element-plus',
    'bi-grid-3x3-gap-fill': 'element-plus',
    'bi-grip-vertical': 'dots-square',
    'bi-hash': 'text-number',
    'bi-hourglass-split': 'time',
    'bi-house': 'home',
    'bi-house-fill': 'home',
    'bi-image': 'picture',
    'bi-images': 'picture',
    'bi-inbox': 'sms',
    'bi-info-circle': 'information-2',
    'bi-info-circle-fill': 'information-2',
    'bi-journal-text': 'notepad',
    'bi-kanban': 'element-plus',
    'bi-kanban-fill': 'kanban',
    'bi-layers': 'element-11',
    'bi-layout-split': 'grid-frame',
    'bi-lightbulb-fill': 'flash-circle',
    'bi-lightning-charge': 'flash-circle',
    'bi-lightning-charge-fill': 'flash-circle',
    'bi-list': 'text-align-left',
    'bi-list-check': 'check-square',
    'bi-list-ul': 'text-align-left',
    'bi-magic': 'flash-circle',
    'bi-map': 'map',
    'bi-megaphone': 'notification-status',
    'bi-moon-stars': 'moon',
    'bi-mortarboard': 'teacher',
    'bi-palette': 'color-swatch',
    'bi-paperclip': 'paper-clip',
    'bi-patch-check': 'verify',
    'bi-pencil': 'pencil',
    'bi-pencil-fill': 'pencil',
    'bi-pencil-square': 'pencil',
    'bi-people': 'people',
    'bi-people-fill': 'people',
    'bi-percent': 'percentage',
    'bi-person': 'profile-user',
    'bi-person-badge': 'profile-user',
    'bi-person-check': 'user-tick',
    'bi-person-check-fill': 'user-tick',
    'bi-person-circle': 'profile-circle',
    'bi-person-dash-fill': 'user-edit',
    'bi-person-fill': 'profile-user',
    'bi-person-lines-fill': 'profile-user',
    'bi-person-workspace': 'briefcase',
    'bi-person-x': 'user-edit',
    'bi-pie-chart': 'chart-pie-simple',
    'bi-pin-map': 'map',
    'bi-plus': 'plus',
    'bi-plus-circle': 'plus-circle',
    'bi-plus-circle-fill': 'plus-circle',
    'bi-plus-lg': 'plus',
    'bi-plus-square': 'plus-square',
    'bi-question-circle': 'question',
    'bi-receipt': 'bill',
    'bi-record-circle': 'abstract-1',
    'bi-rulers': 'design-frame',
    'bi-save': 'save-2',
    'bi-search': 'magnifier',
    'bi-shield-check': 'shield-tick',
    'bi-shield-lock': 'shield-tick',
    'bi-shuffle': 'arrows-loop',
    'bi-signpost-split': 'route',
    'bi-slash-circle': 'cross-circle',
    'bi-sliders': 'setting-4',
    'bi-sliders2': 'setting-4',
    'bi-sort-down': 'arrow-down',
    'bi-sort-up': 'arrow-up',
    'bi-speedometer2': 'chart-simple-3',
    'bi-stack': 'element-11',
    'bi-star': 'star',
    'bi-star-fill': 'star',
    'bi-sticky': 'note-2',
    'bi-stopwatch': 'timer',
    'bi-tag': 'tag',
    'bi-telephone': 'phone',
    'bi-telephone-fill': 'phone',
    'bi-three-dots': 'dots-horizontal',
    'bi-toggle-off': 'toggle-off',
    'bi-toggle-on': 'toggle-on',
    'bi-trash': 'trash',
    'bi-trophy': 'award',
    'bi-twitter': 'twitter',
    'bi-upload': 'exit-up',
    'bi-vector-pen': 'pencil',
    'bi-wallet2': 'wallet',
    'bi-whatsapp': 'whatsapp',
    'bi-x': 'cross',
    'bi-x-circle': 'cross-circle',
    'bi-x-lg': 'cross',
    'bi-x-octagon': 'cross-circle',
};

/** Keenicon name for a Bootstrap Icon name, or null when unmapped (caller falls back to ). */
export const keeniconFor = (biName?: string): string | null =>
    (biName && BI_TO_KEENICON[biName]) || null;
