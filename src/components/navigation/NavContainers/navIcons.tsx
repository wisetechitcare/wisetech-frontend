import type { SvgIconComponent } from '@mui/icons-material';
import AccountTreeRounded from '@mui/icons-material/AccountTreeRounded';
import AdminPanelSettingsRounded from '@mui/icons-material/AdminPanelSettingsRounded';
import ApartmentRounded from '@mui/icons-material/ApartmentRounded';
import AssessmentRounded from '@mui/icons-material/AssessmentRounded';
import BadgeRounded from '@mui/icons-material/BadgeRounded';
import BarChartRounded from '@mui/icons-material/BarChartRounded';
import BusinessRounded from '@mui/icons-material/BusinessRounded';
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import CampaignRounded from '@mui/icons-material/CampaignRounded';
import CircleRounded from '@mui/icons-material/CircleRounded';
import ContactPageRounded from '@mui/icons-material/ContactPageRounded';
import ContactsRounded from '@mui/icons-material/ContactsRounded';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import DescriptionRounded from '@mui/icons-material/DescriptionRounded';
import EventAvailableRounded from '@mui/icons-material/EventAvailableRounded';
import EventRounded from '@mui/icons-material/EventRounded';
import FolderRounded from '@mui/icons-material/FolderRounded';
import GroupsRounded from '@mui/icons-material/GroupsRounded';
import HistoryRounded from '@mui/icons-material/HistoryRounded';
import InboxRounded from '@mui/icons-material/InboxRounded';
import PaymentsRounded from '@mui/icons-material/PaymentsRounded';
import PermMediaRounded from '@mui/icons-material/PermMediaRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import SpeedRounded from '@mui/icons-material/SpeedRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';
import TaskAltRounded from '@mui/icons-material/TaskAltRounded';
import ViewKanbanRounded from '@mui/icons-material/ViewKanbanRounded';
import WorkRounded from '@mui/icons-material/WorkRounded';

/**
 * Bootstrap Icons class → Material icon component.
 *
 * The navigation tree (hooks/useNavigation.ts) stores icons as Bootstrap Icons class
 * names because that is what the Metronic sidebar renders. This screen uses Material
 * icons instead, so the mapping lives here rather than being duplicated at each call
 * site — and the nav tree stays the single source of truth for WHICH icon an item has.
 *
 * Deep imports (not `import { X } from '@mui/icons-material'`) so the barrel's ~2,000
 * modules never enter the graph; this matches how the rest of the app imports icons.
 */
const ICON_BY_BI: Record<string, SvgIconComponent> = {
  'bi-inbox': InboxRounded,
  'bi-speedometer2': SpeedRounded,
  'bi-calendar-event': EventRounded,
  'bi-calendar-check': EventAvailableRounded,
  'bi-calendar2-week': CalendarMonthRounded,
  'bi-people': GroupsRounded,
  'bi-file-earmark-text': DescriptionRounded,
  'bi-megaphone': CampaignRounded,
  'bi-diagram-3': AccountTreeRounded,
  'bi-arrow-left-right': SwapHorizRounded,
  'bi-person-badge': BadgeRounded,
  'bi-bar-chart': BarChartRounded,
  'bi-cash-coin': PaymentsRounded,
  'bi-building': ApartmentRounded,
  'bi-person-lines-fill': ContactPageRounded,
  'bi-briefcase': WorkRounded,
  'bi-check2-square': TaskAltRounded,
  'bi-clock-history': HistoryRounded,
  'bi-clipboard-data': AssessmentRounded,
  'bi-house-fill': BusinessRounded,
  'bi-images': PermMediaRounded,
  'bi-shield-lock': AdminPanelSettingsRounded,
  'bi-gear': SettingsRounded,
  // Section headers (assigned in useNavContainers, not present in the nav tree itself)
  'bi-grid-1x2': DashboardRounded,
  'bi-person-rolodex': ContactsRounded,
  'bi-kanban': ViewKanbanRounded,
  'bi-folder': FolderRounded,
  'bi-record-circle': CircleRounded,
};

/**
 * Never returns undefined — an unmapped icon falls back to a neutral glyph rather than
 * rendering a hole. A new nav item ships with a working tile before anyone remembers to
 * add its icon here.
 */
export function navIcon(fontIcon?: string): SvgIconComponent {
  return (fontIcon && ICON_BY_BI[fontIcon]) || FolderRounded;
}
