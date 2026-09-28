import { resolveActiveOrgId } from '@utils/activeOrg';
import { ActionIconButton, GlassDialog, GlassHeader, WtButton } from '@app/modules/common/components/ui';
import { Box, Stack, CircularProgress } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { useEffect, useMemo, useState } from "react";
import * as Yup from 'yup';
import { Form, Formik, FormikValues, useFormikContext } from "formik";
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
                    <ActionIconButton
                        iconName="pencil"
                        title="Edit department"
                        onClick={() => handleEditClick(row.original.id)}
                    />
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
            {/* ConfigPageLayout already injects KEYFRAMES; this was a second copy. */}
            <ConfigPageLayout>
              {hasPermission(resourceNameMapWithCamelCase.department, permissionConstToUseWithHasPermission.readOthers) && (
                <ConfigSectionCard
                  title={`${departments.length} Department${departments.length !== 1 ? 's' : ''}`}
                  description="View and manage all departments in your organization"
                  icon="bi-folder2-open"
                  iconColor="primary"
                  badge={{ label: `${departments.length}`, color: C.primary, bg: C.primaryLight }}
                  loading={loading}
                  primaryAction={isAdmin && hasPermission(resourceNameMapWithCamelCase.department, permissionConstToUseWithHasPermission.create) ? { label: 'New Department', icon: 'bi-plus-lg', onClick: () => setShow(true), variant: 'primary' } : undefined}
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

            <GlassDialog
                open={show} onClose={handleClose} maxWidth="sm" fullWidth
                header={
                    <GlassHeader
                        title={editMode ? 'Edit Department' : 'Create New Department'}
                        icon={<KTIcon iconName="briefcase" className="fs-1" />}
                        onClose={handleClose}
                    />
                }
            >
                <Box sx={{ p: { xs: 2, sm: 2.75 } }}>
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

                                    <Stack direction="row" spacing={1.25} justifyContent="flex-end" sx={{ mt: 2.5, flexWrap: 'wrap', gap: 1.25 }}>
                                        <WtButton ghost onClick={handleClose}>Cancel</WtButton>
                                        <WtButton
                                            type="submit"
                                            disabled={loading || !formikProps.isValid}
                                            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
                                        >
                                            {loading ? 'Please wait…' : editMode ? 'Update Department' : 'Create Department'}
                                        </WtButton>
                                    </Stack>
                                </Form>
                            )
                        }}
                    </Formik>
                </Box>
            </GlassDialog>

        </>
    );
}

export default Departments;