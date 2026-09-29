import { KTIcon } from '@metronic/helpers';
import { createRole, fetchRoles, updateRoleById, deleteRoleById, addEmployeeToRole, removeEmployeeFromRole } from '@services/roles';
import { fetchAllEmployees } from '@services/employee';
import { getAvatar } from '@utils/avatar';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { useEffect, useState } from 'react'
import { Box, Stack, Typography } from '@mui/material';
import {
  ActionIconButton, GlassDialog, GlassHeader, InlineHint, SettingsSection, TRIO, WtButton, WtEmptyState, WtField, toast,
} from '@app/modules/common/components/ui';
import { EmployeeSelectionDialog, type EmployeeOption } from '@app/modules/common/components/EmployeeSelectionDialog';
import RoleAccessEditor from './RoleAccessEditor';

// The server's explanation for a refused change (last Super Admin, role still in use, …).
const serverMessage = (error: any, fallback: string) => error?.response?.data?.detail || fallback;

const personName = (e: any) => `${e?.users?.firstName ?? ''} ${e?.users?.lastName ?? ''}`.trim();

/**
 * The second level of the Roles dialog. It carries no title or back control of its own — the
 * dialog's GlassHeader shows both, so there is one header on screen and one way back to the list.
 */
function EditRole({ roleDetails, setRefetch }: { roleDetails: any, setRefetch: (show: boolean) => void }) {
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.7fr) minmax(320px, 1fr)' }, alignItems: 'start' }}>
      <RoleAccessEditor roleId={roleDetails?.id} roleName={roleDetails?.name} setRefetch={setRefetch} />
      <Stack spacing={2}>
        <RoleMembers roleDetails={roleDetails} setRefetch={setRefetch} />
        {/* Built-in roles (Super Admin, Admin, Employee) keep their names. */}
        {!roleDetails?.isSystem && <EditRoleName setRefetch={setRefetch} roleDetails={roleDetails} />}
      </Stack>
    </Box>
  );
}

/** Who holds the role. Adding goes through the shared employee picker, several people at once. */
function RoleMembers({ setRefetch, roleDetails }: { setRefetch: (show: boolean) => void, roleDetails: any }) {
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>(roleDetails?.employees ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const isSuperAdminRole = roleDetails?.code === 'SUPER_ADMIN';
  const q = query.trim().toLowerCase();
  const shown = q ? members.filter((m: any) => personName(m).toLowerCase().includes(q)) : members;

  useEffect(() => {
    fetchAllEmployees(true)
      .then((res) => {
        // GET /api/employee/all answers { data: { employees: [...] } }.
        const list = res?.data?.employees;
        setAllEmployees(Array.isArray(list) ? list : []);
      })
      .catch(() => setAllEmployees([]));
  }, []);

  const memberIds = new Set(members.map((m: any) => m.id));
  const candidates: EmployeeOption[] = allEmployees
    .filter((e: any) => !memberIds.has(e.id))
    .map((e: any) => ({
      id: e.id,
      name: personName(e),
      designation: e?.designations?.role ?? undefined,
      avatar: e?.avatar || getAvatar(e?.avatar, e?.gender),
    }));

  const togglePicked = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleAdd = async () => {
    setAdding(true);
    const added: any[] = [];
    try {
      for (const id of picked) {
        await addEmployeeToRole(roleDetails.id, id);
        const emp = allEmployees.find((e) => e.id === id);
        if (emp) added.push(emp);
      }
      toast({ icon: 'success', title: `Added ${added.length} ${added.length === 1 ? 'person' : 'people'} to ${roleDetails?.name}.` });
    } catch (error) {
      errorConfirmation(serverMessage(error, 'Could not add everyone to this role.'));
    } finally {
      if (added.length) {
        setMembers((prev) => [...prev, ...added]);
        setRefetch(true);
      }
      setPicked([]);
      setPickerOpen(false);
      setAdding(false);
    }
  };

  const handleRemove = async (employee: any) => {
    setRemovingId(employee.id);
    try {
      await removeEmployeeFromRole(roleDetails.id, employee.id);
      setMembers((prev) => prev.filter((m: any) => m.id !== employee.id));
      setRefetch(true);
    } catch (error) {
      errorConfirmation(serverMessage(error, 'Could not remove this person from the role.'));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <SettingsSection
      tone={TRIO.purple}
      icon="people"
      title="People with this role"
      description={`${members.length} active ${members.length === 1 ? 'person holds' : 'people hold'} it.`}
      action={<WtButton size="small" flat onClick={() => setPickerOpen(true)} disabled={!candidates.length}>Add people</WtButton>}
    >
      {isSuperAdmin(roleDetails) && (
        <Box sx={{ mb: 1.5 }}>
          <InlineHint>Only a Super Admin can add or remove Super Admins, and the last one can't be removed.</InlineHint>
        </Box>
      )}
      {members.length > 0 && (
        <Box sx={{ mb: 1.25 }}>
          <WtField label="Search people" icon="magnifier" value={query} onChange={setQuery} />
        </Box>
      )}
      {members.length === 0 ? (
        <WtEmptyState dense title="Nobody holds this role yet" hint="Add the people who should have it." actionLabel="Add people" onAction={() => setPickerOpen(true)} />
      ) : shown.length === 0 ? (
        <WtEmptyState dense variant="no-match" title={`No one named "${query.trim()}"`} hint="Check the spelling, or clear the search." />
      ) : (
        <Stack spacing={0.75} sx={{ maxHeight: 420, overflowY: 'auto', pr: 0.5 }}>
          {shown.map((employee: any) => (
            <Stack
              key={employee.id}
              direction="row"
              alignItems="center"
              spacing={1.25}
              sx={{ px: 1.25, py: 0.75, borderRadius: 2, '&:hover': { bgcolor: 'action.hover' } }}
            >
              <Box
                component="img"
                src={employee?.avatar || getAvatar(employee?.avatar, employee?.gender)}
                alt=""
                sx={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
              <Typography sx={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: 'text.primary' }} noWrap>
                {personName(employee)}
              </Typography>
              <ActionIconButton
                size="sm"
                tone="danger"
                iconName="cross"
                title={`Remove ${personName(employee)} from ${roleDetails?.name}`}
                disabled={removingId === employee.id}
                onClick={() => handleRemove(employee)}
              />
            </Stack>
          ))}
        </Stack>
      )}

      <EmployeeSelectionDialog
        open={pickerOpen}
        onClose={() => { setPickerOpen(false); setPicked([]); }}
        title={`Add people to ${roleDetails?.name}`}
        subtitle={isSuperAdminRole ? 'They will see and edit every section, in every organization.' : 'They get this role on top of the ones they already hold.'}
        icon="people"
        tone="purple"
        employees={candidates}
        selectedIds={picked}
        onToggle={togglePicked}
        onSave={handleAdd}
        saveDisabled={!picked.length || adding}
        saveLabel={adding ? 'Adding…' : 'Add to role'}
      />
    </SettingsSection>
  );
}

const isSuperAdmin = (role: any) => role?.code === 'SUPER_ADMIN';

/** Renames a custom role. Built-in roles never show this. */
function EditRoleName({ setRefetch, roleDetails }: { setRefetch: (show: boolean) => void, roleDetails: any }) {
  const [roleName, setRoleName] = useState(roleDetails?.name || '');
  const [saving, setSaving] = useState(false);
  const trimmed = roleName.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= 50;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRoleById(roleDetails?.id, { name: trimmed });
      toast({ icon: 'success', title: 'Role renamed.' });
      setRefetch(true);
    } catch (error) {
      errorConfirmation(serverMessage(error, 'Could not rename the role.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection tone={TRIO.slate} icon="pencil" title="Role name">
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Box sx={{ flex: 1 }}>
          <WtField
            label="Name"
            value={roleName}
            onChange={setRoleName}
            hint="Up to 50 characters"
            error={!valid && roleName.length > 0 ? 'Use 1 to 50 characters' : undefined}
          />
        </Box>
        <WtButton flat onClick={handleSave} disabled={!valid || trimmed === roleDetails?.name || saving}>
          {saving ? 'Saving…' : 'Save'}
        </WtButton>
      </Stack>
    </SettingsSection>
  );
}

function AddNewRole({ setShowAddNewRole, setRefetch }: { setShowAddNewRole: (show: boolean) => void, setRefetch: (show: boolean) => void }) {
  const [roleName, setRoleName] = useState('');

  const handleFormSubmit = async () => {
    try {
      const res = await createRole({ name: roleName });
      // console.log("res::: ", res);
      if (!res?.hasError) {
        successConfirmation("Role created successfully");
        setRefetch(true);
      }
      else {
        errorConfirmation("Error: Something went wrong please try again");
      }
    } catch (error) {
      errorConfirmation(serverMessage(error, "Error: Something went wrong please try again"));
    }
    finally {
      setShowAddNewRole(false);
    }
  }

  return (
    <div
      style={{ borderRadius: '10px', fontFamily: 'Inter' }}
    >
      <div className='d-flex flex-column gap-2' >
        <label htmlFor="name">Role Name</label>
        <input type="text" id="name" placeholder="Role Name" className="form-control" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
        <span style={{ color: '#70829A', fontSize: '13px' }}>Must be between 1 - 50 characters </span>
      </div>
      <button className="btn btn-primary mt-5 mb-5 m-md-0 " style={{ marginRight: "auto" }} disabled={roleName?.length < 1 || roleName?.length > 50} onClick={handleFormSubmit}>Save</button>
    </div>
  )
}

/**
 * Roles list, and the role editor as a SECOND LEVEL of the same dialog.
 *
 * A react-bootstrap <Modal> opened from inside the MUI GlassDialog that hosts this list stacks at
 * z-index 1055 under the dialog's 1300, so it rendered behind the list, unreachable. The host owns
 * which role is open, because it titles the header and points Back at the list.
 */
function RolesAndPermissions({ editingRole, onEditRole }: { editingRole: any, onEditRole: (role: any) => void }) {
  const [allRoles, setallRoles] = useState([]);
  const [showAddNewRole, setShowAddNewRole] = useState(false);
  const [refetch, setRefetch] = useState(false);
  useEffect(() => {
    const fetchAllRoles = async () => {
      const response = await fetchRoles();
      const rolesData = response?.data;
      // console.log("rolesData: ", rolesData);
      setallRoles(rolesData);
    };
    fetchAllRoles();
  }, [refetch])

  const handleDeleteRole = async (roleId: string) => {
    try {
      const res = await deleteRoleById(roleId);
      // console.log("res::: ", res);
      if (!res?.hasError) {
        successConfirmation("Role deleted successfully");
        setRefetch(true);
      }
      else {
        errorConfirmation("Error: Something went wrong please try again");
      }
    } catch (error) {
      errorConfirmation(serverMessage(error, "Error: Something went wrong please try again"));
    }
  }

  if (editingRole) {
    return <EditRole roleDetails={editingRole} setRefetch={setRefetch} />;
  }

  return (
    <>
      <div className='d-flex flex-column mt-12 mb-12 m-md-3 p-5 p-md-10' style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', fontFamily: 'Inter' }}>
        {/* <div>RolesAndPermissions</div> */}
        <div className='d-flex flex-row align-items-center justify-content-start w-full m-md-1' style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', color: '#7A8597', fontSize: '13px' }}>
          {/* <div>RolesAndPermissions</div> */}
          <div className='col-4 col-md-4'>Role Names</div>
          <div className='col-4 col-md-3'>Total Users</div>
          <div className='col-4 col-md-3'>Actions</div>
        </div>
        {allRoles.map((role: any) => (
          <div key={role.id} className='d-flex flex-row align-items-center justify-content-start w-full m-1' style={{ backgroundColor: '#FFFFFF', fontSize: '14px', color: '#000000' }}>
            {/* <div>RolesAndPermissions</div> */}
            <div className='col-4 col-md-4'>
              {role.name}
              {role?.isSystem && (
                <span className='badge badge-light-primary fs-8 ms-2'>System</span>
              )}
            </div>
            <div className='col-4 col-md-3'>{role?.employees?.length}</div>
            <div className='col-4 col-md-3'>
              <div
                className="btn p-0 btn-active-color-primary btn-sm"
                onClick={() => onEditRole(role)}
                title="Edit role"
              >
                <KTIcon
                  iconName="pencil"
                  className="fs-3 cursor-pointer"
                />
              </div>
              {(!role?.isSystem) && <div
                className="btn p-0 btn-active-color-primary btn-sm"
                onClick={() => handleDeleteRole(String(role.id))}
              >
                <KTIcon
                  iconName="trash"
                  className="fs-3 cursor-pointer"
                />
              </div>}
            </div>
          </div>
        ))}
        <button
          className="btn btn-primary mt-10"
          style={{ marginRight: "auto" }}
          onClick={() => setShowAddNewRole(true)}
        >New Role</button>
      </div>
      {/* One field, so a small dialog rather than a third level — on the kit, so it stacks ABOVE
          the roles dialog instead of behind it. */}
      <GlassDialog
        open={showAddNewRole}
        onClose={() => setShowAddNewRole(false)}
        maxWidth="xs"
        header={<GlassHeader title="New role" onClose={() => setShowAddNewRole(false)} variant="plain" />}
      >
        <div className='p-5'>
          <AddNewRole setShowAddNewRole={setShowAddNewRole} setRefetch={setRefetch} />
        </div>
      </GlassDialog>
    </>
  )
}

export default RolesAndPermissions
