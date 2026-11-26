import { resolveActiveOrgId } from '@utils/activeOrg';
import { useEffect, useMemo, useState } from "react";
import * as Yup from 'yup';
import { Form, Formik } from "formik";
import { Briefcase, Pencil } from "lucide-react";
import { toast } from "sonner";

import { FormDialog } from '@/ds/patterns/form-dialog';
import { Alert, AlertDescription } from '@/ds/ui/alert';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/ds/ui/field';
import { Input } from '@/ds/ui/input';
import { createDesignation, fetchDesignations, updateDesignationById } from "@services/options";
import { ICompanyDesignation } from "@models/company";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { fetchCompanyOverview } from "@services/company";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { hasPermission } from "@utils/authAbac";
import { apiErrorMessage } from "@utils/apiError";
import {
  ConfigPageLayout,
  ConfigSectionCard,
  C,
  KEYFRAMES,
} from '@app/modules/configuration';
import { Button } from '@/ds/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ds/ui/tooltip';
import { DataTable, SortableHeader, type ColumnDef } from '@/ds/patterns/data-table';
import { DataTableExport } from '@/ds/patterns/data-table-export';

const FORM_ID = 'designation-form';

const designationSchema = Yup.object({
    role: Yup.string().required().label('Designation Name'),
    companyId: Yup.string(),
    isActive: Yup.boolean(),
});

const initialState: ICompanyDesignation = {
    role: "",
    companyId: "",
    isActive: false
}

interface Designation {
    id: string;
    role: string;
    comanyId: string;
    companyId?: string;
    _count?: { Employees?: number };
}

function Designations() {
    const [showModal, setShowModal] = useState(false);
    const [data, setData] = useState<Designation[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [designationId, setDesignationId] = useState('')
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [initialValues, setInitialValues] = useState<ICompanyDesignation>(initialState);
    const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
    const [companyId, setCompanyId] = useState<string>('');
    useEffect(() => {
        const loadDesignations = async () => {
            setLoading(true);
            try {
                const { data: { designations = [] } = {} } = await fetchDesignations();
                setData(designations?.map((des: Designation) => ({
                    ...des,
                    employeeCount: 0
                })));
                let currCompanyId = designations[0]?.companyId;

                if (!currCompanyId) {
                    const { data: { companyOverview } } = await fetchCompanyOverview();
                    currCompanyId = (resolveActiveOrgId(companyOverview) ?? '');
                }
                setCompanyId(currCompanyId);


            } catch (error) {
                console.error("Error fetching designations:", error);
            } finally {
                setLoading(false);
            }
        };
        loadDesignations();
    }, []);

    const handleEditClick = (id: string) => {
        setDesignationId(id);
        const designation = data.find(des => des.id === id);
        if (designation) {
            setFormError(null);
            setInitialValues({
                role: designation.role,
                companyId: designation.companyId,
                // Editing a name must not retire the designation: this sent `false`, so every edit here
                // deactivated the row and it vanished from every picker.
                isActive: true
            });
            setEditMode(true);
            setShowModal(true);
        }
    };

    const columns = useMemo<ColumnDef<Designation>[]>(
        () => {
            const cols: ColumnDef<Designation>[] = [
                {
                    accessorKey: "role",
                    meta: { label: "Designation Name" },
                    header: ({ column }) => <SortableHeader column={column} title="Designation Name" />,
                },
                {
                    id: "employeeCount",
                    accessorFn: (row) => row._count?.Employees ?? 0,
                    meta: { label: "Total Employees", exportType: "number", wrap: false },
                    header: ({ column }) => <SortableHeader column={column} title="Total Employees" />,
                    cell: ({ getValue }) => String(getValue() ?? 0),
                },
            ];

            if (hasPermission(resourceNameMapWithCamelCase.designation, permissionConstToUseWithHasPermission.editOthers)) {
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
                                        aria-label="Edit job profile"
                                        onClick={() => handleEditClick(row.original.id)}
                                    />
                                }
                            >
                                <Pencil aria-hidden />
                            </TooltipTrigger>
                            <TooltipContent>Edit job profile</TooltipContent>
                        </Tooltip>
                    ),
                });
            }

            return cols;
        },
        [isAdmin, data]
    );

    const handleClose = () => {
        setShowModal(false);
        setEditMode(false);
        setInitialValues(initialState);
        setDesignationId("");
        setFormError(null);
    };

    const openCreate = () => {
        setFormError(null);
        setEditMode(false);
        setInitialValues(initialState);
        setDesignationId("");
        setShowModal(true);
    };

    const handleSubmit = async (values: ICompanyDesignation) => {
        setFormError(null);
        setSaving(true);
        try {
            if (editMode) {
                await updateDesignationById(designationId, values);
                toast.success('Designation updated');
                handleClose();
                const { data: { designations = [] } = {} } = await fetchDesignations();
                setData(designations);
                return;
            }
            const payload = [{ isActive: true, companyId: companyId, role: values.role }];
            await createDesignation(payload);
            toast.success('Designation created');
            handleClose();
            const { data: { designations = [] } = {} } = await fetchDesignations();
            setData(designations);
        } catch (err: unknown) {
            const action = editMode ? 'update' : 'create';
            setFormError(apiErrorMessage(err, `Failed to ${action} designation`));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <style>{KEYFRAMES}</style>
            <ConfigPageLayout>
              {hasPermission(resourceNameMapWithCamelCase.designation, permissionConstToUseWithHasPermission.readOthers) && (
                <ConfigSectionCard
                  title={`${data.length} Designation${data.length !== 1 ? 's' : ''}`}
                  description="View and manage all designations configured in your organization"
                  icon="bi-list-ul"
                  iconColor="primary"
                  badge={{ label: `${data.length}`, color: C.primary, bg: C.primaryLight }}
                  loading={loading}
                  primaryAction={hasPermission(resourceNameMapWithCamelCase.designation, permissionConstToUseWithHasPermission.create) ? { label: 'New Designation', icon: 'bi-plus-lg', onClick: openCreate, variant: 'primary' } : undefined}
                >
                  <div className="mt-4">
                    <DataTable
                      caption="Designations"
                      columns={columns}
                      data={data}
                      getRowId={(r) => r.id}
                      loading={loading}
                      stateKey="company.designations"
                      toolbar={(ctx) => (
                        <DataTableExport columns={columns} ctx={ctx} filename="Designations" />
                      )}
                    />
                  </div>
                </ConfigSectionCard>
              )}
            </ConfigPageLayout>

            <Formik
              initialValues={initialValues}
              onSubmit={handleSubmit}
              validationSchema={designationSchema}
              enableReinitialize
            >
              {(fk) => {
                const roleError =
                  (fk.touched.role || fk.submitCount > 0)
                    ? (fk.errors.role as string | undefined)
                    : undefined;
                return (
                  <FormDialog
                    open={showModal}
                    onOpenChange={(open) => { if (!open) handleClose(); }}
                    title={editMode ? 'Edit Designation' : 'New Designation'}
                    description="Job title used across employee profiles and pickers"
                    icon={<Briefcase aria-hidden />}
                    size="sm"
                    formId={FORM_ID}
                    submitLabel={editMode ? 'Update Designation' : 'Create Designation'}
                    submitting={saving}
                    dirty={fk.dirty}
                  >
                    <Form id={FORM_ID} noValidate className="space-y-4">
                      {formError ? (
                        <Alert variant="destructive" role="alert">
                          <AlertDescription>{formError}</AlertDescription>
                        </Alert>
                      ) : null}
                      <FieldGroup>
                        <Field data-invalid={roleError ? true : undefined}>
                          <FieldLabel htmlFor="designation-role">Designation Name</FieldLabel>
                          <Input
                            id="designation-role"
                            name="role"
                            required
                            autoFocus
                            placeholder="Enter designation name"
                            disabled={saving}
                            value={fk.values.role}
                            onChange={fk.handleChange}
                            onBlur={fk.handleBlur}
                            aria-invalid={roleError ? true : undefined}
                            aria-describedby={roleError ? 'designation-role-error' : undefined}
                          />
                          {roleError ? (
                            <FieldError id="designation-role-error">{roleError}</FieldError>
                          ) : null}
                        </Field>
                      </FieldGroup>
                    </Form>
                  </FormDialog>
                );
              }}
            </Formik>
        </>
    );
}

export default Designations;
