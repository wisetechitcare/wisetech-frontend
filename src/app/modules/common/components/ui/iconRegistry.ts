/**
 * The single source of truth for every icon in the app.
 *
 * One table, one library (Lucide). Keys are the icon names call sites already pass —
 * keenicon names (`trash`), Bootstrap names (`bi-trash`), FontAwesome names (`fa-trash`) —
 * so a call site migrates by changing its element, never its name string.
 *
 * WHY THIS REPLACED THE ICON FONTS
 * Three fonts shipped on every route (keenicons 183KB + bootstrap-icons 131KB +
 * FontAwesome 282KB = ~596KB) to draw ~400 distinct glyphs. Fonts cannot tree-shake, so
 * the other ~2600 glyphs shipped too. Lucide are per-icon SVG components: only what this
 * table names is bundled.
 *
 * KEYS ARE WHOLE TOKENS, NEVER SUBSTRINGS. An earlier mapping matched substrings, so "x"
 * hit "grid-1x2", "inbox" and "exclamation" and pointed the dashboard, inbox and warning
 * icons all at a cross. Add an explicit entry; never reintroduce fuzzy matching.
 *
 * Every value is verified against lucide-react's exports by `iconRegistry.test.ts`. A
 * typo here is a build error, not a blank square at runtime.
 *
 * Brand marks are NOT here — Lucide removed brand icons for trademark reasons. They live
 * in `brandIcons.tsx` as inline paths, which is also where they lived before, because the
 * duotone font faded half of every logo away.
 */
import { createElement, forwardRef } from 'react';
import type { ComponentType } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import { BI_TO_KEENICON } from './iconMap';
import { FacebookIcon, TwitterIcon, WhatsAppIcon } from './brandIcons';
import {
    List, User, Circle, Share2, Sheet, Images, Cake, Pin, Truck, UserX, Cpu, Frown, Smile,
    Activity, AlarmClock, Archive, ArrowDownLeft, BadgeCheck, Database, Inbox, Link, ListTree, Printer, Receipt, ChartColumn, ChartNoAxesColumn, ChartPie,
    FileClock, IdCard, ShieldUser, StickyNote, X, ArrowDown, ArrowDownRight, ArrowLeft, ArrowLeftRight,
    ArrowRight, ArrowUp, ArrowUpDown, ArrowUpRight, Award, Banknote, Bell, BellRing,
    Book, Boxes, Briefcase, Building2, Calculator, Calendar, CalendarCheck, CalendarDays,
    CalendarOff, CalendarPlus, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight,
    ChevronUp, ChevronsLeft, ChevronsRight, CircleCheck, CircleMinus, CircleUser, CircleX,
    Clock, CloudCog, CloudDownload, CloudUpload, Compass, Component, Contact, CreditCard,
    Crown, DollarSign, Euro, Eye, EyeOff, File, FileDown, FilePlus, FileText, Funnel,
    FingerprintPattern, Flag, Folder, Frame, Gift, Grid2x2, Heart, Info, LayoutGrid, Layers,
    Landmark, ListFilter, Lock, LogOut, Mail, Map, MapPin, MessageSquareText, Minus,
    Monitor, Moon, MousePointerClick, NotebookPen, Package, PaintBucket, Paperclip,
    Pencil, Percent, Phone, Plus, ReceiptText, RefreshCw, Route, Rows3, Save, ScrollText,
    Search, Send, Settings, Settings2, Shapes, ShieldCheck, ShieldX, ShoppingBasket,
    Sparkles, Square, SquarePlus, Star, Sun, SunMoon, Timer, ToggleRight, Trash2,
    TriangleAlert, Unplug, Upload, UserCheck, Users, Wallet, Wand,
    WandSparkles, Wrench,
    BellDot, CalendarX, ChartLine, CirclePlus,
    CircleQuestionMark, ClockAlert, Clipboard, Code, Coffee, Columns3, Copy, Download, Ellipsis, FileArchive,
    FileUp, FileX, FlipVertical2, GraduationCap, Grip, House, Image, IndianRupee,
    EllipsisVertical, Files, ListOrdered, LogIn, Mars, Maximize, Menu, MessageSquareMore, Notebook, OctagonX, Palette,
    ShieldAlert, SlidersHorizontal, SquareCheck, SquareMinus, TextAlignStart,
    TextCursorInput, ToggleLeft, TrendingUp, UserPen, UserRound, Venus, Video, VideoOff,
    Wifi, Zap,
} from 'lucide-react';

/**
 * Every registry entry is a Lucide icon component.
 *
 * Typed as Lucide's own `LucideIcon` rather than a hand-written structural equivalent,
 * because React types `propTypes` invariantly: a look-alike interface that differs from
 * `LucideProps` by even one prop (`size` is `string | number`, not `number`) rejects all
 * 1716 icons at once. Taking the library's type means there is nothing to keep in sync.
 */
export type AppIconComponent = LucideIcon;

/**
 * Adapts an inline brand mark to the `LucideIcon` shape so the tables stay one type.
 * The brand components already take `size` and paint from `currentColor`; the only thing
 * missing was the forwarded ref that `LucideIcon` promises.
 */
const brand = (Mark: ComponentType<Record<string, unknown>>): AppIconComponent =>
    forwardRef<SVGSVGElement, LucideProps>((props, ref) => createElement(Mark, { ...props, ref }));

/** Keenicon names — the largest namespace, 135 in use across ~570 call sites. */
const KEENICON: Record<string, AppIconComponent> = {
    // Names reaching the registry from an OPTIONS ARRAY rather than a JSX literal — view
    // toggles, document-type maps, status maps, the global search index. The font migration
    // could not see them (`iconRegistry.test.ts` scanned JSX only), so each rendered nothing
    // at all: the Tasks board's Table toggle was a blank button.
    'burger-menu-1': List, 'grid-2': LayoutGrid, 'grid': Grid2x2, 'element-equal': Grid2x2,
    'abstract-8': Component, 'auto-brightness': Sun, 'calendar-2': Calendar,
    'circle': Circle, 'clock': Clock, 'delivery': Truck, 'download-1': Download,
    'error': CircleX, 'file-added': FilePlus, 'file-pdf': FileText, 'file-sheet': Sheet,
    'file-text': FileText, 'gallery': Images, 'graph-3': ChartColumn, 'cake': Cake,
    'info': Info, 'information-4': Info, 'mail': Mail, 'map001': Map, 'pin': Pin,
    'notification-bing': Bell, 'receipt-square': Receipt, 'share': Share2, 'share-1': Share2,
    'success': CircleCheck, 'technology-2': Cpu, 'user-cross': UserX, 'video': Video,
    'warning': TriangleAlert,
    // Prefixed spellings some call sites still pass.
    'ki-user': User, 'ki-document': FileText, 'ki-bank': Landmark, 'ki-education': GraduationCap,
    'ki-bill': Receipt, 'ki-wallet': Wallet, 'ki-folder': Folder,
    'fa-crown': Crown, 'fa-bolt': Zap, 'fa-face-frown': Frown, 'fa-face-smile': Smile,
    'fa-arrow-trend-up': TrendingUp,
    // Metronic's abstract/decorative shapes. These never named a concept, so the
    // replacement only has to be neutral and in-family, not literal.
    'abstract-14': Shapes, 'abstract-21': LayoutGrid, 'abstract-26': Layers,
    'abstract-41': Sparkles, 'abstract-42': Boxes, 'abstract-44': Grid2x2,
    'abstract-45': Component, 'element-11': LayoutGrid, 'element-plus': SquarePlus,
    'colors-square': Square, 'design-frame': Frame, 'category': LayoutGrid,

    'add-files': FilePlus, 'address-book': Contact, 'arrow-down': ArrowDown,
    'arrow-left': ArrowLeft, 'arrow-right': ArrowRight, 'arrow-up': ArrowUp,
    'arrow-two-diagonals': ArrowLeftRight, 'arrow-up-down': ArrowUpDown,
    'arrow-up-right': ArrowUpRight, 'arrows-circle': RefreshCw, 'badge': IdCard,
    'bank': Landmark, 'basket': ShoppingBasket, 'black-left': ChevronLeft,
    'black-right': ChevronRight, 'briefcase': Briefcase, 'bucket': PaintBucket,
    'calendar': Calendar, 'calendar-8': CalendarDays, 'calendar-add': CalendarPlus,
    'calendar-slash': CalendarOff, 'calendar-tick': CalendarCheck, 'chart': ChartColumn,
    'chart-pie-4': ChartPie, 'chart-simple': ChartColumn, 'chart-simple-3': ChartNoAxesColumn,
    'check': Check, 'check-circle': CircleCheck, 'cheque': Banknote, 'close': X,
    'cloud-add': CloudUpload, 'cloud-change': CloudCog, 'cloud-download': CloudDownload,
    'compass': Compass, 'credit-cart': CreditCard, 'cross': X, 'cross-circle': CircleX,
    'crown': Crown, 'disconnect': Unplug, 'document': FileText, 'dollar': DollarSign,
    'double-check': CheckCheck, 'double-left': ChevronsLeft, 'double-right': ChevronsRight,
    'down': ChevronDown, 'entity': Building2, 'euro': Euro, 'exit-right-corner': LogOut,
    'exit-up': Upload, 'eye': Eye, 'eye-slash': EyeOff, 'file': File, 'file-down': FileDown,
    'file-invoice': ReceiptText, 'filter': Funnel, 'fingerprint-scanning': FingerprintPattern,
    'flag': Flag, 'folder': Folder, 'geolocation': MapPin, 'gift': Gift, 'heart': Heart,
    'information': Info, 'information-5': Info, 'left': ChevronLeft, 'lock': Lock,
    'magic': Wand, 'magic-star': WandSparkles, 'magnifier': Search, 'map': Map,
    'message-text-2': MessageSquareText, 'minus': Minus, 'minus-circle': CircleMinus,
    'moon': Moon, 'night-day': SunMoon, 'note-2': StickyNote, 'notepad-edit': NotebookPen,
    'notification': Bell, 'notification-on': BellRing, 'office-bag': Briefcase,
    // Names the billing and task screens were already passing when the icon fonts were
    // replaced with Lucide. Unmapped, they render nothing at all — `iconRegistry.test.ts`
    // scans every call site for exactly this.
    'arrow-down-left': ArrowDownLeft, 'data': Database, 'dots-vertical': EllipsisVertical,
    'inbox': Inbox, 'link': Link, 'lock-2': Lock, 'printer': Printer,
    'receipt-cutoff': Receipt, 'tree': ListTree,
    'package': Package, 'paper-clip': Paperclip, 'pencil': Pencil, 'people': Users,
    'percentage': Percent, 'phone': Phone, 'plus': Plus, 'plus-square': SquarePlus,
    'pointers': MousePointerClick, 'profile-circle': CircleUser, 'pulse': Activity,
    'questionnaire-tablet': ScrollText, 'right': ChevronRight, 'route': Route,
    'row-horizontal': Rows3, 'save-2': Save, 'screen': Monitor, 'scroll': ScrollText,
    'search': Search, 'search-list': ListFilter, 'security-user': ShieldUser, 'send': Send,
    'setting-2': Settings, 'setting-3': Settings2, 'shield-cross': ShieldX,
    'shield-tick': ShieldCheck, 'sms': Mail, 'sort': ArrowUpDown, 'star': Star, 'sun': Sun,
    'switch': ToggleRight, 'time': Clock, 'timer': Timer, 'trash': Trash2, 'up': ChevronUp,
    'update-file': FileClock, 'user-tick': UserCheck, 'verify': BadgeCheck, 'wallet': Wallet,
    'warning-2': TriangleAlert, 'word': FileText, 'wrench': Wrench,
    // Written as raw `ki-duotone ki-*` classes rather than through <KTIcon>, so they never
    // showed up in an `iconName` scan until the font was being removed.
    'burger-menu': Menu, 'files': Files,
    // Used as a dropdown trigger on the documents table, next to `dots-square`. The keenicon
    // was a clasp shape that never read as "more actions" anyway; an overflow ellipsis says
    // what the button does.
    'fasten': EllipsisVertical,
    // Keenicon names that only ever appeared through the bi-* map.
    'alarm': AlarmClock, 'archive': Archive, 'arrow-down-right': ArrowDownRight,
    'book': Book, 'calculator': Calculator, 'tag': Flag, 'award': Award,
};

/**
 * Keenicon names reachable only through the legacy `BI_TO_KEENICON` bridge — no call site
 * writes them directly, but a `bi-*` name resolves to one, so they still need a glyph.
 */
const KEENICON_VIA_BI: Record<string, AppIconComponent> = {
    'abstract-1': Shapes, 'arrows-loop': RefreshCw, 'bill': ReceiptText,
    'calendar-remove': CalendarX, 'chart-line': ChartLine, 'chart-line-up': TrendingUp,
    'chart-pie-simple': ChartPie, 'check-square': SquareCheck, 'clipboard': Clipboard,
    'code': Code, 'color-swatch': Palette, 'copy': Copy, 'cup': Coffee, 'dash': Minus,
    'dots-horizontal': Ellipsis, 'dots-square': Grip, 'entrance-left': LogIn,
    'entrance-right': LogOut, 'exit-down': Download, 'file-deleted': FileX,
    'file-up': FileUp, 'flash-circle': Zap, 'grid-frame': LayoutGrid, 'home': House,
    'information-2': Info, 'information-3': Info, 'kanban': Columns3, 'maximize': Maximize,
    'minus-square': SquareMinus, 'notepad': Notebook, 'notification-status': BellDot,
    'picture': Image, 'plus-circle': CirclePlus, 'profile-user': UserRound,
    'question': CircleQuestionMark, 'setting-4': SlidersHorizontal, 'teacher': GraduationCap,
    'text-align-left': TextAlignStart, 'text-number': ListOrdered, 'toggle-off': ToggleLeft,
    'toggle-on': ToggleRight, 'user-edit': UserPen, 'wifi': Wifi,
    // Brand marks: Lucide removed these for trademark reasons, so they stay inline SVG.
    'facebook': brand(FacebookIcon), 'twitter': brand(TwitterIcon),
    'whatsapp': brand(WhatsAppIcon),
};

/**
 * Bootstrap names the old keenicon map left deliberately unmapped — it recorded them as
 * having "no honest twin" in the icon font, and rendered the Bootstrap glyph instead.
 * Lucide has all of them, so the fallback is no longer needed for these.
 */
const BI_DIRECT: Record<string, AppIconComponent> = {
    'bi-camera-video': Video, 'bi-camera-video-off': VideoOff,
    'bi-chat-square-dots': MessageSquareMore, 'bi-currency-rupee': IndianRupee,
    'bi-file-earmark-zip': FileArchive, 'bi-filetype-pdf': FileText,
    'bi-gender-female': Venus, 'bi-gender-male': Mars,
    'bi-input-cursor-text': TextCursorInput, 'bi-person-vcard': IdCard,
    'bi-shield-exclamation': ShieldAlert, 'bi-symmetry-vertical': FlipVertical2,
    'bi-trash3': Trash2, 'bi-x-octagon-fill': OctagonX,
    // "Check-out Missing" on the attendance overview. A person-with-exclamation has no
    // Lucide twin, and every user-* variant reads as removal or approval rather than an
    // unfinished record — a clock that needs attention says the actual thing.
    'bi-person-exclamation': ClockAlert,
    // Written by a template literal that never interpolated (`bi-chevron-${dir}`), so the
    // literal string "bi-chevron-" reaches us. Kept so it draws something until fixed.
    'bi-chevron-': ChevronRight,
};

/**
 * Resolve any icon name the app uses to its component.
 *
 * Order matters: a direct Bootstrap entry wins over the legacy bridge, because those are
 * the names the bridge could not serve. Everything else goes name -> (bi bridge) -> glyph.
 */
export function iconFor(name: string): AppIconComponent | null {
    if (!name) return null;
    const direct = BI_DIRECT[name] ?? KEENICON[name] ?? KEENICON_VIA_BI[name];
    if (direct) return direct;
    const keenicon = BI_TO_KEENICON[name];
    return (keenicon && (KEENICON[keenicon] ?? KEENICON_VIA_BI[keenicon])) || null;
}

/** Every name the registry can resolve — used by the test to prove no call site 404s. */
export const registeredNames = (): string[] => [
    ...Object.keys(KEENICON), ...Object.keys(KEENICON_VIA_BI), ...Object.keys(BI_DIRECT),
];
