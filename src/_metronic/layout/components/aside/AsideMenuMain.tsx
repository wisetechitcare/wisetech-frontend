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

  const renderMenuItem = (item: NavigationItem) => {
    if (item.visible === false) return null;

    if (item.type === 'section') {
      return (
        <div className='menu-item' key={item.id}>
          <div className='menu-content py-2'>
            <span className='menu-section text-muted text-uppercase fs-5 ls-1 fw-semibold'>
              {item.title}
            </span>
          </div>
        </div>
      );
    }

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
        />
      );
    }

    return null;
  };

  return (
    <>
      {pinned.length > 0 && (
        <>
          <div className='menu-item'>
            <div className='menu-content py-2'>
              <span className='menu-section text-muted text-uppercase fs-5 ls-1 fw-semibold'>Pinned</span>
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
