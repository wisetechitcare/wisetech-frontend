import { memo } from 'react';
import type { SvgIconProps } from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import BusinessIcon from '@mui/icons-material/Business';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import StoreMallDirectoryOutlinedIcon from '@mui/icons-material/StoreMallDirectoryOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';

/**
 * Unit `type` is a free-form string on the backend. We map the known values to
 * an icon and fall back to a neutral folder icon for anything unrecognised, so
 * new types added server-side never break the tree.
 */
const ICONS: Record<string, typeof BusinessIcon> = {
  organization: ApartmentIcon,
  suborganization: AccountTreeOutlinedIcon,
  branch: StoreMallDirectoryOutlinedIcon,
  department: GroupsOutlinedIcon,
  team: GroupsOutlinedIcon,
  division: BusinessIcon,
};

export const iconForType = (type: string): typeof BusinessIcon =>
  ICONS[type?.toLowerCase().replace(/[\s_-]+/g, '')] ?? FolderOutlinedIcon;

export const UnitTypeIcon = memo(({ type, ...props }: { type: string } & SvgIconProps) => {
  const Icon = iconForType(type);
  return <Icon {...props} />;
});
UnitTypeIcon.displayName = 'UnitTypeIcon';

export default UnitTypeIcon;
