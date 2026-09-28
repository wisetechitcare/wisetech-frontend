import { useState } from 'react';
import { Box, Stack } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { ListHeader, WtButton } from '@app/modules/common/components/ui';
import RolesAndPermissions from '@pages/company/settings/RolesAndPermissions';

/**
 * App Settings → Roles & Permissions: the roles list, and a role's editor as its second level
 * (Back returns to the list). Admin and above only — the route shows No access to anyone else, and
 * the server refuses them regardless.
 */
export function RolesPermissions() {
  // Which role is open, or null for the list.
  const [editingRole, setEditingRole] = useState<any>(null);

  return (
    <Box sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <ListHeader
          title={editingRole ? `Edit role “${editingRole?.name}”` : 'Roles & Permissions'}
          subtitle={editingRole ? 'Access, and the people who hold it' : 'Who can see and change what'}
          actions={
            editingRole ? (
              <WtButton ghost onClick={() => setEditingRole(null)} startIcon={<KTIcon iconName="arrow-left" className="fs-4" />}>
                all roles
              </WtButton>
            ) : undefined
          }
        />
        <RolesAndPermissions editingRole={editingRole} onEditRole={setEditingRole} />
      </Stack>
    </Box>
  );
}

export default RolesPermissions;
