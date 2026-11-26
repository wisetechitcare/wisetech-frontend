import { resolveActiveOrgId } from '@utils/activeOrg';
import { GlassDialog, GlassHeader, WtButton } from '@app/modules/common/components/ui';
import { Box, Stack, CircularProgress } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { useEffect, useMemo, useState } from "react";
import * as Yup from 'yup';
import { Form, Formik, FormikValues, useFormikContext } from "formik";
import { ICompanyDepartment } from "@models/company";
import { createNewDepartment, fetchAllDepartments, fetchCompanyOverview, fetchDepartmentById, updateDepartmentById } from "@services/company";
import { successConfirmation } from "@utils/modal";
import { DataTable, SortableHeader, type ColumnDef } from "@/ds/patterns/data-table";
import { DataTableExport } from "@/ds/patterns/data-table-export";
import TextInput from "@app/modules/common/inputs/TextInput";
import { Button } from "@/ds/ui/button";
import { Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip";
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
    type DepartmentRow = ICompanyDepartment & { id: string; _count?: { Employees?: number } }
    const [departments, setDepartments] = useState<DepartmentRow[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [departmentId, setDepartmentId] = useState('');
    const [isReady, setIsReady] = useState(false); 
    const isAdmin = useSelector((state: RootState)=> state.auth.currentUser.isAdmin);
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

    const columns = useMemo<ColumnDef<DepartmentRow>[]>(() => {
        const cols: ColumnDef<DepartmentRow>[] = [
            {
                accessorKey: "name",
                meta: { label: "Name" },
                header: ({ column }) => <SortableHeader column={column} title="Name" />,
            },
            {
                accessorKey: "code",
                meta: { label: "Code", wrap: false },
                header: ({ column }) => <SortableHeader column={column} title="Code" />,
            },
            {
                accessorKey: "description",
                meta: { label: "Description", exportValue: (r) => r.description || "—" },
                header: "Description",
                cell: ({ getValue }) => String(getValue() || "—"),
            },
            {
                id: "employeeCount",
                accessorFn: (row) => row._count?.Employees ?? 0,
                meta: { label: "Total Employees", exportType: "number", wrap: false },
                header: ({ column }) => <SortableHeader column={column} title="Total Employees" />,
                cell: ({ getValue }) => String(getValue() ?? 0),
            },
        ];

        if (hasPermission(resourceNameMapWithCamelCase.department, permissionConstToUseWithHasPermission.editOthers)) {
            cols.push({
                id: "actions",
                meta: { label: "Actions", export: false, pin: "end", wrap: false },
                enableSorting: false,
                enableHiding: false,
                header: "Actions",
                cell: ({ row }) => (
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label="Edit department"
                                    onClick={() => handleEditClick(row.original.id)}
                                />
                            }
                        >
                            <Pencil aria-hidden />
                        </TooltipTrigger>
                        <TooltipContent>Edit department</TooltipContent>
                    </Tooltip>
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
                successConfirmation('Department updated.');
                setShow(false);
                setEditMode(false);
                await fetchData();
            } else {
                const payload = [{ ...values, isActive: true }];
                await createNewDepartment(payload);
                successConfirmation('Department created.');
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
                  primaryAction={hasPermission(resourceNameMapWithCamelCase.department, permissionConstToUseWithHasPermission.create) ? { label: 'New Department', icon: 'bi-plus-lg', onClick: () => setShow(true), variant: 'primary' } : undefined}
                >
                  <div style={{ marginTop: SP.md }}>
                    <DataTable
                      caption="Departments"
                      columns={columns}
                      data={departments}
                      getRowId={(r) => r.id}
                      loading={loading}
                      stateKey="company.departments"
                      toolbar={(ctx) => (
                        <DataTableExport columns={columns} ctx={ctx} filename="Departments" />
                      )}
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