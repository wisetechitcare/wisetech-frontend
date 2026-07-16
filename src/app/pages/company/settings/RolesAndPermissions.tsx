import { miscellaneousIcons } from '@metronic/assets/miscellaneousicons';
import { KTIcon } from '@metronic/helpers';
import { createRole, fetchRoles, updateRoleById, deleteRoleById, addEmployeeToRole, removeEmployeeFromRole } from '@services/roles';
import { fetchAllEmployees } from '@services/employee';
import { getAvatar } from '@utils/avatar';
import { errorConfirmation, successConfirmation, genericConfirmation } from '@utils/modal';
import { useEffect, useState } from 'react'
import { Modal } from 'react-bootstrap';
import RoleAccessEditor from './RoleAccessEditor';

function EditRole({ handleCloseEditModal, roleDetails, setRefetch }: { handleCloseEditModal: () => void, roleDetails: any, setRefetch: (show: boolean) => void }) {
  // A system role's NAME/existence never changes here regardless of who's
  // looking — that's the "stays intact" guarantee for Super Admin/Admin/Employee.
  // Its ACCESS (permission grants), though, depends on who's viewing: a Super
  // Admin can configure Admin's or Employee's permissions, an Admin can
  // configure Employee's — canEditAccess (from the roles list, hierarchy-aware
  // and computed server-side) answers that per-viewer question; isSystem alone
  // can't, since it doesn't know who's asking. Staff assignment stays editable
  // either way (who currently holds the role is an operational HR concern,
  // distinct from what the role itself grants).
  const nameReadOnly = !!roleDetails?.isSystem;
  const accessReadOnly = !roleDetails?.canEditAccess;

  return (
    <div className='px-3'>
      <div className='d-flex flex-row align-items-center justify-content-start gap-2'>
        <img src={miscellaneousIcons.leftArrow} alt="" style={{ width: "36px", height: "36px", cursor: 'pointer' }} onClick={handleCloseEditModal} />
        <h2 className='my-auto'>{accessReadOnly ? 'View' : 'Edit'} Role "{roleDetails?.name}"</h2>
      </div>
      <div className='row my-3 d-none d-lg-flex'>
        <div className='col-8'>
          <RoleAccessEditor roleId={roleDetails?.id} roleName={roleDetails?.name} setRefetch={setRefetch} readOnly={accessReadOnly} />
        </div>
        <div className='col-4' >
          <EditRoleName handleCloseEditModal={handleCloseEditModal} setRefetch={setRefetch} roleDetails={roleDetails} readOnly={nameReadOnly} />
          <StaffMemberForGivenRole handleCloseEditModal={handleCloseEditModal} setRefetch={setRefetch} roleDetails={roleDetails} />
        </div>
      </div>
      <div className='row my-3 d-flex d-lg-none'>
        <div className='col-12' >
          <EditRoleName handleCloseEditModal={handleCloseEditModal} setRefetch={setRefetch} roleDetails={roleDetails} readOnly={nameReadOnly} />
        </div>
        <div className='col-12' >
          <StaffMemberForGivenRole handleCloseEditModal={handleCloseEditModal} setRefetch={setRefetch} roleDetails={roleDetails} />
        </div>
      </div>
    </div>
  )
}

function StaffMemberForGivenRole({ handleCloseEditModal, setRefetch, roleDetails }: { handleCloseEditModal: (show: boolean) => void, setRefetch: (show: boolean) => void, roleDetails: any }) {
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>(roleDetails?.employees ?? []);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllEmployees(true)
      .then((res) => {
        const list = res?.data ?? res ?? [];
        setAllEmployees(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, []);

  const assignedIds = new Set(members.map((m: any) => m.id));

  const filtered = allEmployees.filter((emp: any) => {
    if (assignedIds.has(emp.id)) return false;
    const name = `${emp.users?.firstName ?? ''} ${emp.users?.lastName ?? ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const handleAdd = async () => {
    if (!selectedId) return;
    setAdding(true);
    try {
      const res = await addEmployeeToRole(roleDetails.id, selectedId);
      const emp = allEmployees.find((e) => e.id === selectedId);
      if (emp) setMembers((prev) => [...prev, emp]);
      setSelectedId('');
      setSearch('');
      setRefetch(true);
      // An employee holds exactly one role at a time — assigning them here
      // replaces whatever role they had before, so make that visible.
      const replacedRoles: string[] = res?.data?.replacedRoles ?? [];
      if (replacedRoles.length && emp) {
        successConfirmation(`${emp.users?.firstName ?? 'Employee'} moved from ${replacedRoles.join(', ')} to ${roleDetails.name}.`);
      }
    } catch {
      errorConfirmation('Failed to assign employee to role.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (employeeId: string) => {
    setRemovingId(employeeId);
    try {
      await removeEmployeeFromRole(roleDetails.id, employeeId);
      setMembers((prev) => prev.filter((m: any) => m.id !== employeeId));
      setRefetch(true);
    } catch {
      errorConfirmation('Failed to remove employee from role.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className='d-flex flex-column my-3 p-5 p-md-10 bg-white' style={{ borderRadius: '10px', fontFamily: 'Inter' }}>
      <h4 className='mb-4'>Staff members using this role</h4>

      <div className='d-flex gap-2 mb-4'>
        <div className='position-relative flex-grow-1'>
          <input
            type='text'
            className='form-control form-control-sm'
            placeholder='Search employee to add...'
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedId(''); }}
          />
          {search && filtered.length > 0 && (
            <div
              className='position-absolute bg-white border rounded shadow-sm w-100'
              style={{ zIndex: 10, maxHeight: '180px', overflowY: 'auto', top: '100%' }}
            >
              {filtered.slice(0, 10).map((emp: any) => (
                <div
                  key={emp.id}
                  className='px-3 py-2 cursor-pointer'
                  style={{ fontSize: '13px', cursor: 'pointer' }}
                  onMouseDown={() => {
                    setSelectedId(emp.id);
                    setSearch(`${emp.users?.firstName ?? ''} ${emp.users?.lastName ?? ''}`);
                  }}
                >
                  {emp.users?.firstName} {emp.users?.lastName}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          className='btn btn-sm btn-light-primary'
          disabled={!selectedId || adding}
          onClick={handleAdd}
        >
          {adding ? <span className='spinner-border spinner-border-sm' /> : 'Add'}
        </button>
      </div>

      <div className='d-flex flex-column gap-1'>
        {members.length === 0 && (
          <span className='text-muted fs-7'>No staff members assigned yet.</span>
        )}
        {members.map((employee: any) => (
          <div
            key={employee.id}
            className='d-flex align-items-center justify-content-between py-2 px-3 rounded'
            style={{ backgroundColor: '#f9f9f9', fontSize: '14px' }}
          >
            <div className='d-flex align-items-center gap-2'>
              <img
                src={employee?.avatar || getAvatar(employee.avatar, employee.gender)}
                style={{ objectFit: 'cover', width: '32px', height: '32px', borderRadius: '50%' }}
                alt=''
              />
              <span style={{ color: '#000' }}>{employee?.users?.firstName} {employee?.users?.lastName}</span>
            </div>
            <button
              className='btn btn-icon btn-sm btn-light-danger'
              title='Remove'
              disabled={removingId === employee.id}
              onClick={() => handleRemove(employee.id)}
            >
              {removingId === employee.id
                ? <span className='spinner-border spinner-border-sm text-danger' />
                : <KTIcon iconName='cross' className='fs-6 text-danger' />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditRoleName({ handleCloseEditModal, setRefetch, roleDetails, readOnly = false }: { handleCloseEditModal: (show: boolean) => void, setRefetch: (show: boolean) => void, roleDetails: any, readOnly?: boolean }) {
  const [roleName, setRoleName] = useState(roleDetails?.name || '');

  const handleFormSubmit = async () => {
    try {
      const res = await updateRoleById(roleDetails?.id, { name: roleName });
      // console.log("resFromUpdate::: ", res);
      if (!res?.hasError) {
        successConfirmation("Role updated successfully");
        setRefetch(true);
      }
      else {
        errorConfirmation("Error: Something went wrong please try again");
      }
    } catch (error) {
      console.log("error: ", error);
      errorConfirmation("Error: Something went wrong please try again");
    }
    finally {
      handleCloseEditModal(true);
    }
  }

  if (readOnly) {
    return (
      <div
        className='d-flex flex-column my-3 p-5 p-md-10 bg-white'
        style={{ borderRadius: '10px', fontFamily: 'Inter' }}
      >
        <label className='text-muted fs-8 mb-1'>Role Name</label>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>{roleDetails?.name}</div>
      </div>
    );
  }

  return (
    <div
      className='d-flex flex-column my-3 p-5 p-md-10  bg-white'
      style={{ borderRadius: '10px', fontFamily: 'Inter' }}
    >
      <div className='d-flex flex-column gap-2' >
        <label htmlFor="name">Role Name</label>
        <div className='d-flex flex-column gap-2 align-items-center justify-content-start'>
          <div className='d-flex flex-row gap-2' style={{ marginRight: "auto" }}>
            <input type="text" id="name" placeholder="Role Name" className="form-control" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
            <button className="btn btn-outline btn-light-primary" style={{ marginRight: "auto", backgroundColor: '#FFFFFF' }} disabled={roleName?.length < 1 || roleName?.length > 80} onClick={handleFormSubmit}>Save</button>
          </div>
          <span style={{ color: '#70829A', fontSize: '13px', marginRight: "auto" }}>Must be between 1 - 80 characters </span>
        </div>
      </div>
    </div>
  )
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
      console.log("error: ", error);
      errorConfirmation("Error: Something went wrong please try again");
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
        <span style={{ color: '#70829A', fontSize: '13px' }}>Must be between 1 - 80 characters </span>
      </div>
      <button className="btn btn-primary mt-5 mb-5 m-md-0 " style={{ marginRight: "auto" }} disabled={roleName?.length < 1 || roleName?.length > 80} onClick={handleFormSubmit}>Save</button>
    </div>
  )
}

function RolesAndPermissions() {
  const [allRoles, setallRoles] = useState([]);
  const [showAddNewRole, setShowAddNewRole] = useState(false);
  const [showEditModal, setshowEditModal] = useState(false)
  const [roleToEdit, setRoleToEdit] = useState(null);
  // A plain boolean here would only ever transition false->true once; every
  // later action calling setRefetch(true) while it's already true is a no-op
  // (React skips re-render for an unchanged value), silently breaking the list
  // refresh after the first create/edit/delete. A tick counter guarantees a
  // real state change on every call while keeping the same setRefetch(true)
  // call signature every child component already uses.
  const [refetchTick, setRefetchTick] = useState(0);
  const setRefetch = (show: boolean) => { if (show) setRefetchTick((t) => t + 1); };
  useEffect(() => {
    const fetchAllRoles = async () => {
      const response = await fetchRoles();
      const rolesData = response?.data;
      // console.log("rolesData: ", rolesData);
      setallRoles(rolesData);
    };
    fetchAllRoles();
  }, [refetchTick])

  const handleCloseEditModal = () => {
    setshowEditModal(false);
  }

  const handleDeleteRole = async (role: any) => {
    const userCount = role?.employees?.length ?? 0;
    const text = userCount > 0
      ? `This role has ${userCount} user${userCount === 1 ? '' : 's'} currently assigned. Deleting it will remove their access granted through this role. This action cannot be undone.`
      : "Are you sure you want to delete this role? This action cannot be undone.";
    const confirmed = await genericConfirmation("Delete Role", text, "Delete");
    if (!confirmed) return;

    try {
      const res = await deleteRoleById(role.id);
      // console.log("res::: ", res);
      if (!res?.hasError) {
        successConfirmation("Role deleted successfully");
        setRefetch(true);
      }
      else {
        errorConfirmation("Error: Something went wrong please try again");
      }
    } catch (error) {
      console.log("error: ", error);
      errorConfirmation("Error: Something went wrong please try again");
    }
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
              {role?.canEditAccess && (
                <div
                  className="btn p-0 btn-active-color-primary btn-sm"
                  onClick={() => { setRoleToEdit(role); setshowEditModal(true) }}
                  title="Edit permissions"
                >
                  <KTIcon
                    iconName="pencil"
                    className="fs-3 cursor-pointer"
                  />
                </div>
              )}
              {!role?.canEditAccess && (
                <div
                  className="btn p-0 btn-active-color-info btn-sm"
                  onClick={() => { setRoleToEdit(role); setshowEditModal(true) }}
                  title="View permissions"
                >
                  <KTIcon
                    iconName="eye"
                    className="fs-3 cursor-pointer"
                  />
                </div>
              )}
              {(!role?.isSystem) && <div
                className="btn p-0 btn-active-color-primary btn-sm"
                onClick={() => handleDeleteRole(role)}
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
      {/* Add New Role Modal */}
      <Modal show={showAddNewRole} onHide={() => setShowAddNewRole(false)} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Body className='d-flex flex-column gap-6'>
          <Modal.Title>Add New Role</Modal.Title>
          <AddNewRole setShowAddNewRole={setShowAddNewRole} setRefetch={setRefetch} />
        </Modal.Body>
      </Modal>
      {/* Edit Role Modal */}
      <Modal show={showEditModal} onHide={handleCloseEditModal} size="xl" aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Body style={{ backgroundColor: '#F7F9FC', borderRadius: '10px' }}>
          <EditRole handleCloseEditModal={handleCloseEditModal} roleDetails={roleToEdit} setRefetch={setRefetch} />
        </Modal.Body>
      </Modal>
    </>
  )
}

export default RolesAndPermissions
