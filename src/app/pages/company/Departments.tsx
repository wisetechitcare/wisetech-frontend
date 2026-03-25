import { useEffect, useMemo, useState } from "react";
import * as Yup from 'yup';
import { Form, Formik, FormikValues } from "formik";
import { Modal } from "react-bootstrap";
import { MRT_ColumnDef } from "material-react-table";
import { ICompanyDepartment } from "@models/company";
import { createNewDepartment, fetchAllDepartments, fetchCompanyOverview, fetchDepartmentById, updateDepartmentById } from "@services/company";
import { successConfirmation } from "@utils/modal";
import { KTIcon } from "@metronic/helpers";
import { PageLink, PageTitle } from "@metronic/layout/core";
import MaterialTable from "app/modules/common/components/MaterialTable";
import TextInput from "app/modules/common/inputs/TextInput";
import { PageHeadingTitle } from "@metronic/layout/components/header/page-title/PageHeadingTitle";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";

const departmentsBreadCrumb: Array<PageLink> = [
    {
        title: 'Company',
        path: '#',
        isSeparator: false,
        isActive: false,
    },
    {
        title: '',
        path: '',
        isSeparator: true,
        isActive: false,
    },
];

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

    const columns = useMemo<MRT_ColumnDef<ICompanyDepartment>[]>(() => [
        {
            accessorKey: "name",
            header: "Name",
            Cell: ({ renderedCellValue }: any) => <strong>{renderedCellValue}</strong>
        },
        {
            accessorKey: "code",
            header: "Code",
            Cell: ({ renderedCellValue }: any) => <strong>{renderedCellValue}</strong>
        },
        {
            accessorKey: "description",
            header: "Description",
            Cell: ({ renderedCellValue }: any) => <strong>{renderedCellValue}</strong>
        },
        {
            accessorKey: "employeeCount",
            header: "Total Employee",
            Cell: ({ row }: any) => <strong>{row.original._count.Employees}</strong>
        },
        ...(isAdmin
            ? [{
                accessorKey: "actions",
                header: "Actions",
                Cell: ({ row }: any) => {
                    const res = hasPermission(resourceNameMapWithCamelCase.department, permissionConstToUseWithHasPermission.editOthers)
                    // console.log("res:: ",res);

                    return (res ? <div>
                        <button
                            className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                            onClick={() => handleEditClick(row.original.id)}
                        >
                            <KTIcon iconName='pencil' className='fs-3' />
                        </button>
                    </div> : "Not Allowed")
                }
            }]
            : []
        )

    ], []);

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
            } else {
                const payload = [{ ...values, isActive: true }];
                await createNewDepartment(payload);
                successConfirmation('Department created successfully');
                await fetchData();
                setShow(false);
            }
    
        } catch (err) {
            console.error("Error during creating or updating:", err);
        } finally {
            setLoading(false);
        }
    };


    return (
        <>
            <div className="d-flex flex-wrap justify-content-center align-items-center mt-5">
                <div className="d-flex align-items-center justify-content-between w-100">
                    <h2>Departments</h2>

                    {isAdmin && hasPermission(resourceNameMapWithCamelCase.department, permissionConstToUseWithHasPermission.create) && <div
                        className='card-toolbar text-end'
                        data-bs-toggle='tooltip'
                        data-bs-placement='top'
                        data-bs-trigger='hover'
                        title='Click to add a user'
                    >
                        <button onClick={() => setShow(true)}
                            className='btn btn-md btn-light-primary'
                        >
                            <KTIcon iconName='plus' className='fs-2' />
                            New Department
                        </button>
                    </div>}
                </div>
            </div>

            <div className="">
                {hasPermission(resourceNameMapWithCamelCase.department, permissionConstToUseWithHasPermission.readOthers) &&
                <MaterialTable columns={columns} data={departments} tableName="Departments" employeeId={employeeId}/>
                }
            </div>
            <Modal show={show} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{editMode ? 'Edit' : 'Create a new'} department</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Formik initialValues={initialState} onSubmit={handleSubmit} validationSchema={departmentSchema}>
                        {(formikProps) => {
                            useEffect(() => {

                                async function fetchCompany() {
                                    const { data: { companyOverview } } = await fetchCompanyOverview();
                                    formikProps.setFieldValue("companyId", companyOverview[0].id, true);
                                }

                                fetchCompany();
                            }, []);

                            return (
                                <Form className='d-flex flex-column' noValidate id='employee_onboarding_form' placeholder={undefined}>
                                    <div className="row">
                                        <div className="col-lg-6">
                                            <TextInput
                                                isRequired={true}
                                                label="Department Name"
                                                margin="mb-7"
                                                formikField="name" />
                                        </div>

                                        <div className="col-lg-6">
                                            <TextInput
                                                isRequired={true}
                                                label="Department Code"
                                                margin="mb-7"
                                                formikField="code" />
                                        </div>
                                    </div>

                                    <div className="row">
                                        <div className="col-lg-6">
                                            <TextInput
                                                isRequired={false}
                                                label="Description"
                                                margin="mb-7"
                                                formikField="description" />
                                        </div>

                                        <div className="col-lg-6 mb-2">
                                            <label className="form label fw-600 mb-2 fs-6 ">Choose Color</label>
                                            <input
                                                type="color"
                                                name="color"
                                                className="form-control form-control-lg form-control-solid w-100"
                                                value={formikProps.values.color}
                                                onChange={(e) => formikProps.setFieldValue("color", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className='d-flex justify-content-end pt-20'>
                                        <button type='submit' className='btn btn-primary' disabled={loading || !formikProps.isValid}>
                                            {!loading && 'Save Changes'}
                                            {loading && (
                                                <span className='indicator-progress' style={{ display: 'block' }}>
                                                    Please wait...{' '}
                                                    <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
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

        </>

    );
}

export default Departments;