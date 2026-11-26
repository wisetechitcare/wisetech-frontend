import { resolveActiveOrgId } from '@utils/activeOrg';
import { useEffect, useMemo, useState } from "react";
import * as Yup from 'yup';
import { Form, Formik } from "formik";
import { IdCard, Pencil, Plus } from 'lucide-react';
import { toast } from "sonner";

import { FormDialog } from '@/ds/patterns/form-dialog';
import { Alert, AlertDescription } from '@/ds/ui/alert';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/ds/ui/field';
import { Input } from '@/ds/ui/input';
import { Button } from '@/ds/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ds/ui/tooltip';
import { DataTable, SortableHeader, type ColumnDef } from '@/ds/patterns/data-table';
import { DataTableExport } from '@/ds/patterns/data-table-export';
import { createNewEmployeeType, fetchEmployeeTypes, updateEmployeeTypeById } from "@services/options";
import { fetchCompanyOverview } from "@services/company";
import { canSection } from "@utils/can";
import { apiErrorMessage } from "@utils/apiError";
import {
  ConfigPageLayout,
  ConfigSectionCard,
  C,
  KEYFRAMES,
} from '@app/modules/configuration';

const FORM_ID = 'employee-type-form';

const employeeTypeSchema = Yup.object({
    employeeType: Yup.string().required().label('Employee Type'),
    companyId: Yup.string(),
});

const initialState: IEmployeeType = {
    id: "",
    employeeType: "",
    companyId: "",
}

interface IEmployeeType {
    id: string;
    employeeType: string;
    companyId: string;
    _count?: { Employees?: number };
}

interface IEmployeeTypeResponse {
    id: string;
    type: string;
    companyId: string;
}

function EmployeeTypes() {
  const [showModal, setShowModal] = useState(false);
  const [data, setData] = useState<IEmployeeType[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<IEmployeeType>(initialState);
  const canWrite = canSection("settings", "write");
  const [companyId, setCompanyId] = useState<string>('');
  const [refresh, setRefresh] = useState(false)

  useEffect(() => {
      const loadEmployeeTypes = async () => {
          setLoading(true);
          try {
              const { data: { employeeTypes = [] } = {} } = await fetchEmployeeTypes();
              setData(employeeTypes?.map((des: IEmployeeTypeResponse) => ({
                  ...des,
                  employeeType: des.type,
                  employeeCount: 0
              })));
              let currCompanyId = employeeTypes[0]?.companyId;

              if (!currCompanyId) {
                  const { data: { companyOverview } } = await fetchCompanyOverview();
                  currCompanyId = (resolveActiveOrgId(companyOverview) ?? '');
              }
              setCompanyId(currCompanyId);

          } catch (error) {
              console.error("Error fetching employee types:", error);
          } finally {
              setLoading(false);
          }
      };
      loadEmployeeTypes();
  }, [refresh]);

  const handleEditClick = (id: string) => {
      const employeeTypeData = data.find(des => des.id === id);
      if (employeeTypeData) {
          setFormError(null);
          setInitialValues({
              id: employeeTypeData.id,
              employeeType: employeeTypeData.employeeType,
              companyId: employeeTypeData.companyId,
          });
          setEditMode(true);
          setShowModal(true);
      }
  };

  const columns = useMemo<ColumnDef<IEmployeeType>[]>(
      () => {
          const cols: ColumnDef<IEmployeeType>[] = [
              {
                  accessorKey: "employeeType",
                  meta: { label: "Employee Type" },
                  header: ({ column }) => <SortableHeader column={column} title="Employee Type" />,
              },
              {
                  id: "employeeCount",
                  accessorFn: (row) => row._count?.Employees ?? 0,
                  meta: { label: "Total Employees", exportType: "number", wrap: false },
                  header: ({ column }) => <SortableHeader column={column} title="Total Employees" />,
                  cell: ({ getValue }) => String(getValue() ?? 0),
              },
          ];

          if (canWrite) {
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
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label="Edit employee type"
                                      onClick={() => handleEditClick(row.original.id)}
                                  />
                              }
                          >
                              <Pencil aria-hidden />
                          </TooltipTrigger>
                          <TooltipContent>Edit employee type</TooltipContent>
                      </Tooltip>
                  ),
              });
          }

          return cols;
      },
      [canWrite, data]
  );

  const handleClose = () => {
      setShowModal(false);
      setEditMode(false);
      setInitialValues(initialState);
      setFormError(null);
  };

  const openCreate = () => {
      setFormError(null);
      setEditMode(false);
      setInitialValues(initialState);
      setShowModal(true);
  };

  const handleSubmit = async (values: IEmployeeType) => {
      setFormError(null);
      setSaving(true);
      try {
          if (editMode) {
              await updateEmployeeTypeById(values);
              toast.success('Employee Type updated');
              handleClose();
              setRefresh(prev => !prev);
              return;
          }
          const payload = { companyId: companyId, employeeTypes: [values.employeeType] };
          await createNewEmployeeType(payload);
          toast.success('Employee Type created');
          handleClose();
          setRefresh(prev => !prev);
      } catch (err: unknown) {
          const action = editMode ? 'update' : 'create';
          setFormError(apiErrorMessage(err, `Failed to ${action} employee type`));
      } finally {
          setSaving(false);
      }
  };

    return (
        <>
            <style>{KEYFRAMES}</style>
            <ConfigPageLayout
              actions={
                canWrite ? (
                  <Button type="button" variant="default" size="sm" onClick={openCreate}>
                    <Plus data-icon="inline-start" aria-hidden />
                    New Employee Type
                  </Button>
                ) : null
              }
            >
              <ConfigSectionCard
                title={`${data.length} Employee Type${data.length !== 1 ? 's' : ''}`}
                description="View and manage all employee types configured in your organization"
                icon="bi-person-badge"
                iconColor="green"
                badge={{ label: `${data.length}`, color: C.success, bg: C.successLight }}
                loading={loading}
              >
                <div className="mt-4">
                  <DataTable
                    caption="Employee Types"
                    columns={columns}
                    data={data}
                    getRowId={(r) => r.id}
                    loading={loading}
                    stateKey="company.employeeTypes"
                    toolbar={(ctx) => (
                      <DataTableExport columns={columns} ctx={ctx} filename="Employee Types" />
                    )}
                  />
                </div>
              </ConfigSectionCard>
            </ConfigPageLayout>

            <Formik
              initialValues={initialValues}
              onSubmit={handleSubmit}
              validationSchema={employeeTypeSchema}
              enableReinitialize
            >
              {(fk) => {
                const typeError =
                  (fk.touched.employeeType || fk.submitCount > 0)
                    ? (fk.errors.employeeType as string | undefined)
                    : undefined;
                return (
                  <FormDialog
                    open={showModal}
                    onOpenChange={(open) => { if (!open) handleClose(); }}
                    title={editMode ? 'Edit Employee Type' : 'New Employee Type'}
                    description="Classification used on employee profiles and filters"
                    icon={<IdCard aria-hidden />}
                    size="sm"
                    formId={FORM_ID}
                    submitLabel={editMode ? 'Update Employee Type' : 'Create Employee Type'}
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
                        <Field data-invalid={typeError ? true : undefined}>
                          <FieldLabel htmlFor="employee-type-name">Employee Type</FieldLabel>
                          <Input
                            id="employee-type-name"
                            name="employeeType"
                            required
                            autoFocus
                            placeholder="Enter employee type"
                            disabled={saving}
                            value={fk.values.employeeType}
                            onChange={fk.handleChange}
                            onBlur={fk.handleBlur}
                            aria-invalid={typeError ? true : undefined}
                            aria-describedby={typeError ? 'employee-type-name-error' : undefined}
                          />
                          {typeError ? (
                            <FieldError id="employee-type-name-error">{typeError}</FieldError>
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

export default EmployeeTypes
