import { resolveActiveOrgId } from '@utils/activeOrg';
import { useEffect, useMemo, useState } from "react";
import * as Yup from 'yup';
import { Form, Formik } from "formik";
import { FileText, Pencil, Plus } from 'lucide-react';
import { toast } from "sonner";

import { PageLink, PageTitle } from "@metronic/layout/core";
import { PageHeadingTitle } from "@metronic/layout/components/header/page-title/PageHeadingTitle";
import { fetchOnboardingDocs, createOnboardingDocs, updateOnboardingDocs } from "@services/options";
import { fetchCompanyOverview } from "@services/company";
import { hasPermission } from "@utils/authAbac";
import { canSection } from "@utils/can";
import { apiErrorMessage } from "@utils/apiError";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { FormDialog } from '@/ds/patterns/form-dialog';
import { Alert, AlertDescription } from '@/ds/ui/alert';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/ds/ui/field';
import { Input } from '@/ds/ui/input';
import { Switch } from '@/ds/ui/switch';
import { Button } from '@/ds/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ds/ui/tooltip';
import { DataTable, SortableHeader, type ColumnDef } from '@/ds/patterns/data-table';
import { DataTableExport } from '@/ds/patterns/data-table-export';
import { Badge } from '@/ds/ui/badge';

const FORM_ID = 'onboarding-doc-form';

const onboardingDocs: Array<PageLink> = [
    { title: 'Company', path: '#', isSeparator: false, isActive: false },
    { title: '', path: '', isSeparator: true, isActive: false },
];

interface Onboarding {
    id: string;
    fieldName: string;
    companyId: string;
    isEnabled: boolean;
    hasIdentityNumber: boolean;
    createdAt: string;
}

interface OnboardingFormValues {
    companyId: string;
    fieldName: string;
    isEnabled: boolean;
    hasIdentityNumber: boolean;
}

const onboardingSchema = Yup.object({
    fieldName: Yup.string().required().label('File Name'),
    companyId: Yup.string(),
    isEnabled: Yup.boolean(),
    hasIdentityNumber: Yup.boolean(),
});

const defaultInitialValues: OnboardingFormValues = {
    companyId: "",
    fieldName: "",
    isEnabled: true,
    hasIdentityNumber: true,
};

function OnBoardingDocs() {
    const [showModal, setShowModal] = useState(false);
    const [data, setData] = useState<Onboarding[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [documentId, setDocumentId] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [initialValues, setInitialValues] = useState<OnboardingFormValues>(defaultInitialValues);
    const canWrite = canSection("users", "write");
    const [companyId, setCompanyId] = useState<string>('');

    useEffect(() => {
        const loadOnboardingDocs = async () => {
            setLoading(true);
            try {
                const { data: { documents = [] } } = await fetchOnboardingDocs(companyId);
                setData(documents);

                if (!companyId) {
                    let currCompanyId = documents[0]?.companyId || "";
                    if (!currCompanyId) {
                        const { data: { companyOverview } } = await fetchCompanyOverview();
                        currCompanyId = (resolveActiveOrgId(companyOverview) ?? '') || "";
                    }
                    setCompanyId(currCompanyId);
                }
            } catch (error) {
                console.error("Error fetching onboarding documents:", error);
            } finally {
                setLoading(false);
            }
        };

        if (companyId || data.length === 0) {
            loadOnboardingDocs();
        }
    }, [companyId]);


    const handleEditClick = (id: string) => {
        setDocumentId(id);
        const document = data.find(doc => doc.id === id);
        if (document) {
            setFormError(null);
            setInitialValues({
                companyId: document.companyId,
                fieldName: document.fieldName,
                isEnabled: document.isEnabled,
                hasIdentityNumber: document.hasIdentityNumber,
            });
            setEditMode(true);
            setShowModal(true);
        }
    };

    const handleShowModal = () => {
        setFormError(null);
        setInitialValues({ ...defaultInitialValues, companyId });
        setEditMode(false);
        setDocumentId("");
        setShowModal(true);
    };

    const columns = useMemo<ColumnDef<Onboarding>[]>(() => {
        const cols: ColumnDef<Onboarding>[] = [
            {
                accessorKey: "fieldName",
                meta: { label: "File Name" },
                header: ({ column }) => <SortableHeader column={column} title="File Name" />,
            },
            {
                accessorKey: "isEnabled",
                meta: {
                    label: "Is Enabled",
                    wrap: false,
                    exportValue: (r) => (r.isEnabled ? "Yes" : "No"),
                },
                header: "Is Enabled",
                cell: ({ row }) => (
                    <Badge variant={row.original.isEnabled ? "success" : "neutral"} dot>
                        {row.original.isEnabled ? "Yes" : "No"}
                    </Badge>
                ),
            },
        ];
        if (canWrite) {
            cols.push({
                id: "actions",
                meta: { label: "Actions", export: false, pin: "end", wrap: false },
                enableSorting: false,
                enableHiding: false,
                header: "Actions",
                cell: ({ row }) =>
                    hasPermission(
                        resourceNameMapWithCamelCase.onboardingDocument,
                        permissionConstToUseWithHasPermission.editOthers,
                    ) ? (
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Edit"
                                        onClick={() => handleEditClick(row.original.id)}
                                    />
                                }
                            >
                                <Pencil aria-hidden />
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                    ) : (
                        <span className="text-muted-foreground">Not Allowed</span>
                    ),
            });
        }
        return cols;
    }, [canWrite, data]);

    const handleClose = () => {
        setShowModal(false);
        setEditMode(false);
        setInitialValues(defaultInitialValues);
        setDocumentId("");
        setFormError(null);
    };

    const handleSubmit = async (values: OnboardingFormValues) => {
        setFormError(null);
        setSaving(true);
        try {
            if (editMode) {
                const payload = {
                    id: documentId,
                    fieldName: values.fieldName,
                    isEnabled: values.isEnabled,
                    hasIdentityNumber: values.hasIdentityNumber,
                };
                await updateOnboardingDocs(documentId, payload);
                setData(prevData =>
                    prevData.map(doc => doc.id === documentId ? { ...doc, ...payload } : doc)
                );
                toast.success('Onboarding document updated');
                handleClose();
                return;
            }

            const payload = {
                companyId,
                documents: [{
                    fieldName: values.fieldName,
                    isEnabled: values.isEnabled,
                    hasIdentityNumber: values.hasIdentityNumber,
                }]
            };
            await createOnboardingDocs(payload);
            setData(prevData => [...prevData, {
                ...values,
                id: '',
                companyId,
                createdAt: new Date().toISOString(),
            }]);
            toast.success('Onboarding document created');
            handleClose();
        } catch (err: unknown) {
            const action = editMode ? 'update' : 'create';
            setFormError(apiErrorMessage(err, `Failed to ${action} onboarding document`));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="flex flex-wrap items-center justify-between px-4 py-5 lg:px-9">
                <PageTitle breadcrumbs={onboardingDocs}>Onboarding Documents</PageTitle>
                <div className="flex w-full items-center justify-between">
                    <PageHeadingTitle />
                    <div>
                        {canWrite && hasPermission(resourceNameMapWithCamelCase.onboardingDocument, permissionConstToUseWithHasPermission.create) && (
                            <Button type="button" variant="tinted" size="sm" onClick={handleShowModal}>
                                <Plus data-icon="inline-start" aria-hidden />
                                New Onboarding Document
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            <div className="px-4 lg:px-9">
                {
                    hasPermission(resourceNameMapWithCamelCase.onboardingDocument, permissionConstToUseWithHasPermission.readOthers) &&
                    <DataTable
                        caption="Onboarding Documents"
                        columns={columns}
                        data={data}
                        getRowId={(r) => r.id}
                        loading={loading}
                        stateKey="company.onboardingDocs"
                        toolbar={(ctx) => (
                            <DataTableExport columns={columns} ctx={ctx} filename="Onboarding Documents" />
                        )}
                    />
                }
            </div>

            <Formik
                initialValues={initialValues}
                onSubmit={handleSubmit}
                validationSchema={onboardingSchema}
                enableReinitialize
            >
                {(fk) => {
                    const nameError =
                        (fk.touched.fieldName || fk.submitCount > 0)
                            ? (fk.errors.fieldName as string | undefined)
                            : undefined;
                    return (
                        <FormDialog
                            open={showModal}
                            onOpenChange={(open) => { if (!open) handleClose(); }}
                            title={editMode ? 'Edit Onboarding Document' : 'New Onboarding Document'}
                            description="Document type requested during employee onboarding"
                            icon={<FileText aria-hidden />}
                            size="sm"
                            formId={FORM_ID}
                            submitLabel={editMode ? 'Update Document' : 'Create Document'}
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
                                    <Field data-invalid={nameError ? true : undefined}>
                                        <FieldLabel htmlFor="onboarding-field-name">File Name</FieldLabel>
                                        <Input
                                            id="onboarding-field-name"
                                            name="fieldName"
                                            required
                                            autoFocus
                                            placeholder="Enter document name"
                                            disabled={saving}
                                            value={fk.values.fieldName}
                                            onChange={fk.handleChange}
                                            onBlur={fk.handleBlur}
                                            aria-invalid={nameError ? true : undefined}
                                            aria-describedby={nameError ? 'onboarding-field-name-error' : undefined}
                                        />
                                        {nameError ? (
                                            <FieldError id="onboarding-field-name-error">{nameError}</FieldError>
                                        ) : null}
                                    </Field>
                                    <Field orientation="horizontal">
                                        <FieldContent>
                                            <FieldLabel htmlFor="onboarding-is-enabled">Enabled</FieldLabel>
                                            <FieldDescription>
                                                When off, this document is hidden from onboarding checklists.
                                            </FieldDescription>
                                        </FieldContent>
                                        <Switch
                                            id="onboarding-is-enabled"
                                            checked={fk.values.isEnabled}
                                            disabled={saving}
                                            onCheckedChange={(checked) => {
                                                void fk.setFieldValue('isEnabled', checked);
                                            }}
                                        />
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

export default OnBoardingDocs;
