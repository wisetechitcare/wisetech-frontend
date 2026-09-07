import { useIntl } from 'react-intl'
import { AsideMenuItemWithSub } from './AsideMenuItemWithSub'
import { AsideMenuItem } from './AsideMenuItem'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@redux/store'
import { useEffect, useState } from 'react'
import { fetchRolesAndPermissions } from '@redux/slices/rolesAndPermissions'
import { fetchCurrentEmployeeByEmpId } from '@services/employee'
import { usePinnedMenu } from '../../core/PinnedMenuContext'
import { useNavigation, NavigationItem } from '../../../../hooks/useNavigation'
import { SECTION_ICON } from '../../../../hooks/useNavContainers'
import { accentNameForSection } from '@components/navigation/NavContainers/navTheme'
import { navIcon } from '@components/navigation/NavContainers/navIcons'

export function AsideMenuMain() {
  const intl = useIntl()
  const dispatch = useDispatch();
  const { pinned } = usePinnedMenu();
  const [showAppSettings, setShowAppSettings] = useState(false);
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );

  async function fetchEmployeeAppVisibility(employeeId: string) {
    const response = await fetchCurrentEmployeeByEmpId(employeeId);
    if (!response.hasError) {
      setShowAppSettings(response.data?.employee?.showAppSettings);
    }
  }

  useEffect(() => {
    dispatch(fetchRolesAndPermissions() as any)
  }, [])

  useEffect(() => {
    if (!employeeId) return;
    fetchEmployeeAppVisibility(employeeId)
  }, [employeeId])

  const menuItems = useNavigation();

  // The nav tree is FLAT: a `section` node is a header and everything after it belongs
  // to that section until the next one. Tracking it while rendering is what lets each row
  // carry its application's accent — the same one the workspace shell paints its tiles
  // with — without a second section->item map that could drift from useNavContainers'.
  // Items before the first header are the Overview app's (see GENERAL_ID there).
  let sectionId = 'general-section';

  const renderMenuItem = (item: NavigationItem) => {
    if (item.visible === false) return null;

    if (item.type === 'section') {
      sectionId = item.id;
      const accent = accentNameForSection(item.id);
      const SectionIcon = navIcon(SECTION_ICON[item.id]);
      return (
        // Top of the tree. Sizing/weight/casing come from `.menu-tree-section` in
        // premium-layout.css so the three levels stay on one scale — no utility classes.
        <div className={`menu-item menu-tree-section wt-sec-${accent}`} key={item.id}>
          <div className='menu-content'>
            <span className='menu-section'>
              {/* The application's own glyph, in its own accent — the sidebar heading and
                  the workspace shell's app tile now show the same icon in the same colour. */}
              <SectionIcon className='menu-section-icon' fontSize='inherit' />
              {item.title}
            </span>
          </div>
        </div>
      );
    }

    const accentClass = `wt-sec-${accentNameForSection(sectionId)}`;

    if (item.type === 'sub' && item.children) {
      // Check if sub has any visible children, if not, hide it.
      const visibleChildren = item.children.filter(child => child.visible !== false);
      if (visibleChildren.length === 0) return null;

      return (
        <AsideMenuItemWithSub
          key={item.id}
          to={item.to || ''}
          title={item.title}
          icon={item.icon}
          fontIcon={item.fontIcon}
          accentClass={accentClass}
        >
          {item.children.map(child => renderMenuItem(child))}
        </AsideMenuItemWithSub>
      );
    }

    if (item.type === 'item') {
      return (
        <AsideMenuItem
          key={item.id}
          to={item.to || ''}
          title={item.title}
          icon={item.icon}
          activeIcon={item.activeIcon}
          fontIcon={item.fontIcon}
          hasBullet={item.hasBullet}
          badgeCount={item.badgeCount}
          accentClass={accentClass}
        />
      );
    }

    return null;
  };

  return (
    <>
      {pinned.length > 0 && (
        <>
          <div className='menu-item menu-tree-section'>
            <div className='menu-content'>
              <span className='menu-section'>Pinned</span>
            </div>
          </div>
          {pinned.map((item) => (
            <AsideMenuItem
              key={item.to}
              to={item.to}
              title={item.title}
              icon={item.icon}
              activeIcon={item.activeIcon}
              fontIcon='bi-layers'
            />
          ))}
          <div className='separator my-2 mx-4'></div>
        </>
      )}

      {menuItems.map(item => renderMenuItem(item))}
    </>
  )
}
