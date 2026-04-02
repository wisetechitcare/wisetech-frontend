import { useEffect, useMemo, useState } from "react";
import * as Yup from 'yup';
import { Form, Formik, FormikValues } from "formik";
import { Modal } from "react-bootstrap";
import { MRT_ColumnDef } from "material-react-table";
import { KTIcon } from "@metronic/helpers";
import { PageLink, PageTitle } from "@metronic/layout/core";
import MaterialTable from "app/modules/common/components/MaterialTable";
import TextInput from "app/modules/common/inputs/TextInput";
import { PageHeadingTitle } from "@metronic/layout/components/header/page-title/PageHeadingTitle";
import { createDesignation, fetchDesignations, updateDesignationById } from "@services/options";
import { successConfirmation } from '@utils/modal';
import { ICompanyDesignation } from "@models/company";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { fetchCompanyOverview } from "@services/company";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { hasPermission } from "@utils/authAbac";

const designationBreadCrumb: Array<PageLink> = [
    {
        title: 'Company',
        path: '#',
        isSeparator: false,
        isActive: false
    },
    {
        title: '',
        path: '',
        isSeparator: true,
        isActive: false
    },
];

const designationSchema = Yup.object({
    role: Yup.string().required().label('Designation Name'),
    companyId: Yup.string(),
    isActive: Yup.boolean(),
});

let initialState: ICompanyDesignation = {
    role: "",
    companyId: "",
    isActive: false
}

interface Designation {
    id: string;
    role: string;
    comanyId: string;
}

function Designations() {
    const [showModal, setShowModal] = useState(false);
    const [data, setData] = useState<Designation[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [designationId, setDesignationId] = useState('')
    const [loading, setLoading] = useState(false);
    const [initialValues, setInitialValues] = useState<ICompanyDesignation>(initialState);
    const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
    const [companyId, setCompanyId] = useState<string>('');
    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);


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
                    currCompanyId = companyOverview[0]?.id;
                    // console.log("currCompanyId", currCompanyId);     
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
        const designation: any = data.find(des => des.id === id);
        if (designation) {
            setInitialValues({
                role: designation.role,
                companyId: designation.companyId,
                isActive: false
            });
            setEditMode(true);
            setShowModal(true);
        }
    };

    const columns = useMemo<MRT_ColumnDef<Designation>[]>(
        () => [
            {
                accessorKey: "role",
                header: "Designation Name",
                Cell: ({ renderedCellValue }) => renderedCellValue
            },
            {
                accessorKey: "employeeCount",
                header: "Total Employees",
                Cell: ({ row }: any) => row.original._count.Employees
            },
            ...(isAdmin
                ? [{
                    accessorKey: "actions",
                    header: "Actions",
                    Cell: ({ row }: any) => {
                        const res = hasPermission(resourceNameMapWithCamelCase.designation, permissionConstToUseWithHasPermission.editOthers);
                        return res ? <button
                            className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                            onClick={() => handleEditClick(row.original.id)}
                        >
                            <KTIcon iconName='pencil' className='fs-3' />
                        </button> : "Not Allowed"
                    },
                }]
                : []),
        ],
        [data]
    );

    const handleClose = () => {
        setShowModal(false);
        setEditMode(false);
        setInitialValues(initialState);
        setDesignationId("");
    };

    const handleSubmit = async (values: any, actions: FormikValues) => {
        try {
            setLoading(true);
            if (editMode) {
                await updateDesignationById(designationId, values);
                setLoading(false);
                successConfirmation('Designation updated successfully');
                setShowModal(false);
                setEditMode(false);
                return;
            }
            const payload = [{ isActive: true, companyId: companyId, role: values.role }];
            await createDesignation(payload);
            setLoading(false);
            successConfirmation('Designation created successfully');
            setShowModal(false);
        } catch (err) {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="d-flex flex-wrap justify-content-center align-items-center mt-5">
                <div className="d-flex align-items-center justify-content-between w-100">
                    <h2>Designations</h2>
                    {isAdmin && hasPermission(resourceNameMapWithCamelCase.designation, permissionConstToUseWithHasPermission.create) && <div
                        className='card-toolbar text-end'
                        data-bs-toggle='tooltip'
                        data-bs-placement='top'
                        data-bs-trigger='hover'
                        title='Click to add a new designation'
                    >
                        <button onClick={() => setShowModal(true)} className='btn btn-md btn-light-primary'>
                            <KTIcon iconName='plus' className='fs-2' />
                            New Designation
                        </button>
                    </div>}
                </div>
            </div>
            <div className="">
            {hasPermission(resourceNameMapWithCamelCase.designation, permissionConstToUseWithHasPermission.readOthers) && (
                <MaterialTable columns={columns} data={data} tableName="Designations" employeeId={employeeId}/>
            )}
            </div>
            <Modal show={showModal} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{editMode ? 'Edit ' : 'Create a new'} designation</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={designationSchema}>
                        {(formikProps) => (
                            <Form className='des-flex flex-column' placeholder={''}>
                                <div className="row">
                                    <div className="col-lg-12">
                                        <TextInput
                                            isRequired={true}
                                            label="Designation Name"
                                            formikField="role"
                                        />
                                    </div>
                                </div>

                                <div className='des-flex justify-content-end pt-20'>
                                <button type='submit' className='btn btn-primary' disabled={loading || !formikProps.isValid}>
                                            {!loading && 'Save Changes'}
                                            {loading && (
                                                <span className='indicator-progress' style={{ display: 'block' }}>
                                                    Please wait...{' '}
                                                    <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                                </span>
                                            )}
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

export default Designations;
