import { useEffect, useMemo, useState } from "react";
import { Form, Formik, FormikValues } from "formik";
import { Modal } from "react-bootstrap";
import { MRT_ColumnDef } from "material-react-table";
import { KTIcon } from "@metronic/helpers";
import { PageLink, PageTitle } from "@metronic/layout/core";
import MaterialTable from "app/modules/common/components/MaterialTable";
import TextInput from "app/modules/common/inputs/TextInput";
import { PageHeadingTitle } from "@metronic/layout/components/header/page-title/PageHeadingTitle";
import { fetchOnboardingDocs, createOnboardingDocs, updateOnboardingDocs } from "@services/options";
import { successConfirmation } from '@utils/modal';
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { fetchCompanyOverview } from "@services/company";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";

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

const defaultInitialValues = {
    companyId: "",
    fieldName: "",
    isEnabled: true, // Default enabled
    hasIdentityNumber: true, // Default false
};

function OnBoardingDocs() {
    const [showModal, setShowModal] = useState(false);
    const [data, setData] = useState<Onboarding[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [documentId, setDocumentId] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialValues, setInitialValues] = useState(defaultInitialValues);
    const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
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
                        currCompanyId = companyOverview[0]?.id || "";
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
        setInitialValues({ ...defaultInitialValues, companyId });
        setEditMode(false);
        setShowModal(true);
    };

    const columns = useMemo<MRT_ColumnDef<Onboarding>[]>(() => [
        {
            accessorKey: "fieldName",
            header: "File Name",
            Cell: ({ row }) => row.original.fieldName,
        },
        {
            accessorKey: "isEnabled",
            header: "Is Enabled",
            Cell: ({ row }) => (row.original.isEnabled ? "Yes" : "No"),
        },
        ...(isAdmin
            ? [{
                accessorKey: "actions",
                header: "Actions",
                Cell: ({ row }: any) => {
                    return (hasPermission(resourceNameMapWithCamelCase.onboardingDocument, permissionConstToUseWithHasPermission.editOthers) ?
                        <button
                            className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                            onClick={() => handleEditClick(row.original.id)}
                        >
                            <KTIcon iconName='pencil' className='fs-3' />
                        </button> : "Not Allowed"
                    );
                }
            }]
            : []),
    ], [data]);

    const handleClose = () => {
        setShowModal(false);
        setEditMode(false);
        setInitialValues(defaultInitialValues);
        setDocumentId("");
    };

    const handleSubmit = async (values: any) => {
        try {
            setLoading(true);
            const payload = {
                companyId,
                documents: [{
                    fieldName: values.fieldName,
                    isEnabled: values.isEnabled,
                    hasIdentityNumber: values.hasIdentityNumber,
                }]
            };

            await createOnboardingDocs(payload);
            setData(prevData => [...prevData, values]);
            successConfirmation("Onboarding document created successfully");
            setShowModal(false);
            setEditMode(false);
        } catch (err) {
            console.error("Error creating document:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (values: any) => {
        try {
            setLoading(true);
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
            successConfirmation("Onboarding document updated successfully");
            setShowModal(false);
            setEditMode(false);
        } catch (err) {
            console.error("Error updating document:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="d-flex flex-wrap justify-content-between align-items-center px-lg-9 px-4 py-5">
                <PageTitle breadcrumbs={onboardingDocs}>Onboarding Documents</PageTitle>
                <div className="d-flex align-items-center justify-content-between w-100">
                    <PageHeadingTitle />
                    <div>
                        {isAdmin && hasPermission(resourceNameMapWithCamelCase.onboardingDocument, permissionConstToUseWithHasPermission.create) && (
                            <div className='card-toolbar text-end'>
                                <button onClick={handleShowModal} className='btn btn-sm btn-light-primary'>
                                    <KTIcon iconName='plus' className='fs-3' />
                                    New Onboarding Document
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="px-lg-9 px-4 ">
                {
                    hasPermission(resourceNameMapWithCamelCase.onboardingDocument, permissionConstToUseWithHasPermission.readOthers) &&
                    <MaterialTable columns={columns} data={data} tableName="Onboarding Documents" employeeId={employeeId} />
                }
            </div>
            <Modal show={showModal} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{editMode ? 'Edit' : 'Create'} Onboarding Document</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Formik
                        initialValues={initialValues}
                        onSubmit={editMode ? handleUpdate : handleSubmit}
                    >
                        {(formikProps) => (
                            <Form placeholder="">
                                <div className="row">
                                    <div className="col-lg-12">
                                        <TextInput
                                            isRequired={true}
                                            label="File Name"
                                            formikField="fieldName"
                                        />
                                    </div>
                                    <div className="col-lg-12">
                                        <div className="form-check form-switch">
                                            <input
                                                type="checkbox"
                                                name="isEnabled"
                                                className="form-check-input"
                                                checked={formikProps.values.isEnabled}
                                                onChange={formikProps.handleChange}
                                            />
                                            <label className="col-from-label required fw-bold fs-6">
                                                Is Enabled
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className='des-flex justify-content-end pt-20'>
                                    <button type='submit' className='btn btn-primary' disabled={loading}>
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button type='button' className='btn btn-secondary ms-2 text-white' onClick={handleClose}>
                                        Cancel
                                    </button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </Modal.Body>
            </Modal>
        </>
    );
}

export default OnBoardingDocs;
