import { resolveActiveOrgId } from '@utils/activeOrg';
import { useEffect, useMemo, useState } from "react";
import * as Yup from 'yup';
import { Form, Formik, FormikValues, useFormikContext } from "formik";
import { Modal } from "react-bootstrap";
import { MRT_ColumnDef } from "material-react-table";
import { ICompanyDepartment } from "@models/company";
import { createNewDepartment, fetchAllDepartments, fetchCompanyOverview, fetchDepartmentById, updateDepartmentById } from "@services/company";
import { successConfirmation } from "@utils/modal";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import TextInput from "@app/modules/common/inputs/TextInput";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import {
  ConfigPageLayout,
  ConfigSectionCard,
  C,
  FONT,
  SP,
  RADIUS,
  KEYFRAMES,
} from '@app/modules/configuration';

const departmentSchema = Yup.object({
    name: Yup.string().required().label('Department Name'),
    code: Yup.string().required().label('Department Code'),
    description: Yup.string(),
    companyId: Yup.string(),
    isActive: Yup.boolean(),
});

let initialState = {
    name: "",
    code: "",
    description: "",
    companyId: "",
    color: "",
    isActive: false,
}

// Fills companyId once when the create/edit form mounts. A real component
// (not code inside Formik's render prop) so the hook obeys the Rules of Hooks.
function CompanyIdInitializer() {
    const { setFieldValue } = useFormikContext<FormikValues>();
    useEffect(() => {
        async function fetchCompany() {
            const { data: { companyOverview } } = await fetchCompanyOverview();
            setFieldValue("companyId", (resolveActiveOrgId(companyOverview) ?? ''), true);
        }
        fetchCompany();
    }, []);
    return null;
}

function Departments() {
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [departmentId, setDepartmentId] = useState('');
    const [isReady, setIsReady] = useState(false); 
    const isAdmin = useSelector((state: RootState)=> state.auth.currentUser.isAdmin);
    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    useEffect(() => {
        if (isAdmin !== undefined) {
            setIsReady(true);
        }
        // console.log(hasPermission(resourceNameMapWithCamelCase.department, permissionConstToUseWithHasPermission.readOthers));

    }, [isAdmin]);
    const handleEditClick = async (id: string) => {
        setDepartmentId(id);
        const { data: { department } } = await fetchDepartmentById(id);
        const { name, code, companyId, isActive, color } = department;
        initialState = {
            name,
            code,
            description: department?.description || '',
            companyId,
            color,
            isActive
        }
        setShow(true);
        setEditMode(true);
    }

    const columns = useMemo<MRT_ColumnDef<ICompanyDepartment>[]>(() => {
        const cols: MRT_ColumnDef<ICompanyDepartment>[] = [
            {
                accessorKey: "name",
                header: "Name",
                Cell: ({ renderedCellValue }: any) => <span>{renderedCellValue}</span>
            },
            {
                accessorKey: "code",
                header: "Code",
                Cell: ({ renderedCellValue }: any) => <span>{renderedCellValue}</span>
            },
            {
                accessorKey: "description",
                header: "Description",
                Cell: ({ renderedCellValue }: any) => <span>{renderedCellValue || "-"}</span>
            },
            {
                accessorKey: "employeeCount",
                header: "Total Employees",
                Cell: ({ row }: any) => {
                    const employeeCount = row.original._count?.Employees || 0;
                    return <span>{employeeCount}</span>;
                }
            },
        ];

        if (isAdmin && hasPermission(resourceNameMapWithCamelCase.department, permissionConstToUseWithHasPermission.editOthers)) {
            cols.push({
                accessorKey: "actions",
                header: "Actions",
                Cell: ({ row }: any) => (
                    <button
                        className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                        onClick={() => handleEditClick(row.original.id)}
                        style={{ cursor: 'pointer' }}
                    >
                        <i className="bi bi-pencil" style={{ fontSize: '16px' }} />
                    </button>
                ),
            });
        }

        return cols;
    }, [isAdmin, departments]);

    async function fetchData() {
       try {
        setLoading(true);
        const { data: { departments } } = await fetchAllDepartments();
        setDepartments(departments);
       } catch (error) {
         console.log("error fetching departments", error);
       } finally {
            setLoading(false);
       }
    }
    
    useEffect(()=>{
        fetchData()
    },[])


    const handleClose = () => {
        setShow(false);
        setEditMode(false);
        initialState = {
            code: "",
            name: "",
            description: "",
            companyId: "",
            color: "",
            isActive: false
        };
        setDepartmentId("");
    }

    const handleSubmit = async (values: any, actions: FormikValues) => {
        try {
            setLoading(true);

            if (editMode) {
                await updateDepartmentById(departmentId, values);
                successConfirmation('Department updated successfully');
                setShow(false);
                setEditMode(false);
                await fetchData();
            } else {
                const payload = [{ ...values, isActive: true }];
                await createNewDepartment(payload);
                successConfirmation('Department created successfully');
                setShow(false);
                await fetchData();
            }

        } catch (err) {
            console.error("Error during creating or updating:", err);
        } finally {
            setLoading(false);
        }
    };


    return (
        <>
            <style>{KEYFRAMES}</style>
            <ConfigPageLayout
              title="Departments"
              subtitle="Manage departments and organizational structure"
              icon="bi-diagram-3"
              actions={
                isAdmin && hasPermission(resourceNameMapWithCamelCase.department, permissionConstToUseWithHasPermission.create) ? (
                  <button
                    onClick={() => setShow(true)}
                    style={{
                      backgroundColor: C.primary,
                      color: '#fff',
                      border: 'none',
                      borderRadius: RADIUS.md,
                      padding: '8px 16px',
                      fontFamily: FONT.body,
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: `0 4px 12px ${C.primaryShadow}`,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 6px 18px ${C.primaryShadowMd}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = `0 4px 12px ${C.primaryShadow}`;
                    }}
                  >
                    <i className="bi bi-plus-lg" style={{ fontSize: '14px' }} />
                    New Department
                  </button>
                ) : null
              }
            >
              {hasPermission(resourceNameMapWithCamelCase.department, permissionConstToUseWithHasPermission.readOthers) && (
                <ConfigSectionCard
                  title={`${departments.length} Department${departments.length !== 1 ? 's' : ''}`}
                  description="View and manage all departments in your organization"
                  icon="bi-folder2-open"
                  iconColor="purple"
                  badge={{ label: `${departments.length}`, color: C.purple, bg: C.purpleLight }}
                  loading={loading}
                >
                  <div style={{ marginTop: SP.md }}>
                    <MaterialTable
                      columns={columns}
                      data={departments}
                      tableName="Departments"
                      employeeId={employeeId}
                      muiTableProps={{
                        sx: {
                          '& .MuiTableCell-head': {
                            backgroundColor: C.bgSection,
                            fontWeight: 600,
                            fontSize: '13px',
                            color: C.textPrimary,
                            fontFamily: FONT.body,
                          },
                        },
                      }}
                    />
                  </div>
                </ConfigSectionCard>
              )}
            </ConfigPageLayout>

            <Modal show={show} onHide={handleClose} centered backdropClassName="modal-backdrop-blur">
                <Modal.Header closeButton style={{ borderBottom: `1px solid ${C.border}`, padding: `${SP.md} ${SP.lg}` }}>
                    <Modal.Title style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: '16px', color: C.textPrimary }}>
                        {editMode ? 'Edit Department' : 'Create New Department'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: SP.lg }}>
                    <Formik initialValues={initialState} onSubmit={handleSubmit} validationSchema={departmentSchema}>
                        {(formikProps) => {
                            return (
                                <Form>
                                    <CompanyIdInitializer />
                                    <div style={{ marginBottom: SP.lg }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.md, marginBottom: SP.md }}>
                                            <TextInput
                                                isRequired={true}
                                                label="Department Name"
                                                formikField="name" />
                                            <TextInput
                                                isRequired={true}
                                                label="Department Code"
                                                formikField="code" />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.md }}>
                                            <TextInput
                                                isRequired={false}
                                                label="Description"
                                                formikField="description" />
                                            <div>
                                                <label style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: '13px', color: C.textPrimary, display: 'block', marginBottom: '8px' }}>
                                                    Color Theme
                                                </label>
                                                <input
                                                    type="color"
                                                    name="color"
                                                    style={{
                                                      width: '100%',
                                                      height: '40px',
                                                      borderRadius: RADIUS.md,
                                                      border: `1px solid ${C.border}`,
                                                      cursor: 'pointer',
                                                    }}
                                                    value={formikProps.values.color}
                                                    onChange={(e) => formikProps.setFieldValue("color", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: SP.md, paddingTop: SP.lg }}>
                                      <button
                                        type='button'
                                        onClick={handleClose}
                                        style={{
                                          backgroundColor: C.bgCard,
                                          color: C.textSecondary,
                                          border: `1px solid ${C.border}`,
                                          borderRadius: RADIUS.md,
                                          padding: '8px 16px',
                                          fontFamily: FONT.body,
                                          fontWeight: 500,
                                          fontSize: '13px',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor = C.bgSection;
                                          e.currentTarget.style.borderColor = C.borderDark;
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = C.bgCard;
                                          e.currentTarget.style.borderColor = C.border;
                                        }}
                                      >
                                        Cancel
                                      </button>
                                        <button
                                          type='submit'
                                          disabled={loading || !formikProps.isValid}
                                          style={{
                                            backgroundColor: loading || !formikProps.isValid ? `${C.primary}80` : C.primary,
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: RADIUS.md,
                                            padding: '8px 16px',
                                            fontFamily: FONT.body,
                                            fontWeight: 600,
                                            fontSize: '13px',
                                            cursor: loading || !formikProps.isValid ? 'not-allowed' : 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s ease',
                                          }}
                                          onMouseEnter={(e) => {
                                            if (!loading && formikProps.isValid) {
                                              e.currentTarget.style.transform = 'translateY(-2px)';
                                              e.currentTarget.style.boxShadow = `0 6px 18px ${C.primaryShadowMd}`;
                                            }
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                          }}
                                        >
                                            {!loading && (editMode ? 'Update Department' : 'Create Department')}
                                            {loading && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: `2px solid rgba(255,255,255,0.3)`, borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} />
                                                    Please wait...
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </Form>
                            )
                        }}
                    </Formik>
                </Modal.Body>
            </Modal>

            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
              .modal-backdrop-blur {
                background-color: rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(2px);
              }
            `}</style>
        </>
    );
}

export default Departments;